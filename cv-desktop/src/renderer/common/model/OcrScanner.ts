import { ModelInfo } from "../../../shared"
import { Model, ModelRunner } from "./Model"

export class OcrScanner extends ModelRunner {

  private _model: Model = new Model()

  get isInited() { return this._model.isInited }

  async init(info: ModelInfo) {
    await this._model.init(info)
  }

  async dispose() {
    await this._model.dispose()
    this._model = null
  }

  async scan(image: ImageData, params: [number, number, number]) {

  }
}