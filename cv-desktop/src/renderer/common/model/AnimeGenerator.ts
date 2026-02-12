import * as tf from "@tensorflow/tfjs"
import { ModelInfo } from "../../../shared"
import { AnimeGanv3Model, Model, ModelRunner } from "./Model"

export class AnimeGenerator extends ModelRunner {
  protected _model: Model = new AnimeGanv3Model()

  get isInited() {
    return this._model.isInited
  }

  async init(info: ModelInfo) {
    await this._model.init(info)
  }

  async dispose() {
    await this._model?.dispose()
    this._model = null
  }

  async generate(image: ImageData) {
    if (this._model == null || !this.isInited) return null

    let result = await this._model.run(image)
    if (result == null) return null

    if (this._model.name.indexOf("animeGANv2") != -1) {
      const wrapper = result[0] as tf.Tensor
      let idx = wrapper.shape.indexOf(3)
      let tmp: tf.Tensor
      if (idx == 1) {
        tmp = wrapper.transpose([0, 2, 3, 1])
      } else if (idx == 2) {
        tmp = wrapper.transpose([0, 1, 3, 2])
      } else {
        tmp = wrapper
      }

      idx = this._model.inShape.findIndex((it) => it == 3)
      let size = idx == 1 ? this._model.inShape.slice(2, 4) : this._model.inShape.slice(1, 3)
      let maxSize = Math.max(image.width, image.height)
      let w = Math.ceil(size[1] - (maxSize - image.width) / this._model.scale[1])
      let h = Math.ceil(size[0] - (maxSize - image.height) / this._model.scale[0])
      result = tmp.slice([0, 0, 0, 0], [-1, h, w, -1])
      tf.dispose([wrapper, tmp])
    }
    console.log(result)
    const tmp = tf.tidy(() => (Array.isArray(result) ? result[0] : result).squeeze().add(1).div(2))
    console.log(tmp.shape)
    let generated = await tf.browser.toPixels(tmp as any)
    const [height, width] = tmp.shape.slice(0, 2)
    tf.dispose([result, tmp])
    return [generated, width, height]
  }
}
