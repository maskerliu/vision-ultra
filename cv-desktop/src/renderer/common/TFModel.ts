
import * as tf from '@tensorflow/tfjs'
import { baseDomain } from '../../common'

export const MAX_OBJECTS_NUM: number = 20

export class TFModel {
  protected model: tf.GraphModel
  name: string

  private modelWidth: number = 0
  private modelHeight: number = 0
  private maxSize: number = 0
  public objNum: number = 0
  public scale: [number, number] = [1, 1]

  private _isInited: boolean = false
  get isInited() { return this._isInited }

  async init(name: string, fileset: any) {
    if (this._isInited && this.name == name) return
    if (name == null) return
    this.dispose()
    this._isInited = false
    this.name = name

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
    this._isInited = true
  }

  dispose() {
    this.model?.dispose()
    this._isInited = false
    this.model = null
  }

  async run(image: ImageData) {
    let maxSize = Math.max(image.width, image.height)
    if (this.modelWidth == -1 || this.modelHeight == -1)
      this.scale[0] = this.scale[1] = 1
    else {
      this.scale[0] = maxSize / this.modelWidth
      this.scale[1] = maxSize / this.modelHeight
      this.maxSize = maxSize
    }
    if (!this._isInited || this.model == null) {
      this.objNum = 0
      return
    }

    let input = this.preprocess(image)
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
}