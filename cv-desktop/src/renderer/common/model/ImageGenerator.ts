
import * as tf from '@tensorflow/tfjs'
import { ModelInfo } from '../../../shared'
import { Model, ModelRunner } from './Model'

export class ImageGenerator extends ModelRunner {

  protected _model: Model = new Model()

  get isInited() { return this._model.isInited }

  async init(info: ModelInfo) {
    await this._model.init(info)
  }

  async dispose() {
    await this._model?.dispose()
    this._model = null
  }

  async generate(image: ImageData) {
    if (this._model == null || !this.isInited) return null

    const result = await this._model.run(image) as tf.Tensor
    const tmp = tf.tidy(() => result.squeeze().add(1).div(2))

    let generated = await result.data()
    const [height, width] = tmp.shape.slice(0, 2)
    tf.dispose([result, tmp])
    return [generated, width, height]
  }

}