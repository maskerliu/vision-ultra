import * as tf from '@tensorflow/tfjs'
import { ModelType, TFModel } from './TFModel'

export const MAX_OBJECTS_NUM: number = 20

export class ObjectTracker {
  private _detectModel: TFModel = new TFModel()
  private _segmentModel: TFModel = new TFModel()
  private maskThreshold = 0.5

  public objNum: number = 0
  get scale() {
    return this._detectModel.scale
  }

  public boxes: Float16Array<ArrayBufferLike> = new Float16Array(MAX_OBJECTS_NUM * 4)
  public scores: Float16Array = new Float16Array(MAX_OBJECTS_NUM)
  public classes: Uint8Array = new Uint8Array(MAX_OBJECTS_NUM)
  public overlay: Uint8Array
  public masks: Uint8Array = new Uint8Array(MAX_OBJECTS_NUM * 160 * 160)

  private maskCoeffsTF: tf.Tensor

  private _expire: number = 0
  get expire(): number { return this._expire }

  async init(detectModel: string = 'yolov8n', segmentModel: string = null) {
    await this._detectModel.init(detectModel, ModelType.Detect)
    await this._segmentModel.init(segmentModel, ModelType.Segment)
  }

  dispose(types: ModelType[]) {
    if (types.includes(ModelType.Segment))
      this._segmentModel?.dispose()

    if (types.includes(ModelType.Detect))
      this._detectModel?.dispose()
  }

  async detect(image: ImageData) {
    if (this._detectModel?.isInited === false) return
    let time = Date.now()
    tf.engine().startScope()
    let res = await this._detectModel.run(image)

    let result: any
    switch (this._detectModel.name) {
      case 'yolov8n':
      case 'yolo11n':
        result = await this.yoyoCommon(res as tf.Tensor)
        break
      case 'yolov10n':
        result = await this.yolov10n(res as tf.Tensor[])
        break
      case 'mobilenet':
        result = await this.mobilenetv2(res as tf.Tensor[], image.width, image.height)
        break
      default:
        console.log('no match model find!!')
        return
    }

    let nms = await tf.image.nonMaxSuppressionAsync(result[0] as any, result[1] as any, 50, 0.45, 0.35)
    this.objNum = Math.min(nms?.size, MAX_OBJECTS_NUM)
    if (nms.size > MAX_OBJECTS_NUM && !nms.isDisposed) {
      let tmp = nms.slice(0, MAX_OBJECTS_NUM)
      nms.dispose()
      nms = tmp
    }

    const boxesTF = result[0].gather(nms, 0)
    const scoresTF = result[1].gather(nms, 0)
    const classesTF = result[2].gather(nms, 0)
    const maskCoeffsTF = result[3]?.gather(nms, 0)

    this.boxes.set(boxesTF?.dataSync().slice(0, this.objNum * 4))
    this.scores.set(scoresTF?.dataSync().slice(0, this.objNum))
    this.classes.set(classesTF?.dataSync().slice(0, this.objNum))

    tf.dispose([res, nms, boxesTF, scoresTF, classesTF, maskCoeffsTF, ...result])
    tf.engine().endScope()

    this._expire = Date.now() - time
  }

  async segment(image: ImageData) {
    if (this._segmentModel?.isInited === false) return
    let result = await this._segmentModel.run(image)
    switch (this._segmentModel.name) {
      case 'deeplab': {
        let wrapper = result as tf.Tensor
        let [height, width] = wrapper.shape.slice(1)
        let data = await wrapper.data()
        wrapper.dispose()
        this.overlay = data as any
        return { overlay: data, width, height, scale: this._segmentModel.scale }
      }
      case 'yolo11n-seg': {
        let data = await this.yolo11nSegment(result as tf.Tensor[])
        return { scale: this._segmentModel.scale }
      }
      default:
        console.log('no match model find!!')
        return
    }
  }

  private async yolov10n(res: tf.Tensor[]) {
    return tf.tidy(() => {
      let x1 = res[1].slice([0, 0, 0], [-1, -1, 1])// x1
      let y1 = res[1].slice([0, 0, 1], [-1, -1, 1]) // y1
      let x2 = res[1].slice([0, 0, 2], [-1, -1, 1]) // x2
      let y2 = res[1].slice([0, 0, 3], [-1, -1, 1]) // y2
      const scores = tf.tidy(() => res[1].slice([0, 0, 4], [-1, -1, 1]).squeeze())
      const classes = tf.tidy(() => res[1].slice([0, 0, 5], [-1, -1, 1]).squeeze())
      const boxes = tf.tidy(() => tf.concat([y1, x1, y2, x2,], 2).squeeze())

      let maskCoeffs: any
      if (res[1].shape[2] == 116) {
        maskCoeffs = res[1].slice([0, 0, 4 + 80], [-1, -1, 32])
      }
      return [boxes, scores, classes, maskCoeffs]
    })
  }

  /**
   * 输入图像 → YOLOv8-seg模型
            ↓
    ┌───────────────┐
    │   检测头       │ → 输出: [1, 116, 8400]
    │               │       包含边界框、置信度、maskCoeffs
    ├───────────────┤
    │   分割头       │ → 输出: [1, 32, 160, 160]
    │               │       固定的protoTensor
    └───────────────┘
            ↓
    实例1掩膜 = sigmoid(maskCoeffs₁ × protoTensor)
   * @param res 
   * 
   * @returns 
   */
  private async yoyoCommon(res: tf.Tensor) {

    return tf.tidy(() => {
      const transRes = res.transpose([0, 2, 1])

      const w = transRes.slice([0, 0, 2], [-1, -1, 1]) // get width
      const h = transRes.slice([0, 0, 3], [-1, -1, 1]) // get height
      const x1 = transRes.slice([0, 0, 0], [-1, -1, 1]).sub(w.div(2)) // x1
      const y1 = transRes.slice([0, 0, 1], [-1, -1, 1]).sub(h.div(2)) // y1
      const boxes = tf.concat([y1, x1, y1.add(h), x1.add(w)], 2).squeeze()
      const classScores = transRes.slice([0, 0, 4], [-1, -1, 80]).squeeze()
      const scores = classScores.max(1)
      const classes = classScores.argMax(1)

      let maskCoeffs: any
      if (transRes.shape[2] == 116) {
        maskCoeffs = transRes.slice([0, 0, 4 + 80], [-1, -1, 32]).squeeze()
        // console.log(res)
        // res.print()
      }

      return [boxes, scores, classes, maskCoeffs]
    })
  }

  private async mobilenetv2(res: tf.Tensor[], width: number, height: number) {
    return tf.tidy(() => {
      const scores = res[0].max(2).squeeze()
      const classes = res[0].argMax(2).add(1).squeeze()
      let y1 = res[1].slice([0, 0, 0, 0], [-1, -1, -1, 1]).mul(height) // y1
      let x1 = res[1].slice([0, 0, 0, 1], [-1, -1, -1, 1]).mul(width) // x1
      let y2 = res[1].slice([0, 0, 0, 2], [-1, -1, -1, 1]).mul(height) // y2
      let x2 = res[1].slice([0, 0, 0, 3], [-1, -1, -1, 1]).mul(width) // x2
      const boxes = tf.concat([y1, x1, y2, x2,], 2).squeeze()
      let maskCoeffs: any
      if (res[1].shape[1] == 116) {
        maskCoeffs = res[1].slice([0, 0, 4 + 80], [-1, -1, 32])
      }
      return [boxes, scores, classes, maskCoeffs]
    })
  }

  private async yolo11nSegment(res: tf.Tensor[]) {
    const result = await this.yoyoCommon(res[0])

    let nms = await tf.image.nonMaxSuppressionAsync(result[0] as any, result[1] as any, 50, 0.45, 0.35)
    this.objNum = Math.min(nms.size, MAX_OBJECTS_NUM)

    if (nms.size > this.objNum) {
      let tmp = nms.slice(0, this.objNum)
      nms.dispose()
      nms = tmp
    }

    const boxesTF = result[0].gather(nms, 0)
    const scoresTF = result[1].gather(nms, 0)
    const classesTF = result[2].gather(nms, 0)
    const maskCoeffsTF = result[3]?.gather(nms, 0)

    console.log(scoresTF)
    scoresTF.print()

    this.boxes.set(boxesTF?.dataSync().slice(0, this.objNum * 4))
    this.scores.set(scoresTF?.dataSync().slice(0, this.objNum))
    this.classes.set(classesTF?.dataSync().slice(0, this.objNum))

    const masks = this.generateMasks(maskCoeffsTF, res[1])
    let binaryMasks = masks.greater(0.25).cast('int32')
    console.log(binaryMasks)
    binaryMasks.print()

    this.masks.set(binaryMasks.dataSync().slice(0, this.objNum * 160 * 160))
    console.log(this.masks)
    binaryMasks.print()
    tf.dispose([res, nms, boxesTF, scoresTF, classesTF, maskCoeffsTF, masks, ...result])
  }

  private generateMasks(maskCoeffs: tf.Tensor, proto: tf.Tensor) {
    return tf.tidy(() => {
      const [_, height, width, channel] = proto.shape
      const reshaped = proto.squeeze().reshape([channel, height * width])
      return tf.matMul(maskCoeffs, reshaped).reshape([-1, height, width]).sigmoid()
    })
  }
}