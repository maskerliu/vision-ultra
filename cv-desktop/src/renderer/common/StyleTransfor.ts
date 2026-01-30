import * as tf from '@tensorflow/tfjs'
import { ModelInfo } from "../../shared"
import { Model } from "./Model"


export class StyleTransfor {

  private _styleModel: Model = new Model()
  private _transferModel: Model = new Model()

  async init(style: ModelInfo, transfer: ModelInfo) {
    await this._styleModel.init(style)
    await this._styleModel.init(transfer)
  }

  async dispose() {
    await this._styleModel.dispose()
    await this._transferModel.dispose()
  }

  async transfer(image: ImageData, params: [number, number, number]) {
    await tf.nextFrame()
    const proceed = tf.tidy(() => {
      return tf.browser.fromPixels(image).toFloat().div(tf.scalar(255)).expandDims()
    })
    let bottleneck = tf.tidy(() => {
      return (this._styleModel.model as tf.GraphModel).predict(proceed)
    })
    if (params[1] !== 1.0) {
      await tf.nextFrame()
      const identityBottleneck = tf.tidy(() => {
        return (this._styleModel.model as tf.GraphModel).predict(proceed)
      })
      const styleBottleneck = bottleneck as tf.Tensor
      bottleneck = await tf.tidy(() => {
        const styleBottleneckScaled = styleBottleneck.mul(tf.scalar(params[1]))
        const identityBottleneckScaled = identityBottleneck.mul(tf.scalar(1.0 - params[1]))
        return styleBottleneckScaled.addStrict(identityBottleneckScaled)
      })
      tf.dispose([styleBottleneck, identityBottleneck])
    }
    await tf.nextFrame()
    const stylized = await tf.tidy(() => {
      return (this._transferModel.model as tf.GraphModel).predict([proceed, bottleneck]).squeeze()
    })
    await tf.browser.toPixels(stylized, this.stylized)
    bottleneck.dispose()  // Might wanna keep this around
    stylized.dispose()
  }

}