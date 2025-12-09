import * as tf from '@tensorflow/tfjs'
import { baseDomain } from '../../common'


export class ObjectTracker {

  private model: tf.GraphModel
  private modelWidth: number
  private modelHeight: number

  constructor() {
    // TODO
  }


  async init() {
    await tf.ready()
    this.model = await tf.loadGraphModel(`${__DEV__ ? '' : baseDomain()}/static/yolov8n_web/model.json`)

    const dummyInput = tf.ones(this.model.inputs[0].shape)
    const warmupResults = this.model.execute(dummyInput)
    this.modelWidth = this.model.inputs[0].shape[1]
    this.modelHeight = this.model.inputs[0].shape[2]

    tf.dispose([warmupResults, dummyInput])
  }

  async detect(image: ImageData) {
    tf.engine().startScope() // start scoping tf engine
    const [input, xRatio, yRatio] = preprocess(image, this.modelWidth, this.modelHeight) // preprocess image

    // const res = this.model.execute(input) // inference model
    // const transRes = res.transpose([0, 2, 1]) // transpose result [b, det, n] => [b, n, det]
    // const boxes = tf.tidy(() => {
    //   const w = transRes.slice([0, 0, 2], [-1, -1, 1]) // get width
    //   const h = transRes.slice([0, 0, 3], [-1, -1, 1]) // get height
    //   const x1 = tf.sub(transRes.slice([0, 0, 0], [-1, -1, 1]), tf.div(w, 2)) // x1
    //   const y1 = tf.sub(transRes.slice([0, 0, 1], [-1, -1, 1]), tf.div(h, 2)) // y1
    //   return tf
    //     .concat(
    //       [
    //         y1,
    //         x1,
    //         tf.add(y1, h), //y2
    //         tf.add(x1, w), //x2
    //       ],
    //       2
    //     )
    //     .squeeze()
    // }) // process boxes [y1, x1, y2, x2]

    // const [scores, classes] = tf.tidy(() => {
    //   // class scores
    //   const rawScores = transRes.slice([0, 0, 4], [-1, -1, numClass]).squeeze(0) // #6 only squeeze axis 0 to handle only 1 class models
    //   return [rawScores.max(1), rawScores.argMax(1)]
    // }) // get max scores and classes index

    // const nms = await tf.image.nonMaxSuppressionAsync(boxes, scores, 500, 0.45, 0.2) // NMS to filter boxes

    // const boxes_data = boxes.gather(nms, 0).dataSync() // indexing boxes by nms index
    // const scores_data = scores.gather(nms, 0).dataSync() // indexing scores by nms index
    // const classes_data = classes.gather(nms, 0).dataSync() // indexing classes by nms index

    // // renderBoxes(canvasRef, boxes_data, scores_data, classes_data, [xRatio, yRatio]) // render boxes
    // tf.dispose([res, transRes, boxes, scores, classes, nms]) // clear memory
    // tf.engine().endScope()
  }
}

function preprocess(source: ImageData, modelWidth: number, modelHeight: number) {
  let xRatio, yRatio // ratios for boxes

  const input = tf.tidy(() => {
    const img = tf.browser.fromPixels(source)

    // padding image to square => [n, m] to [n, n], n > m
    const [h, w] = img.shape.slice(0, 2) // get source width and height
    const maxSize = Math.max(w, h) // get max size
    const imgPadded = img.pad([
      [0, maxSize - h], // padding y [bottom only]
      [0, maxSize - w], // padding x [right only]
      [0, 0],
    ])

    xRatio = maxSize / w // update xRatio
    yRatio = maxSize / h // update yRatio

    // return tf.image
    //   .resizeBilinear(imgPadded, [modelWidth, modelHeight]) // resize frame
    //   .div(255.0) // normalize
    //   .expandDims(0) // add batch
  })

  return [input, xRatio, yRatio]
}