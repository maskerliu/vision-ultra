
import * as tf from '@tensorflow/tfjs'
import ort from 'onnxruntime-web'
import { baseDomain, ModelEngine, ModelInfo, ModelType } from '../../../shared'

export class Model {
  protected _model: tf.GraphModel
  protected _session: ort.InferenceSession

  get model() {
    switch (this._info.engine) {
      case ModelEngine.onnx:
        return this._session
      case ModelEngine.tensorflow:
        return this._model
    }
  }

  protected _info: ModelInfo
  get name() { return this._info.name }
  get type() { return this._info.type }

  public scale: [number, number] = [1, 1] // height, width

  protected _isInited: boolean = false
  get isInited() { return this._isInited }

  // default input shape NHWC
  protected _inShape: [number, number, number, number] = [1, -1, -1, 3] // height, width
  protected _inName: string = null
  protected _inType: string = null
  get inShape() { return this._inShape }

  protected _outputs: any
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

    if (this._model == null && this._session == null) return

    if (info.name.indexOf('deeplab') != -1) {
      this._inShape = [1, 513, 513, 3]
    }
    if (info.name.indexOf('animeGANv3') != -1) {
      this._inShape = [1, 256, 256, 3]
    }

    if (info.name == 'easyOcr') {
      this._inShape = [1, 3, -1, -1]
    }

    this._isInited = true
  }

  private async loadTfModel(name: string) {
    if (name == 'deeplab-cityspace1') {
      let modelUrl = 'https://tfhub.dev/tensorflow/tfjs-model/deeplab/cityscapes/1/default/1/model.json?tfjs-format=file'
      this._model = await tf.loadGraphModel(modelUrl)
    }

    let modelPath = `static/${name}/model.json`
    try {
      this._model = await tf.loadGraphModel(`indexeddb://${modelPath}`)
    } catch (e) {
      this._model = await tf.loadGraphModel(
        `${__DEV__ ? '' : baseDomain()}/${modelPath}`,
        {
          requestInit: { cache: 'force-cache' }
        }
      )

      await this._model.save(`indexeddb://${modelPath}`)
    }

    let input = this._model.inputs[0]

    this._inName = input.name
    this._inType = input.dtype
    this._inShape = input.shape as [number, number, number, number]
    console.log(this._model)
  }

  private async loadOrtModel(name: string) {
    let modelPath = `static/${name}.onnx`
    try {
      let opts = {
        executionProviders: ['wasm'],
      }

      if (name == 'easyOcr') {
        opts['externalData'] = [
          {
            path: 'easyOCR.onnx.data',
            data: `${__DEV__ ? '' : baseDomain()}/static/${name}.onnx.data`
          }
        ]
      }
      this._session = await ort.InferenceSession.create(
        `${__DEV__ ? '' : baseDomain()}/${modelPath}`, opts,
      )
    } catch (e) {
      console.error(e)
    }

    let input = this._session.inputMetadata[0] as ort.InferenceSession.TensorValueMetadata

    this._inName = input.name
    this._inType = input.type
    this._inShape = input.shape as [number, number, number, number]

    let outputs = this._session.outputMetadata[0] as ort.InferenceSession.TensorValueMetadata
    // this._output = outputs 
    console.log(this._session)
  }

  async dispose() {
    this._model?.dispose()
    await this._session?.release()
    this._isInited = false
    this._model = null
    this._session = null
  }

  async run(image: ImageData) {
    if (!this._isInited || (this._model == null && this._session == null)) {
      return
    }

    let input = await this.preprocess(image)
    let result: tf.Tensor | tf.Tensor[] = null
    let params = {}
    params[this._inName] = input

    switch (this._info.engine) {
      case ModelEngine.onnx:
        console.log(params)
        let data = await this._session?.run(params)
        console.log(data)
        result = tf.tidy(() => {
          let res = []
          for (let i = 0; i < this._session.outputNames.length; ++i) {
            let key = this._session.outputNames[i]
            let out = data[key] as any
            if (out.dims.length == 4 && this.name.indexOf('yolo') != -1) { // yolo segment proto 
              res[i] = tf.tensor(out.cpuData, out.dims, out.dtype).transpose([0, 2, 3, 1])
            } else {
              res[i] = tf.tensor(out.cpuData, out.dims, out.dtype)
            }
            out.dispose()
          }
          return res
        })

        // slice image to origin image size ratio
        if (this.name.indexOf('animeGAN') != -1) {
          const wrapper = result[0] as tf.Tensor
          let idx = wrapper.shape.indexOf(3)
          let tmp: tf.Tensor
          if (idx == 1) {
            tmp = wrapper.transpose([0, 2, 3, 1])
          } else if (idx == 2) {
            tmp = wrapper.transpose([0, 1, 3, 2])
          }

          if (tmp != null) {
            tf.dispose([wrapper, result])
            result = tmp
          } else {
            result = wrapper
          }

          // let w = Math.ceil(image.width / this.scale[1])
          // let h = Math.ceil(image.height / this.scale[0])
          // result = result.slice([0, 0, 0, 0], [-1, h, w, -1])
        }

        break
      case ModelEngine.tensorflow: {
        switch (this.name) {
          case 'mobilenet':
          case 'animeGANv2':
            result = await this._model.executeAsync(params)
            console.log(result)
            break
          default:
            result = this._model.execute(params)
            break
        }
      }
    }

    input.dispose()
    return result
  }

  protected needResize() {
    return (this.name.indexOf('deeplab') != -1) ||
      (this.name.indexOf('animeGANv3') != -1 && this._info.engine == ModelEngine.tensorflow)
  }

  protected dynamicInput() {
    return this.name == 'mobilenet' || this.name == 'easyOcr'
  }

  protected async preprocess(image: ImageData) {

    let result = tf.tidy(() => {
      const img = tf.browser.fromPixels(image)
      const maxSize = Math.max(image.width, image.height)
      let idx = this._inShape.findIndex(it => it == 3)
      let size = idx == 1 ? this._inShape.slice(2, 4) : this._inShape.slice(1, 3)
      this.scale[0] = maxSize / size[0]
      this.scale[1] = maxSize / size[1]

      if (this.needResize()) {
        const width = Math.round(image.width / this.scale[1])
        const height = Math.round(image.height / this.scale[0])
        return tf.image.resizeBilinear(img, [height, width])
          .expandDims().cast(this._inType as tf.DataType)
      }

      // dynamic input: mobilenet
      if (this.dynamicInput()) {
        this.scale[0] = this.scale[1] = 1
        return tf.expandDims(img).cast(this._inType as tf.DataType)
      }

      // pad image to model size as default preprocess
      const padded = img.pad([
        [0, maxSize - image.height],
        [0, maxSize - image.width],
        [0, 0],
      ])

      return tf.image.resizeBilinear(padded as any, size as [number, number])
        .div(255).expandDims(0).cast(this._inType as tf.DataType)
    })

    switch (this._info.engine) {
      case ModelEngine.onnx:

        let wrapper = result.transpose([0, 3, 1, 2])
        let data = await wrapper.data()
        wrapper.dispose()

        let dims = this._inShape

        if (this.dynamicInput()) {
          dims = [1, 3, result.shape[1], result.shape[2]]
        }
        tf.dispose(result)
        return new ort.Tensor(this._inType as any, data, dims)
      case ModelEngine.tensorflow:
        return tf.tidy(() => {
          let trans = null
          let idx = this._inShape.indexOf(3)
          if (idx == 3) {
            trans = [0, 3, 1, 2]
          } else if (idx == 2) {
            trans = [0, 2, 1, 3]
          }
          return trans ? result.transpose(trans) : result
        })
    }
  }
}

export class DeeplabModel extends Model {
  async init(info: ModelInfo) {
    super.init(info)
    this._inShape = [1, 513, 513, 3]
  }

  protected needResize(): boolean { return true }
}

export class AnimeGanv3Model extends Model {

  async init(info: ModelInfo): Promise<void> {
    super.init(info)

    this._inShape = [1, 256, 256, 3]
  }

  protected needResize(): boolean {
    return this._info.engine == ModelEngine.tensorflow
  }
}

export class EasyOcrModel extends Model {
  async init(info: ModelInfo): Promise<void> {
    super.init(info)
    this._inShape = [1, 3, -1, -1]
  }

  protected dynamicInput() {
    return true
  }
}

export abstract class ModelRunner {

  protected _expire: number = 0
  get expire(): number { return this._expire }

  abstract get isInited(): boolean

  abstract dispose(): Promise<void>
}