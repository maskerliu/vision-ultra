import * as tf from '@tensorflow/tfjs'
import { baseDomain } from '../../common'
import { drawObjectDetectResult } from './DrawUtils'
import { Float } from 'apache-arrow'

export class ObjectTracker {

  private _enable: boolean = false
  set enable(val: boolean) {
    this._enable = val
  }

  private model: tf.GraphModel
  private modelWidth: number
  private modelHeight: number
  private previewCtx: CanvasRenderingContext2D


  private boxes_data: any
  private scores_data: Float32Array
  private classes_data: Uint8Array
  private xRatio: number = 1
  private yRatio: number = 1

  constructor(context: CanvasRenderingContext2D) {
    this.previewCtx = context
  }


  async init(yolo: string = 'yolov8n') {
    if (!this._enable) return

    this.model?.dispose()

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
    drawObjectDetectResult(this.previewCtx, this.boxes_data, this.scores_data, this.classes_data, [this.xRatio, this.yRatio])
  }

  async detect(image: ImageData) {
    if (!this.model || !this._enable) return
    
    tf.engine().startScope()
    const input = this.preprocess(image)
    const res = this.model.execute(input)
    const transRes = (res as tf.Tensor).transpose([0, 2, 1])

    const boxes = tf.tidy(() => {
      const w = transRes.slice([0, 0, 2], [-1, -1, 1]) // get width
      const h = transRes.slice([0, 0, 3], [-1, -1, 1]) // get height
      const x1 = tf.sub(transRes.slice([0, 0, 0], [-1, -1, 1]), tf.div(w, 2)) // x1
      const y1 = tf.sub(transRes.slice([0, 0, 1], [-1, -1, 1]), tf.div(h, 2)) // y1
      return tf
        .concat([y1, x1, tf.add(y1, h), tf.add(x1, w),], 2)
        .squeeze()
    })

    const [scores, classes] = tf.tidy(() => {
      const rawScores = transRes.slice([0, 0, 4], [-1, -1, 80]).squeeze([0]) // #6 only squeeze axis 0 to handle only 1 class models
      return [rawScores.max(1), rawScores.argMax(1)]
    })
    const nms = await tf.image.nonMaxSuppressionAsync(boxes as any, scores, 500, 0.45, 0.2) // NMS to filter boxes
    
    if (boxes.isDisposed && nms.isDisposed) {
      this.boxes_data = boxes?.gather(nms, 0)?.dataSync() // indexing boxes by nms index
      this.scores_data = scores?.gather(nms, 0)?.dataSync() // indexing scores by nms index
      this.classes_data = classes?.gather(nms, 0)?.dataSync() // indexing classes by nms index
      tf.dispose([res, transRes, boxes, scores, classes, nms])
      tf.engine().endScope()
    }
  }

  private preprocess(image: ImageData) {
    const input = tf.tidy(() => {
      const img = tf.browser.fromPixels(image)
      const [h, w] = img.shape.slice(0, 2) // get source width and height
      const maxSize = Math.max(w, h) // get max size
      const imgPadded = img.pad([
        [0, maxSize - h], // padding y [bottom only]
        [0, maxSize - w], // padding x [right only]
        [0, 0],
      ])

      this.xRatio = maxSize / w // update xRatio
      this.yRatio = maxSize / h // update yRatio

      return tf.image
        .resizeBilinear(imgPadded as any, [this.modelWidth, this.modelHeight]) // resize frame
        .div(255.0) // normalize
        .expandDims(0) // add batch
    })

    return input
  }
}

