import * as tf from '@tensorflow/tfjs'
import { TFModel } from './TFModel'

export const MAX_OBJECTS_NUM: number = 20

export class ObjectTracker {
  private _detectModel: TFModel = new TFModel()
  private _segmentModel: TFModel = new TFModel()

  public objNum: number = 0
  get scale() {
    return this._detectModel.scale
  }

  public boxes: Float16Array<ArrayBufferLike> = new Float16Array(MAX_OBJECTS_NUM * 4)
  public scores: Float16Array = new Float16Array(MAX_OBJECTS_NUM)
  public classes: Uint8Array = new Uint8Array(MAX_OBJECTS_NUM)
  public sgData: Float32Array

  private nms: tf.Tensor
  private boxesTF: tf.Tensor
  private scoresTF: tf.Tensor
  private classesTF: tf.Tensor

  private _expire: number = 0
  get expire(): number { return this._expire }

  async init(detectModel: string = 'yolov8n', segmentModel: string = null, fileset: any) {
    await this._detectModel.init(detectModel, fileset)
    await this._segmentModel.init(segmentModel, fileset)
  }

  disposeDetect() {
    this._detectModel?.dispose()
  }

  disposeSegment() {
    this._segmentModel?.dispose()
  }

  async detect(image: ImageData) {
    if (this._detectModel?.isInited === false) return
    let time = Date.now()
    tf.engine().startScope()
    let res = await this._detectModel.run(image)

    switch (this._detectModel.name) {
      case 'yolov8n':
      case 'yolo11n':
        await this.yoyoCommon(res as tf.Tensor)
        break
      case 'yolov10n':
        await this.yolov10n(res as tf.Tensor[])
        break
      case 'mobilenet':
        await this.mobilenetv2(res as tf.Tensor[], image.width, image.height)
        break
      case 'deeplab':
        await this.genSegment(res as tf.Tensor)
        break
      default:
        console.log('no match model find!!')
        return
    }

    this.nms = await tf.image.nonMaxSuppressionAsync(this.boxesTF as any, this.scoresTF as any, 50, 0.45, 0.35)
    if (this.nms.size > MAX_OBJECTS_NUM && !this.nms.isDisposed) {
      let tmp = this.nms.slice(0, MAX_OBJECTS_NUM)
      this.nms.dispose()
      this.nms = tmp
    }

    // if (!this.boxesTF?.isDisposed) this.boxesTF?.print()
    // if (!this.scoresTF?.isDisposed) {
    //   console.log('scores', this.scoresTF?.dataSync())
    // }
    // if (!this.classesTF?.isDisposed) {
    //   console.log('classes', this.classesTF?.dataSync())
    // }
    // if (!this.nms?.isDisposed) {
    //   console.log('nms', this.nms?.dataSync())
    // }

    tf.tidy(() => {
      if (this.boxesTF?.isDisposed || this.nms?.isDisposed || this.scoresTF?.isDisposed || this.classesTF?.isDisposed || this.nms?.size == 0) return
      this.objNum = Math.min(this.nms?.size, MAX_OBJECTS_NUM)
      this.boxes.set(this.boxesTF?.gather(this.nms, 0)?.dataSync().slice(0, this.objNum * 4))
      this.scores.set(this.scoresTF?.gather(this.nms, 0)?.dataSync().slice(0, this.objNum))
      this.classes.set(this.classesTF?.gather(this.nms, 0)?.dataSync().slice(0, this.objNum))
      return
    })

    tf.dispose([res, this.boxesTF, this.scoresTF, this.classesTF, this.nms])
    tf.engine().endScope()

    this._expire = Date.now() - time
  }

  async segment(image: ImageData) {
    if (this._segmentModel?.isInited === false) return
    let res = await this._segmentModel.run(image)
    console.log(res)
  }

  private async yolov10n(res: tf.Tensor[]) {
    res[0].print()
    res[1].print()
    let x1 = res[1].slice([0, 0, 0], [-1, -1, 1]) // x1
    let y1 = res[1].slice([0, 0, 1], [-1, -1, 1]) // y1
    let x2 = res[1].slice([0, 0, 2], [-1, -1, 1]) // x2
    let y2 = res[1].slice([0, 0, 3], [-1, -1, 1]) // y2
    this.scoresTF = res[1].slice([0, 0, 4], [-1, -1, 1]).squeeze()
    this.classesTF = res[1].slice([0, 0, 5], [-1, -1, 1]).squeeze()
    this.boxesTF = tf.concat([y1, x1, y2, x2,], 2).squeeze()
    tf.dispose([x1, y1, x2, y2])

  }

  private async yoyoCommon(res: tf.Tensor) {
    const transRes = res.transpose([0, 2, 1])
    this.boxesTF = tf.tidy(() => {
      const w = transRes.slice([0, 0, 2], [-1, -1, 1]) // get width
      const h = transRes.slice([0, 0, 3], [-1, -1, 1]) // get height
      const x1 = tf.sub(transRes.slice([0, 0, 0], [-1, -1, 1]), tf.div(w, 2)) // x1
      const y1 = tf.sub(transRes.slice([0, 0, 1], [-1, -1, 1]), tf.div(h, 2)) // y1
      return tf
        .concat([y1, x1, tf.add(y1, h), tf.add(x1, w),], 2)
        .squeeze()
    })

    const rawScores = transRes.slice([0, 0, 4], [-1, -1, 80]).squeeze()
    this.scoresTF = rawScores.max(1)
    this.classesTF = rawScores.argMax(1)
    rawScores.dispose()
    transRes.dispose()
  }

  private async mobilenetv2(res: tf.Tensor[], width: number, height: number) {
    // res[0].print()
    // res[1].print()
    this.scoresTF = res[0].max(2).squeeze()
    this.classesTF = res[0].argMax(2).add(1).squeeze()
    let transRes = res[1].squeeze()
    let y1 = res[1].slice([0, 0, 0, 0], [-1, -1, -1, 1]).mul(height) // y1
    let x1 = res[1].slice([0, 0, 0, 1], [-1, -1, -1, 1]).mul(width) // x1
    let y2 = res[1].slice([0, 0, 0, 2], [-1, -1, -1, 1]).mul(height) // y2
    let x2 = res[1].slice([0, 0, 0, 3], [-1, -1, -1, 1]).mul(width) // x2
    this.boxesTF = tf.concat([y1, x1, y2, x2,], 2).squeeze()
    tf.dispose([transRes, x1, y1, x2, y2])
  }

  private async genSegment(res: tf.Tensor) {
    const [height, width] = res.shape
    const sgImgBuf = tf.buffer([height, width, 3], 'int32')
    const mapData = await res.array()
    for (let col = 0; col < height; ++col) {
      for (let row = 0; row < width; ++row) {
        const label = mapData[col][row]
        // labels.add(label)
        // sgImgBuf.set(colormap[label][0], col, row, 0)
        // sgImgBuf.set(colormap[label][1], col, row, 1)
        // sgImgBuf.set(colormap[label][2], col, row, 2)
      }
    }

    const sgImgTensor = sgImgBuf.toTensor() as tf.Tensor3D
    const sgMap = await tf.browser.toPixels(sgImgTensor)
    tf.dispose(sgImgTensor)

    return sgMap
  }

}