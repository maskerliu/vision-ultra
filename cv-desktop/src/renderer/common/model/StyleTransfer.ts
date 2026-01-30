import * as tf from '@tensorflow/tfjs'
import { ModelInfo } from "../../../shared"
import { Model, ModelRunner } from "./Model"


export class StyleTransfer extends ModelRunner {

  private _styleModel: Model = new Model()
  private _transformModel: Model = new Model()

  get isInited() { return this._styleModel.isInited && this._transformModel.isInited }

  async init(style: ModelInfo, transfer: ModelInfo) {
    await this._styleModel.init(style)
    await this._styleModel.init(transfer)
  }

  async dispose() {
    await this._styleModel.dispose()
    this._styleModel = null
    await this._transformModel.dispose()
    this._transformModel = null
  }

  async transfer(image: ImageData, style: ImageData, params: [number, number, number]) {
    let time = Date.now()
    let styleModel = this._styleModel.model as tf.GraphModel
    let tranformModel = this._transformModel.model as tf.GraphModel
    const styled = tf.tidy(() => {
      const contentTF = tf.browser.fromPixels(image).toFloat().div(255).expandDims()
      const styleTF = tf.browser.fromPixels(style).toFloat().div(255).expandDims()
      let bottleneck = styleModel.execute(styleTF) as tf.Tensor
      if (params[1] !== 1.0) {
        const identityBottleneck = styleModel.execute(contentTF) as tf.Tensor
        const styleBottleneck = bottleneck as tf.Tensor
        const styleBottleneckScaled = bottleneck.mul(params[1])
        const identityBottleneckScaled = identityBottleneck.mul(1.0 - params[1])
        bottleneck = styleBottleneckScaled.add(identityBottleneckScaled)
      }

      let styled = tranformModel.execute([contentTF, bottleneck]) as tf.Tensor
      return styled.squeeze()
    })
    this._expire = Date.now() - time

    const data = await styled.data()
    const [height, width] = styled.shape.slice(1, 2)
    tf.dispose(styled)
    return [data, width, height]
  }

}