
import ort from 'onnxruntime-web'


export class SamDetector {

  private session: ort.InferenceSession

  constructor() {

  }

  public async init() {
    this.session = await ort.InferenceSession.create('http://localhost:8080/model.onnx')
  }

  private decoder() {

  }

  async detect(image: ImageData) {

  }
}