
import * as tf from '@tensorflow/tfjs'
import { baseDomain } from '../../common'

export const MAX_OBJECTS_NUM: number = 20

export enum ModelType {
  Unknown = -1,
  Classify = 0,
  Detect = 1,
  Segment = 2,
  OBB = 3,
  Pose = 4
}

const ModelClassSize = {
  'mobilenet': 90,
  'yolo': 80,
  'deeplab': 151
}

export class TFModel {
  protected model: tf.GraphModel
  private _name: string
  get name() { return this._name }

  private modelWidth: number = 0
  private modelHeight: number = 0
  private maxSize: number = 0
  public objNum: number = 0
  public scale: [number, number] = [1, 1]
  private type: ModelType
  private _classNum: number = 0
  get classNum() { return this._classNum }

  private _isInited: boolean = false
  get isInited() { return this._isInited }

  get inShape() {
    return this.model.inputs[0].shape.slice(1)
  }

  async init(name: string, type: ModelType = ModelType.Unknown) {
    if (this._isInited && this.name == name) return
    if (name == null) return
    if (type == ModelType.Unknown) throw new Error('model type is unknown')

    this.dispose()
    this._isInited = false
    this._name = name
    this.type = type

    this._classNum = ModelClassSize[name]

    await tf.ready()

    if (name == 'deeplabv3') {
      let modelUrl = 'https://tfhub.dev/tensorflow/tfjs-model/deeplab/ade20k/1/default/1/model.json'
      this.model = await tf.loadGraphModel(modelUrl)
    } else {
      let modelPath = `static/${name}_web_model/model.json`
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
    }
    this.modelWidth = this.model.inputs[0].shape[1]
    this.modelHeight = this.model.inputs[0].shape[2]

    if (name == 'deeplab') {
      this.modelWidth = this.modelHeight = 513
    }

    console.log(this.model.inputs[0].shape, this.modelWidth, this.modelHeight)

    console.log(this.model)

    this._isInited = true
  }

  dispose() {
    this.model?.dispose()
    this._isInited = false
    this.model = null
  }

  async run(image: ImageData, segment: boolean = false) {
    let maxSize = Math.max(image.width, image.height)
    this.scale[0] = maxSize / this.modelWidth
    this.scale[1] = maxSize / this.modelHeight
    this.maxSize = maxSize

    if (!this._isInited || this.model == null) {
      this.objNum = 0
      return
    }

    let input: any
    switch (this.type) {
      case ModelType.Detect:
        input = this.preprocess(image)
        break
      case ModelType.Segment:
        if (this.name.indexOf('deeplab') !== -1)
          input = tf.tidy(() => tf.cast(this.toInputTensor(image), 'int32'))
        else
          input = this.preprocess(image)
        break
      default:
        throw new Error('model type is unknown')
    }

    let result = await this.model.executeAsync(input)
    input.dispose()
    return result
  }

  protected preprocess(image: ImageData) {
    const input = tf.tidy(() => {
      const img = tf.browser.fromPixels(image)

      if (this.modelWidth == -1 || this.modelHeight == -1)
        return tf.expandDims(img)

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

  protected toInputTensor(input: ImageData) {
    return tf.tidy(() => {
      const image = input instanceof tf.Tensor ? input : tf.browser.fromPixels(input)
      const [height, width] = image.shape
      const resizeRatio = 513 / Math.max(width, height)
      const targetHeight = Math.round(height * resizeRatio)
      const targetWidth = Math.round(width * resizeRatio)
      return tf.expandDims(
        tf.image.resizeBilinear(image, [targetHeight, targetWidth]))
    })
  }
}