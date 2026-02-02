import * as tf from '@tensorflow/tfjs'
import { ModelInfo, ModelType } from '../../../shared'
import { Model, ModelRunner } from './Model'

const MAX_OBJECTS_NUM: number = 20
const ModelClassSize = {
  'mobilenet': 90,
  'yolo': 80,
  'deeplab': 151
}

export class ObjectTracker extends ModelRunner {
  private _model: Model = new Model()

  public objNum: number = 0
  private _classNum: number = 0
  get classNum() { return this._classNum }

  get scale() { return this._model.scale }

  private _segScale = [1, 1]
  get segScale() { return this._segScale }

  private _segSize = [-1, -1]
  get segSize() { return this._segSize }

  public boxes: Float16Array<ArrayBufferLike> = new Float16Array(MAX_OBJECTS_NUM * 4)
  public scores: Float16Array = new Float16Array(MAX_OBJECTS_NUM)
  public classes: Uint8Array = new Uint8Array(MAX_OBJECTS_NUM)
  private _masks: Array<Uint8Array> = new Array<Uint8Array>(MAX_OBJECTS_NUM)
  get masks() {
    return this._model.type == ModelType.segment && this._model.name.indexOf('deeplab') == -1 ? this._masks : null
  }

  get isInited() { return this._model.isInited }

  async init(info: ModelInfo) {
    await this._model.init(info)
    this._classNum = ModelClassSize[this._model.name]
  }

  async dispose() {
    await this._model.dispose()
    this.objNum = 0
    this._model = null
  }

  async detect(image: ImageData) {
    if (this._model?.isInited === false) return
    let time = Date.now()
    let res = await this._model.run(image)

    let result: any
    if (this._model.name.indexOf('deeplab') != -1) {
      let wrapper = res as tf.Tensor
      let data = await wrapper.data()
      wrapper.dispose()
      this.objNum = 0
      tf.dispose([result])
      return { overlay: data }
    } else if (this._model.name.indexOf('yolo') != -1) {
      result = await this.yoyoCommon(res)
    } else if (this._model.name == 'mobilenet') {
      result = await this.mobilenetv2(res as tf.Tensor[], image.width, image.height)
    }

    let nms = await tf.image.nonMaxSuppressionAsync(result[0] as any, result[1] as any, MAX_OBJECTS_NUM, 0.45, 0.1)
    this.objNum = Math.min(nms?.size, MAX_OBJECTS_NUM)

    const overlay = tf.tidy(() => {
      const boxesTF = result[0].gather(nms, 0)
      const scoresTF = result[1].gather(nms, 0)
      const classesTF = result[2].gather(nms, 0)

      this.boxes.set(boxesTF?.dataSync().slice(0, this.objNum * 4))
      this.scores.set(scoresTF?.dataSync().slice(0, this.objNum))
      this.classes.set(classesTF?.dataSync().slice(0, this.objNum))

      if (result[3]) {
        console.log(res[1])

        const maskCoeffsTF = result[3].gather(nms, 0)
        return this.generateMasks(maskCoeffsTF, res[1])
      }
    })

    this._expire = Date.now() - time

    if (overlay != null) {
      let [height, width] = res[1].shape.slice(1)
      this._segSize[0] = width
      this._segSize[1] = height
      this._segScale[0] = this._model.inShape[1] / width
      this._segScale[1] = this._model.inShape[0] / height
      await this.yoloSegment(overlay)
    }

    tf.dispose([res, ...result, overlay])
  }

  private async mobilenetv2(res: tf.Tensor[], width: number, height: number) {
    return tf.tidy(() => {
      const scores = res[0].max(2).squeeze()
      const classes = res[0].argMax(2).add(1).squeeze()
      let y1 = res[1].slice([0, 0, 0, 0], [-1, -1, -1, 1]).mul(height)
      let x1 = res[1].slice([0, 0, 0, 1], [-1, -1, -1, 1]).mul(width)
      let y2 = res[1].slice([0, 0, 0, 2], [-1, -1, -1, 1]).mul(height)
      let x2 = res[1].slice([0, 0, 0, 3], [-1, -1, -1, 1]).mul(width)
      const boxes = tf.concat([y1, x1, y2, x2,], 2).squeeze()
      let maskCoeffs: any
      if (res[1].shape[1] == 116) {
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
  private async yoyoCommon(res: tf.Tensor | tf.Tensor[]) {
    return tf.tidy(() => {
      let boxes: tf.Tensor, scores: tf.Tensor, classes: tf.Tensor, maskCoeffs: tf.Tensor, data: tf.Tensor

      if (!Array.isArray(res)) {
        data = res as tf.Tensor
      } else {
        for (let i = 0; i < res.length; ++i) {
          if (res[i].shape.length == 3) {
            data = res[i]
          }
        }
      }

      if (data == null) return null

      if (data.shape[1] < data.shape[2]) {
        data = data.transpose([0, 2, 1])
      }

      console.log(data)
      data.print()

      if (data.shape[2] >= 84) { // yolo common with segment
        const w = data.slice([0, 0, 2], [-1, -1, 1])
        const h = data.slice([0, 0, 3], [-1, -1, 1])
        const x1 = data.slice([0, 0, 0], [-1, -1, 1]).sub(w.div(2))
        const y1 = data.slice([0, 0, 1], [-1, -1, 1]).sub(h.div(2))
        boxes = tf.concat([y1, x1, y1.add(h), x1.add(w)], 2).squeeze()
        const classScores = data.slice([0, 0, 4], [-1, -1, 80]).squeeze()
        scores = classScores.max(1)
        classes = classScores.argMax(1)
        if (data.shape[2] == 116) maskCoeffs = data.slice([0, 0, 4 + 80], [-1, -1, 32]).squeeze()
      } else if (data.shape[2] <= 38) {
        const x1 = data.slice([0, 0, 0], [-1, -1, 1])
        const y1 = data.slice([0, 0, 1], [-1, -1, 1])
        const x2 = data.slice([0, 0, 2], [-1, -1, 1])
        const y2 = data.slice([0, 0, 3], [-1, -1, 1])
        boxes = tf.concat([y1, x1, y2, x2], 2).squeeze()
        scores = data.slice([0, 0, 4], [-1, -1, 1]).squeeze()
        classes = data.slice([0, 0, 5], [-1, -1, 1]).squeeze()
        if (data.shape[2] == 38) maskCoeffs = data.slice([0, 0, 6], [-1, -1, 32]).squeeze()
      }

      return [boxes, scores, classes, maskCoeffs]
    })
  }

  private async yoloSegment(overlay: tf.Tensor) {
    if (overlay == null) return
    let offset = 0
    let i = 0, x1 = 0, y1 = 0, x2 = 0, y2 = 0
    while (i < this.objNum) {
      try {
        let i4 = i * 4
        y1 = Math.ceil(this.boxes[i4] / this._segScale[1])
        x1 = Math.ceil(this.boxes[i4 + 1] / this._segScale[0])
        y2 = Math.ceil(this.boxes[i4 + 2] / this._segScale[1])
        x2 = Math.ceil(this.boxes[i4 + 3] / this._segScale[0])
        x1 = x1 < 0 ? 0 : x1
        y1 = y1 < 0 ? 0 : y1
        x2 = x2 > this._segSize[1] ? this._segSize[1] : x2
        y2 = y2 > this._segSize[0] ? this._segSize[0] : y2

        const iou = overlay.slice([i, y1, x1], [1, y2 - y1, x2 - x1])
        const binary = tf.tidy(() => iou.greater(0.5).squeeze().cast('int32'))
        let data = await binary.data()
        this._masks[i] = data as Uint8Array
        offset += (y2 - y1) * (x2 - x1)
        tf.dispose([iou, binary])
      } catch (err) {
        console.error(i, y1, x1, y2, x2, err)
      }
      i++
    }
    // console.log(this._masks)
  }

  private generateMasks(maskCoeffs: tf.Tensor, proto: tf.Tensor) {
    if (proto.shape.length != 4) return null
    return tf.tidy(() => {
      const transSegMask = proto.transpose([0, 3, 1, 2]).squeeze()
      const [_, height, width, channel] = proto.shape
      const reshaped = transSegMask.reshape([channel, height * width])
      return tf.matMul(maskCoeffs, reshaped).reshape([-1, height, width]).sigmoid()
    })
  }
}