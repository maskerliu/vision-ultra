import * as tf from '@tensorflow/tfjs'
import { baseDomain, ModelInfo } from "../../../shared"
import { Model, ModelRunner } from "./Model"

export class OcrScanner extends ModelRunner {

  private _model: Model = new Model()

  private TessModule: any = null
  private tesseract: any = null

  get isInited() { return this._model.isInited }

  async init(info: ModelInfo) {
    if (info.name == 'tesseract') {
      const TesseractCore = await import('tesseract.js-core/tesseract-core.wasm.js')
      this.TessModule = await TesseractCore.default()
      this.tesseract = new this.TessModule.TessBaseAPI()
      let langs = Array.isArray(info.lang) ? info.lang : [info.lang]
      console.log(langs)
      let i = 0
      while (i < langs.length) {
        let langResp = await fetch(`${__DEV__ ? '' : baseDomain()}/static/${langs[i]}.traineddata`)
        let langData = await langResp.arrayBuffer()
        this.TessModule.FS.writeFile(`${langs[i]}.traineddata`, new Uint8Array(langData))
        i++
      }

      this.tesseract.Init(null, 'chi_sim')
    } else {
      this.tesseract = null
      await this._model.init(info)
    }
  }

  async dispose() {
    this.TessModule?.destroy(this.tesseract)
    this.tesseract = null
    this.TessModule = null

    await this._model.dispose()
    this._model = null
  }

  async scan(image: ImageData | Uint8Array, params?: [number, number, number]) {

    if (this.tesseract) {
      this.TessModule.FS.writeFile("/input", image)
      this.tesseract.SetImageFile()
      let blocks = this.tesseract.GetJSONText()
      return { blocks }
    } else {
      const result = await this._model.run(image as ImageData) as tf.Tensor
      console.log(result)
      return result
    }
  }
}