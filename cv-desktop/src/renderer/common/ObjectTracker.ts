import { FilesetResolver, ImageSegmenter, InteractiveSegmenter } from '@mediapipe/tasks-vision'
import * as tf from '@tensorflow/tfjs'
import { baseDomain } from '../../common'

export const MAX_OBJECTS_NUM: number = 20

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

  public boxes: Float16Array<ArrayBufferLike>
  public scores: Float16Array
  public classes: Uint8Array
  public objNum: number = 0
  public scaleX: number = 1
  public scaleY: number = 1
  private maxSize: number = 0
  private nms: tf.Tensor
  private boxesTF: tf.Tensor
  private scoresTF: tf.Tensor
  private classesTF: tf.Tensor

  private _expire: number = 0
  get expire(): number { return this._expire }

  private _isInited: boolean = false


  private segmenter: ImageSegmenter = null
  private interactiveSegmenter: InteractiveSegmenter = null

  private _fileset: any

  async init(yolo: string = 'yolov8n', fileset: any) {
    this.dispose()

    this.modelName = yolo

    if (this.boxes == null) this.boxes = new Float16Array(MAX_OBJECTS_NUM * 4)
    if (this.scores == null) this.scores = new Float16Array(MAX_OBJECTS_NUM)
    if (this.classes == null) this.classes = new Uint8Array(MAX_OBJECTS_NUM)


    let filesetResolver = await FilesetResolver.forVisionTasks(
      __DEV__ ? 'node_modules/@mediapipe/tasks-vision/wasm' : baseDomain() + '/static/tasks-vision/wasm')
    this.segmenter = await ImageSegmenter.createFromModelPath(fileset,
      `${__DEV__ ? '' : baseDomain()}/static/deeplab_v3.tflite`
    )

    this.interactiveSegmenter = await InteractiveSegmenter.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: `${__DEV__ ? '' : baseDomain()}/static/magic_touch.tflite`,
        delegate: 'GPU'
      },
    })

    await tf.ready()
    let modelPath = `static/${yolo}_web_model/model.json`
    try {
      this.model = await tf.loadGraphModel(`indexeddb://${modelPath}`)
    } catch (e) {
      this.model = await tf.loadGraphModel(`${__DEV__ ? '' : baseDomain()}/${modelPath}`, {
        requestInit: {
          cache: 'force-cache'
        }
      })

      await this.model.save(`indexeddb://${modelPath}`)
    }


    this.modelWidth = this.model.inputs[0].shape[1]
    this.modelHeight = this.model.inputs[0].shape[2]

    this._isInited = true
  }

  async dispose() {
    this.model?.dispose()
    this._isInited = false
    this.model = null
    this.boxes = null
    this.scores = null
    this.classes = null
  }

  segment(image: ImageData) {
    let result = this.segmenter.segment(image)
    console.log(result.confidenceMasks[0])
    // return result.confidenceMasks.map(it => it.getAsFloat32Array())
    return result.confidenceMasks
  }

  async detect(image: ImageData) {
    let maxSize = Math.max(image.width, image.height)
    if (this.maxSize != maxSize) {
      this.scaleX = maxSize / this.modelWidth
      this.scaleY = maxSize / this.modelHeight
      this.maxSize = maxSize
    }

    if (!this._isInited || this.model == null) {
      this.objNum = 0
      return
    }

    let time = Date.now()
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

    this.nms = await tf.image.nonMaxSuppressionAsync(this.boxesTF as any, this.scoresTF as any, 50, 0.45, 0.35)
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
      this.objNum = Math.min(this.nms?.size, MAX_OBJECTS_NUM)
      this.boxes.set(this.boxesTF?.gather(this.nms, 0)?.dataSync().slice(0, this.objNum * 4))
      this.scores.set(this.scoresTF?.gather(this.nms, 0)?.dataSync().slice(0, this.objNum))
      this.classes.set(this.classesTF?.gather(this.nms, 0)?.dataSync().slice(0, this.objNum))
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

    const input = tf.tidy(() => {
      const img = tf.browser.fromPixels(image)
      const imgPadded = img.pad([
        [0, this.maxSize - image.height],
        [0, this.maxSize - image.width],
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