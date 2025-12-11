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

  private model: tf.GraphModel
  private modelWidth: number
  private modelHeight: number
  private previewCtx: CanvasRenderingContext2D
  private _width: number
  private _height: number

  private boxes_data: Float32Array<ArrayBufferLike>
  private scores_data: Float16Array
  private classes_data: Uint8Array
  private objectNum: number = 0
  private xRatio: number = 1
  private yRatio: number = 1
  private scaleX: number = 1
  private scaleY: number = 1

  constructor(context: CanvasRenderingContext2D) {
    this.previewCtx = context
    this._width = context.canvas.width
    this._height = context.canvas.height
  }


  async init(yolo: string = 'yolov6n') {
    if (!this._enable) return

    this.model?.dispose()


    this.boxes_data = new Float32Array(MAX_OBJECTS_NUM * 4) // 100 boxes, 4 coordinates
    this.scores_data = new Float16Array(MAX_OBJECTS_NUM) // 100 boxes, 1 score
    this.classes_data = new Uint8Array(MAX_OBJECTS_NUM) // 100 boxes, 1 class

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
    drawObjectDetectResult(this.previewCtx, this.boxes_data, this.scores_data, this.classes_data,this.objectNum, [this.scaleX, this.scaleY])
  }

  async detect(image: ImageData) {
    if (!this.model || !this._enable) return
    tf.engine().startScope()
    let input = this.preprocess(image)
    let res = this.model.execute(input)
    let nms: tf.Tensor
    let boxes: tf.Tensor
    let scores: tf.Tensor
    let classes: tf.Tensor
    let transRes: tf.Tensor
    console.log(res)
    if (Array.isArray(res)) {
      res[1].print()

      let x1 = res[1].slice([0, 0, 0], [-1, -1, 1]) // x1
      let y1 = res[1].slice([0, 0, 1], [-1, -1, 1]) // y1
      let x2 = res[1].slice([0, 0, 2], [-1, -1, 1]) // x2
      let y2 = res[1].slice([0, 0, 3], [-1, -1, 1]) // y2
      classes = res[1].slice([0, 0, 5], [-1, -1, 1]).squeeze()
      boxes = tf.concat([y1, x1, y2, x2,], 2).squeeze()
      tf.dispose([x1, y1, x2, y2])
      scores = res[0].squeeze()
      nms = await tf.image.nonMaxSuppressionAsync(boxes as any, scores as any, 500, 0.45, 0.2)
      nms.print()
    } else {
      transRes = res.transpose([0, 2, 1])
      console.log('transRes', transRes.rank, transRes.shape)
      transRes.print()

      boxes = tf.tidy(() => {
        const w = transRes.slice([0, 0, 2], [-1, -1, 1]) // get width
        const h = transRes.slice([0, 0, 3], [-1, -1, 1]) // get height
        const x1 = tf.sub(transRes.slice([0, 0, 0], [-1, -1, 1]), tf.div(w, 2)) // x1
        const y1 = tf.sub(transRes.slice([0, 0, 1], [-1, -1, 1]), tf.div(h, 2)) // y1
        console.log('w', w.size, w.rank, w.shape)
        w.print()
        console.log('h', h.size, h.rank, h.shape)
        h.print()
        console.log('x1', x1.size, x1.rank, x1.shape)
        x1.print()
        console.log('y1', y1.size, y1.rank, y1.shape)
        y1.print()
        return tf
          .concat([y1, x1, tf.add(y1, h), tf.add(x1, w),], 2)
          .squeeze()
      })

      const rawScores = transRes.slice([0, 0, 4], [-1, -1, 80]).squeeze([0])
      scores = rawScores.max(1)
      classes = rawScores.argMax(1)
      rawScores.dispose()

      nms = await tf.image.nonMaxSuppressionAsync(boxes as any, scores as any, 500, 0.45, 0.2) // NMS to filter boxes
      if (nms.size > MAX_OBJECTS_NUM) {
        let tmp = nms.slice(0, MAX_OBJECTS_NUM)
        nms.dispose()
        nms = tmp
      }
      nms.print()
    }

    if (!boxes.isDisposed && !nms.isDisposed) {
      this.objectNum = Math.min(nms.size, MAX_OBJECTS_NUM)
      this.boxes_data.set(boxes?.gather(nms, 0)?.dataSync().slice(0, MAX_OBJECTS_NUM * 4))  // indexing boxes by nms index
      this.scores_data.set(scores?.gather(nms, 0)?.dataSync().slice(0, MAX_OBJECTS_NUM)) // indexing scores by nms index
      this.classes_data.set(classes?.gather(nms, 0)?.dataSync().slice(0, MAX_OBJECTS_NUM)) // indexing classes by nms index
    }
    tf.dispose([res, transRes, boxes, scores, classes, nms])
    tf.engine().endScope()
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

