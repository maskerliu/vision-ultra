
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

export namespace onnx {


  export async function createModelCpu(model: ArrayBuffer): Promise<ort.InferenceSession> {
    console.log("prior init")
    console.log("prior create wasm")
    return await ort.InferenceSession.create(model, { executionProviders: ['wasm'] })
  }
  export async function createModelGpu(model: ArrayBuffer): Promise<ort.InferenceSession> {
    console.log("prior create")
    return await ort.InferenceSession.create(model, { executionProviders: ['webgl'] })
  }

  export async function warmupModel(model: ort.InferenceSession, dims: number[]) {
    // OK. we generate a random input and call Session.run() as a warmup query
    const size = dims.reduce((a, b) => a * b)
    const warmupTensor = new ort.Tensor('float32', new Float32Array(size), dims)

    for (let i = 0; i < size; i++) {
      warmupTensor.data[i] = Math.random() * 2.0 - 1.0  // random value [-1.0, 1.0)
    }
    try {
      const feeds: Record<string, ort.Tensor> = {}
      feeds[model.inputNames[0]] = warmupTensor
      // console.log("prior run");
      await model.run(feeds)
      // console.log("after run");
    } catch (e) {
      console.error(e)
    }
  }

  export async function runModel(model: ort.InferenceSession | undefined,
    preprocessedData: ort.Tensor): Promise<[ort.Tensor, number]> {
    const start = new Date()
    try {
      const feeds: Record<string, ort.Tensor> = {}
      feeds[model!.inputNames[0]] = preprocessedData
      const outputData = await model!.run(feeds)
      const end = new Date()
      const inferenceTime = (end.getTime() - start.getTime())
      const output = outputData[model!.outputNames[0]]

      return [output, inferenceTime]
    } catch (e) {
      console.error(e)
      throw new Error()
    }
  }
}