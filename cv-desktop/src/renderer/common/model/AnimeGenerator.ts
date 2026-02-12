
import * as tf from '@tensorflow/tfjs'
import { ModelInfo } from '../../../shared'
import { AnimeGanv3Model, Model, ModelRunner } from './Model'

export class AnimeGenerator extends ModelRunner {

  protected _model: Model = new AnimeGanv3Model()

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
    if (result == null) return null
    const tmp = tf.tidy(() => (Array.isArray(result) ? result[0] : result).squeeze().add(1).div(2))
    console.log(tmp.shape)
    let generated = await tf.browser.toPixels(tmp as any)
    const [height, width] = tmp.shape.slice(0, 2)
    tf.dispose([result, tmp])
    return [generated, width, height]

  }

}