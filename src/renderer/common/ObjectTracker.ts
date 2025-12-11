import * as tf from '@tensorflow/tfjs'
import { baseDomain } from '../../common'
import { drawObjectDetectResult } from './DrawUtils'
import { Float } from 'apache-arrow'
import { Console } from 'node:console'

const MAX_OBJECTS_NUM: number = 20

export class ObjectTracker {

  private _enable: boolean = false
  set enable(val: boolean) {
    this._enable = val
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
  private objectNum: number = 0
  private xRatio: number = 1
  private yRatio: number = 1
  private scaleX: number = 1
  private scaleY: number = 1
  private nms: tf.Tensor
  private boxesTF: tf.Tensor
  private scoresTF: tf.Tensor
  private classesTF: tf.Tensor

  constructor(context: CanvasRenderingContext2D) {
    this.previewCtx = context
    this._width = context.canvas.width
    this._height = context.canvas.height
  }

  async init(yolo: string = 'yolov6n') {
    if (!this._enable) return

    this.modelName = yolo
    this.model?.dispose()

    this.boxes = new Float32Array(MAX_OBJECTS_NUM * 4) // 100 boxes, 4 coordinates
    this.scores = new Float16Array(MAX_OBJECTS_NUM) // 100 boxes, 1 score
    this.classes = new Uint8Array(MAX_OBJECTS_NUM) // 100 boxes, 1 class

    await tf.ready()
    this.model = await tf.loadGraphModel(`${__DEV__ ? '' : baseDomain()}/static/${yolo}_web_model/model.json`)

    const dummyInput = tf.ones(this.model.inputs[0].shape)
    const warmupResults = this.model.execute(dummyInput)
    this.modelWidth = this.model.inputs[0].shape[1]
    this.modelHeight = this.model.inputs[0].shape[2]

    tf.dispose([warmupResults, dummyInput])
  }

  async dispose() {
    this.model?.dispose()
  }

  updateUI() {
    drawObjectDetectResult(this.previewCtx, this.boxes, this.scores, this.classes, this.objectNum, [this.scaleX, this.scaleY])
  }

  async detect(image: ImageData) {
    if (!this.model || !this._enable) return
    tf.engine().startScope()
    let input = this.preprocess(image)
    let res = this.model.execute(input)
    let transRes: tf.Tensor

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

    // if (!this.boxes?.isDisposed) this.boxes?.print()
    // if (!this.scores?.isDisposed) this.scores?.print()
    // if (!this.nms?.isDisposed) this.nms?.print()

    if (!this.boxesTF?.isDisposed && !this.nms?.isDisposed) {
      this.objectNum = Math.min(this.nms?.size, MAX_OBJECTS_NUM)
      this.boxes.set(this.boxesTF?.gather(this.nms, 0)?.dataSync().slice(0, this.objectNum * 4))
      this.scores.set(this.scoresTF?.gather(this.nms, 0)?.dataSync().slice(0, this.objectNum))
      this.classes.set(this.classesTF?.gather(this.nms, 0)?.dataSync().slice(0, this.objectNum))
    }
    tf.dispose([res, transRes, this.boxesTF, this.scoresTF, this.classesTF, this.nms])
    tf.engine().endScope()
  }

  private async yolov6n(res: tf.Tensor) {
    let transRes = res.transpose([0, 2, 1])
    let x1 = transRes.slice([0, 0, 0], [-1, -1, 1]) // x1
    let y1 = transRes.slice([0, 0, 1], [-1, -1, 1]) // y1
    let x2 = transRes.slice([0, 0, 2], [-1, -1, 1]) // x2
    let y2 = transRes.slice([0, 0, 3], [-1, -1, 1]) // y2
    this.boxesTF = tf.concat([y1, x1, y2, x2,], 2).squeeze()
    tf.dispose([x1, y1, x2, y2])
    this.scoresTF = transRes.slice([0, 0, 4], [-1, -1, 1]).squeeze()
    this.nms = await tf.image.nonMaxSuppressionAsync(this.boxes as any, this.scores as any, 50, 0.45, 0.2)
    if (this.nms.size > MAX_OBJECTS_NUM) {
      let tmp = this.nms.slice(0, MAX_OBJECTS_NUM)
      this.nms.dispose()
      this.nms = tmp
    }
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
    this.nms = await tf.image.nonMaxSuppressionAsync(this.boxes as any, this.scores as any, 500, 0.45, 0.2)
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

    this.nms = await tf.image.nonMaxSuppressionAsync(this.boxes as any, this.scores as any, 50, 0.45, 0.2)
    if (this.nms.size > MAX_OBJECTS_NUM) {
      let tmp = this.nms.slice(0, MAX_OBJECTS_NUM)
      this.nms.dispose()
      this.nms = tmp
    }
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
        [0, maxSize - image.height], // padding y [bottom only]
        [0, maxSize - image.width], // padding x [right only]
        [0, 0],
      ])
      return tf.image
        .resizeBilinear(imgPadded as any, [this.modelWidth, this.modelHeight]) // resize frame
        .div(255.0) // normalize
        .expandDims(0) // add batch
    })

    return input
  }
}

