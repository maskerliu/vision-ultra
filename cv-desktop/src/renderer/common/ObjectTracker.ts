import * as tf from '@tensorflow/tfjs'
import { ModelType, TFModel } from './TFModel'

export const MAX_OBJECTS_NUM: number = 20

export class ObjectTracker {
  private _detectModel: TFModel = new TFModel()
  private _segmentModel: TFModel = new TFModel()

  public objNum: number = 0
  get modelScale() {
    return this._detectModel.scale
  }

  get segmentScale() {
    return this._segmentModel.scale
  }

  public boxes: Float16Array<ArrayBufferLike> = new Float16Array(MAX_OBJECTS_NUM * 4)
  public scores: Float16Array = new Float16Array(MAX_OBJECTS_NUM)
  public classes: Uint8Array = new Uint8Array(MAX_OBJECTS_NUM)
  public masks: Uint8Array = new Uint8Array(MAX_OBJECTS_NUM * 160 * 160)

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
      case 'yolov10n':
        result = await this.yoyoCommon(res as tf.Tensor)
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

    tf.tidy(() => {
      const boxesTF = result[0].gather(nms, 0)
      const scoresTF = result[1].gather(nms, 0)
      const classesTF = result[2].gather(nms, 0)

      this.boxes.set(boxesTF?.dataSync().slice(0, this.objNum * 4))
      this.scores.set(scoresTF?.dataSync().slice(0, this.objNum))
      this.classes.set(classesTF?.dataSync().slice(0, this.objNum))
    })


    tf.dispose([res, nms, ...result])
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
        this.objNum = 0
        tf.dispose([result])
        return { overlay: data, width, height, scale: this._segmentModel.scale }
      }
      case 'yolo11n-seg': {
        let wrapper = result as tf.Tensor[]
        let [height, width] = wrapper[1].shape.slice(1)
        await this.yolo11nSegment(wrapper)
        tf.dispose([...wrapper])
        return { width, height, scale: this._segmentModel.scale }
      }
      default:
        console.log('no match model find!!')
        return
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

      if (this._detectModel.name == 'yolov10n') {
        const x1 = res[1].slice([0, 0, 0], [-1, -1, 1])// x1
        const y1 = res[1].slice([0, 0, 1], [-1, -1, 1]) // y1
        const x2 = res[1].slice([0, 0, 2], [-1, -1, 1]) // x2
        const y2 = res[1].slice([0, 0, 3], [-1, -1, 1]) // y2
        boxes = tf.tidy(() => tf.concat([y1, x1, y2, x2,], 2).squeeze())
        scores = tf.tidy(() => res[1].slice([0, 0, 4], [-1, -1, 1]).squeeze())
        classes = tf.tidy(() => res[1].slice([0, 0, 5], [-1, -1, 1]).squeeze())
      } else {
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
          // console.log(res)
          // res.print()
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

  private async yolo11nSegment(res: tf.Tensor[]) {
    const result = await this.yoyoCommon(res[0])
    const [modelW, modelH] = this._segmentModel.inShape
    const [segHeight, segWidth, segChannel] = res[1].shape.slice(1)
    let nms = await tf.image.nonMaxSuppressionAsync(result[0] as any, result[1] as any, 50, 0.45, 0.35)
    this.objNum = Math.min(nms.size, MAX_OBJECTS_NUM)

    if (nms.size > this.objNum) {
      let tmp = nms.slice(0, this.objNum)
      nms.dispose()
      nms = tmp
    }

    const masks = tf.tidy(() => {
      const boxesTF = result[0].gather(nms, 0)
      const scoresTF = result[1].gather(nms, 0)
      const classesTF = result[2].gather(nms, 0)
      const maskCoeffsTF = result[3]?.gather(nms, 0)

      this.boxes.set(boxesTF?.dataSync().slice(0, this.objNum * 4))
      this.scores.set(scoresTF?.dataSync().slice(0, this.objNum))
      this.classes.set(classesTF?.dataSync().slice(0, this.objNum))

      return this.generateMasks(maskCoeffsTF, res[1])
    })

    const scale = modelW / segWidth
    let offset = 0
    for (let i = 0; i < this.objNum; ++i) {
      let i4 = i * 4
      const y1 = Math.round(this.boxes[i4] / scale)
      const x1 = Math.round(this.boxes[i4 + 1] / scale)
      const y2 = Math.round(this.boxes[i4 + 2] / scale)
      const x2 = Math.round(this.boxes[i4 + 3] / scale)
      const iou = masks.slice([0, y1, x1], [-1, y2 - y1, x2 - x1])
      const binary = tf.tidy(() => iou.greater(0.5).cast('int32'))
      this.masks.set(binary.dataSync(), offset)
      offset += (y2 - y1) * (x2 - x1)
      tf.dispose([iou, binary])
    }

    tf.dispose([nms, masks, ...result])
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