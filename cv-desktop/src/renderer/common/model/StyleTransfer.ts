import * as tf from '@tensorflow/tfjs'
import { ModelInfo } from "../../../shared"
import { Model, ModelRunner } from "./Model"


export class StyleTransfer extends ModelRunner {

  private _styleModel: Model = new Model()
  private _transModel: Model = new Model()
  private _style: ImageData
  private _params: [number, number, number] = [0, 0, 0] // content size, style size, strength

  get isInited() { return this._styleModel.isInited && this._transModel.isInited }

  async init(styleInfo: ModelInfo, transInfo: ModelInfo, style: ImageData, params: [number, number, number]) {
    await this._styleModel.init(styleInfo)
    await this._transModel.init(transInfo)

    this._style = style
    if (params) this._params = params
  }

  async dispose() {
    await this._styleModel.dispose()
    this._styleModel = null
    await this._transModel.dispose()
    this._transModel = null
  }

  updateParams(style: ImageData, params: [number, number, number]) {
    this._style = style
    this._params = params
    console.log('update params')
  }

  async transfer(image: ImageData) {
    let time = Date.now()
    let styleModel = this._styleModel.model as tf.GraphModel
    let tranformModel = this._transModel.model as tf.GraphModel
    const styled = tf.tidy(() => {
      const contentTF = tf.browser.fromPixels(image).toFloat().div(255).expandDims()
      const styleTF = tf.browser.fromPixels(this._style).toFloat().div(255).expandDims()
      let bottleneck = styleModel.execute(styleTF) as tf.Tensor
      if (this._params[1] !== 1.0) {
        const identityBottleneck = styleModel.execute(contentTF) as tf.Tensor
        const styleBottleneck = bottleneck as tf.Tensor
        const styleBottleneckScaled = bottleneck.mul(this._params[1])
        const identityBottleneckScaled = identityBottleneck.mul(1.0 - this._params[1])
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