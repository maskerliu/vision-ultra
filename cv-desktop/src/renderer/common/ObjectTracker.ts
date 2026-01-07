import * as tf from '@tensorflow/tfjs'
import { ModelInfo, TFModel } from './TFModel'

const MAX_OBJECTS_NUM: number = 20

export class ObjectTracker {
  private _model: TFModel = new TFModel()

  public objNum: number = 0
  get modelScale() {
    return this._model.scale
  }

  get segmentScale() {
    return this._model.scale
  }

  public boxes: Float16Array<ArrayBufferLike> = new Float16Array(MAX_OBJECTS_NUM * 4)
  public scores: Float16Array = new Float16Array(MAX_OBJECTS_NUM)
  public classes: Uint8Array = new Uint8Array(MAX_OBJECTS_NUM)
  public masks: Array<Uint8Array> = new Array<Uint8Array>(MAX_OBJECTS_NUM)

  private _expire: number = 0
  get expire(): number { return this._expire }

  async init(info: ModelInfo) {
    await this._model.init(info.name, info.type)
  }

  dispose() {
    this._model.dispose()
    this._model = null
  }

  async detect(image: ImageData) {
    if (this._model?.isInited === false) return
    let time = Date.now()
    tf.engine().startScope()
    let res = await this._model.run(image)

    let result: any
    switch (this._model.name) {
      case 'yolov8n':
      case 'yolov10n':
      case 'yolo11n':
      case 'yolo11s':
      case 'yolo11n-seg':
      case 'yolo11s-seg':
        result = await this.yoyoCommon(res)
        break
      case 'mobilenet':
        result = await this.mobilenetv2(res as tf.Tensor[], image.width, image.height)
        break
      case 'deeplab': {
        let wrapper = res as tf.Tensor
        let [height, width] = wrapper.shape.slice(1)
        let data = await wrapper.data()
        wrapper.dispose()
        this.objNum = 0
        tf.dispose([result])
        return { overlay: data, width, height, scale: this._model.scale }
      }
    }

    let nms = await tf.image.nonMaxSuppressionAsync(result[0] as any, result[1] as any, 50, 0.45, 0.35)
    this.objNum = Math.min(nms?.size, MAX_OBJECTS_NUM)
    if (nms.size > MAX_OBJECTS_NUM && !nms.isDisposed) {
      let tmp = nms.slice(0, MAX_OBJECTS_NUM)
      nms.dispose()
      nms = tmp
    }

    const overlay = tf.tidy(() => {
      const boxesTF = result[0].gather(nms, 0)
      const scoresTF = result[1].gather(nms, 0)
      const classesTF = result[2].gather(nms, 0)

      this.boxes.set(boxesTF?.dataSync().slice(0, this.objNum * 4))
      this.scores.set(scoresTF?.dataSync().slice(0, this.objNum))
      this.classes.set(classesTF?.dataSync().slice(0, this.objNum))

      let maskCoeffsTF: tf.Tensor
      if (this._model.name === 'yolo11n-seg' || this._model.name === 'yolo11s-seg') {
        maskCoeffsTF = result[3]?.gather(nms, 0)
        return this.generateMasks(maskCoeffsTF, res[1])
      }
    })

    tf.dispose([res, nms, ...result])

    switch (this._model.name) {
      case 'yolo11n-seg':
      case 'yolo11s-seg': {
        let wrapper = res as tf.Tensor[]
        let [height, width] = wrapper[1].shape.slice(1)
        await this.yolo11nSegment(overlay, this._model.inShape[0], width)
        tf.dispose([...wrapper])
        return { width, height, scale: this._model.scale }
      }
    }

    tf.engine().endScope()

    this._expire = Date.now() - time
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
  private async yoyoCommon(res: tf.Tensor | tf.Tensor[]) {
    return tf.tidy(() => {
      let boxes: tf.Tensor, scores: tf.Tensor, classes: tf.Tensor, maskCoeffs: tf.Tensor
      switch (this._model.name) {
        case 'yolov10n': {
          const x1 = res[1].slice([0, 0, 0], [-1, -1, 1])// x1
          const y1 = res[1].slice([0, 0, 1], [-1, -1, 1]) // y1
          const x2 = res[1].slice([0, 0, 2], [-1, -1, 1]) // x2
          const y2 = res[1].slice([0, 0, 3], [-1, -1, 1]) // y2
          boxes = tf.tidy(() => tf.concat([y1, x1, y2, x2,], 2).squeeze())
          scores = tf.tidy(() => res[1].slice([0, 0, 4], [-1, -1, 1]).squeeze())
          classes = tf.tidy(() => res[1].slice([0, 0, 5], [-1, -1, 1]).squeeze())
          break
        }
        case 'yolov8n':
        case 'yolo11n':
        case 'yolo11s': {
          const transRes = (res as tf.Tensor).transpose([0, 2, 1])
          const w = transRes.slice([0, 0, 2], [-1, -1, 1]) // get width
          const h = transRes.slice([0, 0, 3], [-1, -1, 1]) // get height
          const x1 = transRes.slice([0, 0, 0], [-1, -1, 1]).sub(w.div(2)) // x1
          const y1 = transRes.slice([0, 0, 1], [-1, -1, 1]).sub(h.div(2)) // y1
          boxes = tf.concat([y1, x1, y1.add(h), x1.add(w)], 2).squeeze()
          const classScores = transRes.slice([0, 0, 4], [-1, -1, 80]).squeeze()
          scores = classScores.max(1)
          classes = classScores.argMax(1)

          if (transRes.shape[2] == 116) {
            maskCoeffs = transRes.slice([0, 0, 4 + 80], [-1, -1, 32]).squeeze()
          }
          break
        }
        case 'yolo11n-seg':
        case 'yolo11s-seg': {
          const transRes = (res[0] as tf.Tensor).transpose([0, 2, 1])
          const w = transRes.slice([0, 0, 2], [-1, -1, 1]) // get width
          const h = transRes.slice([0, 0, 3], [-1, -1, 1]) // get height
          const x1 = transRes.slice([0, 0, 0], [-1, -1, 1]).sub(w.div(2)) // x1
          const y1 = transRes.slice([0, 0, 1], [-1, -1, 1]).sub(h.div(2)) // y1
          boxes = tf.concat([y1, x1, y1.add(h), x1.add(w)], 2).squeeze()
          const classScores = transRes.slice([0, 0, 4], [-1, -1, 80]).squeeze()
          scores = classScores.max(1)
          classes = classScores.argMax(1)

          if (transRes.shape[2] == 116) {
            maskCoeffs = transRes.slice([0, 0, 4 + 80], [-1, -1, 32]).squeeze()
          }
          break
        }
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

  private async yolo11nSegment(overlay: tf.Tensor, modelSize: number, segmentSize: number) {
    const scale = modelSize / segmentSize
    let offset = 0
    let i = 0
    while (i < this.objNum) {
      let i4 = i * 4
      const y1 = Math.round(this.boxes[i4] / scale)
      const x1 = Math.round(this.boxes[i4 + 1] / scale)
      const y2 = Math.round(this.boxes[i4 + 2] / scale)
      const x2 = Math.round(this.boxes[i4 + 3] / scale)
      const iou = overlay.slice([i, y1, x1], [1, y2 - y1, x2 - x1])
      const binary = tf.tidy(() => iou.greater(0.5).squeeze().cast('int32'))
      let data = binary.dataSync()
      this.masks[i] = data as Uint8Array
      offset += (y2 - y1) * (x2 - x1)
      tf.dispose([iou, binary])
      i++
    }

    tf.dispose([overlay])
  }

  private generateMasks(maskCoeffs: tf.Tensor, proto: tf.Tensor) {
    return tf.tidy(() => {
      const transSegMask = tf.tidy(() => proto.transpose([0, 3, 1, 2]).squeeze())
      const [_, height, width, channel] = proto.shape
      const reshaped = transSegMask.reshape([channel, height * width])
      return tf.matMul(maskCoeffs, reshaped).reshape([-1, height, width]).sigmoid()
    })
  }
}