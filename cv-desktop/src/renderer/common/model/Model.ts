
import * as tf from '@tensorflow/tfjs'
import ort from 'onnxruntime-web'
import { baseDomain, ModelEngine, ModelInfo, ModelType } from '../../../shared'

export class Model {
  protected _model: tf.GraphModel
  protected session: ort.InferenceSession

  get model() {
    switch (this._info.engine) {
      case ModelEngine.onnx:
        return this.session
      case ModelEngine.tensorflow:
        return this._model
    }
  }

  private _info: ModelInfo
  get name() { return this._info.name }
  get type() { return this._info.type }

  public scale: [number, number] = [1, 1] // height, width

  protected _isInited: boolean = false
  get isInited() { return this._isInited }

  private _inShape: [number, number] = [-1, -1] // height, width
  private _inName: string = null
  private _inType: string = null
  get inShape() { return this._inShape }

  private _outputs: any
  get outputs() { return this._outputs }

  async init(info: ModelInfo) {
    if (this._isInited && this.name == info.name && this._info.engine == info.engine) return
    if (info.name == null) return
    if (info.type == ModelType.unknown) throw new Error('model type is unknown')

    this.dispose()
    this._isInited = false
    this._info = info

    await tf.ready()

    switch (this._info.engine) {
      case ModelEngine.tensorflow:
        await this.loadTfModel(info.name)
        break
      case ModelEngine.onnx:
        await this.loadOrtModel(info.name)
        break
    }

    if (info.name.indexOf('deeplab') != -1) {
      this._inShape[0] = this._inShape[1] = 513
    }
    if (info.name.indexOf('animeGAN') != -1) {
      this._inShape[0] = this._inShape[1] = 255
    }

    // console.log(this.model.inputs[0].shape, this.modelWidth, this.modelHeight)

    this._isInited = true
  }

  private async loadTfModel(name: string) {
    if (name == 'deeplab-cityspace1') {
      let modelUrl = 'https://tfhub.dev/tensorflow/tfjs-model/deeplab/cityscapes/1/default/1/model.json?tfjs-format=file'
      this._model = await tf.loadGraphModel(modelUrl)
    } else {
      let modelPath = `static/${name}/model.json`
      try {
        this._model = await tf.loadGraphModel(`indexeddb://${modelPath}`)
      } catch (e) {
        this._model = await tf.loadGraphModel(`${__DEV__ ? '' : baseDomain()}/${modelPath}`, {
          requestInit: {
            cache: 'force-cache'
          }
        })

        await this._model.save(`indexeddb://${modelPath}`)
      }
    }

    let input = this._model.inputs[0]

    this._inName = input.name
    this._inType = input.dtype
    this._inShape = input.shape.slice(1, 3) as [number, number]
    console.log(this._model)
  }

  private async loadOrtModel(name: string) {
    let modelPath = `static/${name}.onnx`
    try {
      this.session = await ort.InferenceSession.create(`${__DEV__ ? '' : baseDomain()}/${modelPath}`, {
        executionProviders: ['wasm']
      })
    } catch (e) {
      console.error(e)
    }

    let input = this.session.inputMetadata[0] as ort.InferenceSession.TensorValueMetadata

    this._inName = input.name
    this._inType = input.type
    this._inShape = input.shape.slice(2) as [number, number]

    let outputs = this.session.outputMetadata[0] as ort.InferenceSession.TensorValueMetadata
    // this._output = outputs 
    console.log(this.session)
  }

  async dispose() {
    this._model?.dispose()
    await this.session?.release()
    this._isInited = false
    this._model = null
    this.session = null
  }

  async run(image: ImageData) {
    if (!this._isInited || (this._model == null && this.session == null)) {
      return
    }

    let input = await this.preprocess(image)
    let result: tf.Tensor | tf.Tensor[] = null
    let params = {}
    params[this._inName] = input

    switch (this._info.engine) {
      case ModelEngine.onnx:
        let data = await this.session?.run(params)
        result = tf.tidy(() => {
          let res = []

          for (let i = 0; i < this.session.outputNames.length; ++i) {
            let key = this.session.outputNames[i]
            let out = data[key] as any
            if (out.dims.length == 4) { // yolo segment proto 
              res[i] = tf.tensor(out.cpuData, out.dims, out.dtype).transpose([0, 2, 3, 1])
            } else {
              res[i] = tf.tensor(out.cpuData, out.dims, out.dtype)
            }
            out.dispose()
          }
          return res
        })
        break
      case ModelEngine.tensorflow: {
        switch (this.name) {
          case 'mobilenet':
            result = await this._model.executeAsync(params)
            break
          default:
            result = this._model.execute(params)
            break
        }
      }
    }

    // console.log(result)
    input.dispose()
    return result
  }

  private needResize() {
    return (this.name.indexOf('animeGAN') != -1) || (this.name.indexOf('deeplab') != -1)
  }

  private needPaddingSize(input: tf.Tensor) {

  }

  protected async preprocess(image: ImageData) {

    let result = tf.tidy(() => {
      const img = tf.browser.fromPixels(image)
      const maxSize = Math.max(image.width, image.height)
      this.scale[0] = maxSize / this._inShape[0]
      this.scale[1] = maxSize / this._inShape[1]

      if (this.needResize()) {
        console.log(this._inType)
        const width = Math.round(image.width / this.scale[1])
        const height = Math.round(image.height / this.scale[0])
        return tf.image.resizeBilinear(img, [height, width])
          .expandDims().cast(this._inType as tf.DataType)
      }

      // dynamic input: mobilenet
      if (this.name == 'mobilenet') {
        this.scale[0] = this.scale[1] = 1
        return tf.expandDims(img).cast(this._inType as tf.DataType)
      }

      // pad image to model size 
      const padded = img.pad([
        [0, maxSize - image.height],
        [0, maxSize - image.width],
        [0, 0],
      ])
      return tf.image.resizeBilinear(padded as any, this._inShape)
        .div(255).expandDims(0).cast(this._inType as tf.DataType)
    })

    switch (this._info.engine) {
      case ModelEngine.onnx:
        let tmp = tf.tidy(() => { // NHWC to  NCHW 
          return (result as tf.Tensor).transpose([0, 3, 1, 2])
        })
        let data = await tmp.data()
        tf.dispose(tmp)
        return new ort.Tensor(this._inType as any, data,
          (this.session.inputMetadata[0] as any).shape)
      case ModelEngine.tensorflow:
        return result
    }
  }
}

export abstract class ModelRunner {

  protected _expire: number = 0
  get expire(): number { return this._expire }

  abstract get isInited(): boolean

  abstract dispose(): Promise<void>
}