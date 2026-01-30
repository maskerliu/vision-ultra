import { ModelInfo } from "../../shared"
import { Model } from "./Model"

export class OcrScanner {

  private _model: Model = new Model()


  async init(info: ModelInfo) {
    await this._model.init(info)
  }

  async scan(image: ImageData, params: [number, number, number]) {

  }
}