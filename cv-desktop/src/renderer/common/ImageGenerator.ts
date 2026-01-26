
import * as tf from '@tensorflow/tfjs'
import { ModelInfo } from '../../common'
import { Model } from './Model'

export class ImageGenerator {

  protected model: Model = new Model()

  get isInited() { return this.model.isInited }

  async init(info: ModelInfo) {
    await this.model.init(info)
  }

  async dispose() {
    await this.model?.dispose()
    this.model = null
  }

  async generate(image: ImageData) {
    if (this.model == null || !this.isInited) return null

    const result = await this.model.run(image) as tf.Tensor
    const tmp = tf.tidy(() => result.squeeze().add(1).div(2))

    let generated = await tf.browser.toPixels(tmp as any)
    const [height, width] = tmp.shape.slice(0, 2)
    tf.dispose([result, tmp])
    return [generated, width, height]
  }

}