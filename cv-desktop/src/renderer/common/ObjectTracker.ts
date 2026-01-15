import * as tf from '@tensorflow/tfjs'
import { TFModel } from './TFModel'
import { ModelInfo, ModelType } from './misc'

const MAX_OBJECTS_NUM: number = 20
const ModelClassSize = {
  'mobilenet': 90,
  'yolo': 80,
  'deeplab': 151
}

const YoloCommon = ['yolov8n', 'yolo11n', 'yolo11s', 'yolo11m']
const YoloSeg = ['yolo11m-seg', 'yolo11s-seg', 'yolo11n-seg']

export class ObjectTracker {
  private _model: TFModel = new TFModel()

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
    return this._model.type == ModelType.Segment && this._model.name.indexOf('deeplab') == -1 ? this._masks : null
  }

  private _expire: number = 0
  get expire(): number { return this._expire }

  get isInited() { return this._model.isInited }

  async init(info: ModelInfo) {
    await this._model.init(info.name, info.type)
    this._classNum = ModelClassSize[this._model.name]
  }

  dispose() {
    this._model.dispose()
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
      if (YoloSeg.indexOf(this._model.name) != -1) {
        maskCoeffsTF = result[3]?.gather(nms, 0)
        return this.generateMasks(maskCoeffsTF, res[1])
      }
    })

    tf.dispose([res, ...result])
    this._expire = Date.now() - time

    if (YoloSeg.indexOf(this._model.name) != -1) {
      let wrapper = res as tf.Tensor[]
      let [height, width] = wrapper[1].shape.slice(1)
      this._segSize[0] = width
      this._segSize[1] = height
      this._segScale[0] = this._model.modelWidth / width
      this._segScale[1] = this._model.modelHeight / height
      await this.yolo11nSegment(overlay)
      tf.dispose([...wrapper])
    }
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
      if (this._model.name.indexOf('yolov10') != -1) {
        console.log(res)
        const x1 = res[1].slice([0, 0, 0], [-1, -1, 1])
        const y1 = res[1].slice([0, 0, 1], [-1, -1, 1])
        const x2 = res[1].slice([0, 0, 2], [-1, -1, 1])
        const y2 = res[1].slice([0, 0, 3], [-1, -1, 1])
        boxes = tf.tidy(() => tf.concat([y1, x1, y2, x2,], 2).squeeze())
        scores = tf.tidy(() => res[1].slice([0, 0, 4], [-1, -1, 1]).squeeze())
        classes = tf.tidy(() => res[1].slice([0, 0, 5], [-1, -1, 1]).squeeze())
        return [boxes, scores, classes, maskCoeffs]
      }

      let transRes: tf.Tensor
      if (YoloCommon.indexOf(this._model.name) != -1) {
        transRes = (res as tf.Tensor).transpose([0, 2, 1])
      } else if (YoloSeg.indexOf(this._model.name) != -1) {
        transRes = (res[0] as tf.Tensor).transpose([0, 2, 1])
      }

      if (transRes == null) return null

      const w = transRes.slice([0, 0, 2], [-1, -1, 1])
      const h = transRes.slice([0, 0, 3], [-1, -1, 1])
      const x1 = transRes.slice([0, 0, 0], [-1, -1, 1]).sub(w.div(2))
      const y1 = transRes.slice([0, 0, 1], [-1, -1, 1]).sub(h.div(2))
      boxes = tf.concat([y1, x1, y1.add(h), x1.add(w)], 2).squeeze()
      const classScores = transRes.slice([0, 0, 4], [-1, -1, 80]).squeeze()
      scores = classScores.max(1)
      classes = classScores.argMax(1)

      if (transRes.shape[2] == 116) {
        maskCoeffs = transRes.slice([0, 0, 4 + 80], [-1, -1, 32]).squeeze()
      }

      return [boxes, scores, classes, maskCoeffs]
    })
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

  private async yolo11nSegment(overlay: tf.Tensor) {
    let offset = 0
    let i = 0
    while (i < this.objNum) {
      let i4 = i * 4
      const y1 = Math.round(this.boxes[i4] / this._segScale[1])
      const x1 = Math.round(this.boxes[i4 + 1] / this._segScale[0])
      const y2 = Math.round(this.boxes[i4 + 2] / this._segScale[1])
      const x2 = Math.round(this.boxes[i4 + 3] / this._segScale[0])
      const iou = overlay.slice([i, y1, x1], [1, y2 - y1, x2 - x1])
      const binary = tf.tidy(() => iou.greater(0.5).squeeze().cast('int32'))
      let data = await binary.data()
      this._masks[i] = data as Uint8Array
      offset += (y2 - y1) * (x2 - x1)
      tf.dispose([iou, binary])
      i++
    }

    tf.dispose([overlay])
  }

  private generateMasks(maskCoeffs: tf.Tensor, proto: tf.Tensor) {
    return tf.tidy(() => {
      const transSegMask = proto.transpose([0, 3, 1, 2]).squeeze()
      const [_, height, width, channel] = proto.shape
      const reshaped = transSegMask.reshape([channel, height * width])
      return tf.matMul(maskCoeffs, reshaped).reshape([-1, height, width]).sigmoid()
    })
  }
}