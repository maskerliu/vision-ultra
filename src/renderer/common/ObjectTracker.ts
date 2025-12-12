import * as tf from '@tensorflow/tfjs'
import { baseDomain } from '../../common'
import { drawObjectDetectResult } from './DrawUtils'

const MAX_OBJECTS_NUM: number = 20

export class ObjectTracker {

  private _enable: boolean = false
  set enable(val: boolean) {
    this._enable = val
    if (!val) this.dispose()
  }

  private modelName: string
  private model: tf.GraphModel
  private modelWidth: number
  private modelHeight: number
  private previewCtx: CanvasRenderingContext2D
  private _width: number
  private _height: number

  private boxes: Float32Array<ArrayBufferLike>
  private scores: Float16Array
  private classes: Uint8Array
  private objectNum: number = MAX_OBJECTS_NUM
  private xRatio: number = 1
  private yRatio: number = 1
  private scaleX: number = 1
  private scaleY: number = 1
  private nms: tf.Tensor
  private boxesTF: tf.Tensor
  private scoresTF: tf.Tensor
  private classesTF: tf.Tensor

  private _expire: number = 0
  get expire(): number {
    return this._expire
  }

  constructor(context: CanvasRenderingContext2D) {
    this.previewCtx = context
    this._width = context.canvas.width
    this._height = context.canvas.height
  }

  async init(yolo: string = 'yolov6n') {
    if (!this._enable) return

    this.modelName = yolo
    this.dispose()

    if (this.boxes == null) this.boxes = new Float32Array(MAX_OBJECTS_NUM * 4) // 100 boxes, 4 coordinates
    if (this.scores == null) this.scores = new Float16Array(MAX_OBJECTS_NUM) // 100 boxes, 1 score
    if (this.classes == null) this.classes = new Uint8Array(MAX_OBJECTS_NUM) // 100 boxes, 1 class

    await tf.ready()
    let modelPath = `static/${yolo}_web_model/model.json`
    try {
      this.model = await tf.loadGraphModel(`indexeddb://${modelPath}`)
    } catch (e) {
      console.log('failed to load model from indexeddb', e)
      this.model = await tf.loadGraphModel(`${__DEV__ ? '' : baseDomain()}/${modelPath}`, {
        requestInit: {
          cache: 'force-cache'
        }
      })

      await this.model.save(`indexeddb://${modelPath}`)
    }


    this.modelWidth = this.model.inputs[0].shape[1]
    this.modelHeight = this.model.inputs[0].shape[2]

    // const dummyInput = tf.ones(this.model.inputs[0].shape)
    // const warmupResults = this.model.execute(dummyInput)
    // tf.dispose([warmupResults, dummyInput])
  }

  async dispose() {
    this.model?.dispose()
    this.boxes = null
    this.scores = null
    this.classes = null
  }

  updateUI() {
    drawObjectDetectResult(this.previewCtx, this.boxes, this.scores, this.classes, this.objectNum, [this.scaleX, this.scaleY])
  }

  async detect(image: ImageData) {
    let time = Date.now()
    if (!this.model || !this._enable) return
    tf.engine().startScope()
    let input = this.preprocess(image)
    let res = this.model.execute(input)

    switch (this.modelName) {
      case 'yolov6n':
        await this.yolov6n(res as tf.Tensor)
        break
      case 'yolov8n':
      case 'yolo11n':
        await this.yoyoCommon(res as tf.Tensor)
        break
      case 'yolov10n':
        await this.yolov10n(res as tf.Tensor[])
        break
    }

    this.nms = await tf.image.nonMaxSuppressionAsync(this.boxesTF as any, this.scoresTF as any, 50, 0.45, 0.2)
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
      this.objectNum = Math.min(this.nms?.size, MAX_OBJECTS_NUM)
      this.boxes.set(this.boxesTF?.gather(this.nms, 0)?.dataSync().slice(0, this.objectNum * 4))
      this.scores.set(this.scoresTF?.gather(this.nms, 0)?.dataSync().slice(0, this.objectNum))
      this.classes.set(this.classesTF?.gather(this.nms, 0)?.dataSync().slice(0, this.objectNum))
      return
    })

    tf.dispose([res, this.boxesTF, this.scoresTF, this.classesTF, this.nms])
    tf.engine().endScope()

    this._expire = Date.now() - time
  }

  private async yolov6n(res: tf.Tensor) {
    let transRes = res.transpose([0, 2, 1])
    let x1 = transRes.slice([0, 0, 0], [-1, -1, 1]) // x1
    let y1 = transRes.slice([0, 0, 1], [-1, -1, 1]) // y1
    let x2 = transRes.slice([0, 0, 2], [-1, -1, 1]) // x2
    let y2 = transRes.slice([0, 0, 3], [-1, -1, 1]) // y2
    this.boxesTF = tf.concat([y1, x1, y2, x2,], 2).squeeze()

    let rawScores = transRes.slice([0, 0, 4], [-1, -1, 80]).squeeze()
    this.scoresTF = rawScores.max(1)
    this.classesTF = rawScores.argMax(1)

    tf.dispose([x1, y1, x2, y2, transRes, rawScores])
  }

  private async yolov10n(res: tf.Tensor[]) {
    let x1 = res[1].slice([0, 0, 0], [-1, -1, 1]) // x1
    let y1 = res[1].slice([0, 0, 1], [-1, -1, 1]) // y1
    let x2 = res[1].slice([0, 0, 2], [-1, -1, 1]) // x2
    let y2 = res[1].slice([0, 0, 3], [-1, -1, 1]) // y2
    this.classesTF = res[1].slice([0, 0, 5], [-1, -1, 1]).squeeze()
    this.boxesTF = tf.concat([y1, x1, y2, x2,], 2).squeeze()
    tf.dispose([x1, y1, x2, y2])
    this.scoresTF = res[0].squeeze()
  }

  private async yoyoCommon(res: tf.Tensor) {
    let transRes = res.transpose([0, 2, 1])
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
  }

  private preprocess(image: ImageData) {
    const maxSize = Math.max(image.width, image.height)
    if (this._width != this.previewCtx.canvas.width || this._height == this.previewCtx.canvas.height) {
      this._width = this.previewCtx.canvas.width
      this._height = this.previewCtx.canvas.height
      this.xRatio = maxSize / image.width // update xRatio
      this.yRatio = maxSize / image.height // update yRatio
      this.scaleX = this.xRatio * this.previewCtx.canvas.width / this.modelWidth
      this.scaleY = this.yRatio * this.previewCtx.canvas.height / this.modelHeight
    }


    const input = tf.tidy(() => {
      const img = tf.browser.fromPixels(image)
      const imgPadded = img.pad([
        [0, maxSize - image.height],
        [0, maxSize - image.width],
        [0, 0],
      ])
      return tf.image
        .resizeBilinear(imgPadded as any, [this.modelWidth, this.modelHeight])
        .div(255.0)
        .expandDims(0)
    })

    return input
  }
}

