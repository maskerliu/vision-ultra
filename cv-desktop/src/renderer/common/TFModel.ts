
import * as tf from '@tensorflow/tfjs'
import { baseDomain } from '../../common'
import { ModelType } from './misc'

export class TFModel {
  protected model: tf.GraphModel
  private _name: string
  get name() { return this._name }

  private _type: ModelType
  get type() { return this._type }

  public modelWidth: number = 0
  public modelHeight: number = 0
  public scale: [number, number] = [1, 1]

  protected _isInited: boolean = false
  get isInited() { return this._isInited }

  get inShape() { return this.model?.inputs[0].shape.slice(1) }

  async init(name: string, type: ModelType = ModelType.Unknown) {
    if (this._isInited && this.name == name) return
    if (name == null) return
    if (type == ModelType.Unknown) throw new Error('model type is unknown')

    this.dispose()
    this._isInited = false
    this._name = name
    this._type = type

    await tf.ready()

    if (name == 'deeplab-cityspace1') {
      let modelUrl = 'https://tfhub.dev/tensorflow/tfjs-model/deeplab/cityscapes/1/default/1/model.json?tfjs-format=file'
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

    if (name.indexOf('deeplab') != -1) {
      this.modelWidth = this.modelHeight = 513
    }
    if (name == 'animeGANv3') {
      this.modelWidth = this.modelHeight = 255
    }

    console.log(this.model)
    // console.log(this.model.inputs[0].shape, this.modelWidth, this.modelHeight)

    this._isInited = true
  }

  dispose() {
    this.model?.dispose()
    this._isInited = false
    this.model = null
  }

  async run(image: ImageData) {
    if (!this._isInited || this.model == null) {
      return
    }

    let input = this.preprocess(image)
    let result: tf.Tensor | tf.Tensor[] = null
    let argKey = this.model.inputs[0].name
    let params = {}
    params[argKey] = input

    switch (this.name) {
      case 'mobilenet':
        result = await this.model.executeAsync(params)
        break
      case 'animeGANv3':
        result = tf.tidy(() => {
          // const wrapper = input.div(255.0)
          // params[argKey] = input
          return this.model.execute(params)
        })
      case 'deeplab-ade':
      case 'deeplab-cityspace':
        result = this.model.execute(params)
        break
      default:
        result = this.model.execute(params)
        break
    }
    input.dispose()
    return result
  }

  private needResize() {
    return (this.name == 'animeGANv3') || (this.name.indexOf('deeplab') != -1)
  }

  private needPaddingSize(input: tf.Tensor) {


  }
  protected preprocess(image: ImageData) {
    return tf.tidy(() => {
      const img = tf.browser.fromPixels(image)
      const maxSize = Math.max(image.width, image.height)
      this.scale[0] = maxSize / this.modelWidth
      this.scale[1] = maxSize / this.modelHeight

      let dtype = this.model.inputs[0].dtype
      if (this.needResize()) {
        const width = Math.round(image.width / this.scale[0])
        const height = Math.round(image.height / this.scale[1])
        return tf.image.resizeBilinear(img, [height, width]).expandDims().cast(dtype)
      }

      // any size mobilenet
      if (this.name == 'mobilenet') {
        this.scale[0] = this.scale[1] = 1
        return tf.expandDims(img).cast(dtype)
      }

      // pad image to model size 
      const padded = img.pad([
        [0, maxSize - image.height],
        [0, maxSize - image.width],
        [0, 0],
      ])
      return tf.image.resizeBilinear(padded as any, [this.modelHeight, this.modelWidth])
        .div(255.0).expandDims(0).cast(dtype)
    })
  }
}