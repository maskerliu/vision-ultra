import { ICVAPI, ModelType, ProcessorCMD } from '../../shared'
import { DrawMode, ProcessorType } from './ProcessorManager'
import { WorkerManager } from './WorkerManager'

// TODO: use cv & tfjs-node in nodejs env
export class BackendManager extends WorkerManager {

  protected register(target: ProcessorType, data?: any): void {
    if (target == ProcessorType.cvProcess) {
      window.cvBackend.init(data)
      this.processors.set(target, window.cvBackend)

      this._processorStatus.showLoading = false
      this._processorStatus.showProcess = false
    } else {
      super.register(target, data)
    }
  }

  public async postMessage(target: ProcessorType, data: Partial<{
    cmd: ProcessorCMD
    modelTypes?: ModelType[]
    model?: string
    image?: ImageData
    frame?: SharedArrayBuffer
    width?: number
    height?: number
    options?: any
    masks?: Array<Uint8Array>
    rects?: Array<[number, number, number, number]>
  }>, transfer?: Transferable[]) {
    if (!this._enableCVProcess && target == ProcessorType.cvProcess) return
    if (!this._enableFaceDetect && target == ProcessorType.faceDetect) return
    if (!this._enableObjDetect && target == ProcessorType.objDetect) return
    if (!this._enableImageGen && target == ProcessorType.imageGen) return

    if (data.cmd == ProcessorCMD.process &&
      (target == ProcessorType.faceDetect || target == ProcessorType.cvProcess))
      this._processorStatus.showLoading = false
    else
      this._processorStatus.showLoading = true

    if (target == ProcessorType.cvProcess) {

      console.log(data.cmd)
      let processor = this.processor(target) as ICVAPI
      switch (data.cmd) {
        case ProcessorCMD.updateOptions:
          processor.options(data.options)
          processor[data.cmd].call(processor, data)
          console.log('options', data.options)
          break
        case ProcessorCMD.init:
          processor[data.cmd].call(processor, data)
          break
        case ProcessorCMD.process:
          this._processed = await processor[data.cmd].call(processor, data)
          break
        case ProcessorCMD.findContours:
          let scale = [
            this.objects.scale[0] * this.objects.segScale[0],
            this.objects.scale[1] * this.objects.segScale[1]
          ]
          let i = 0
          let contours = []
          while (i < data.rects.length) {
            let mask = data.masks[i]
            let rect = data.rects[i]
            let result = processor.findContours(mask, rect[2], rect[3])
            result.forEach(p => {
              p[0] = (p[0] + rect[0]) * scale[0]
              p[1] = (p[1] + rect[1]) * scale[1]
            })
            contours.push(result)
            i++
          }

          this._annotationPanel?.drawAnnotations(this.objects.boxes,
            this.objects.scores, this.objects.classes,
            this.objects.objNum, this.objects.scale, contours)
          break
      }
    } else {
      await super.postMessage(target, data, transfer)
    }
  }


  public async onDraw(data?: HTMLImageElement | HTMLVideoElement) {

    if (data != null) {
      this.offscreenCtx.drawImage(data, 0, 0, this.offscreenCtx.canvas.width, this.offscreenCtx.canvas.height)
      this._origin = this.offscreenCtx.getImageData(0, 0, this.offscreenCtx.canvas.width, this.offscreenCtx.canvas.height)
    }

    if (this._enableCVProcess) {
      if (this._processed) {
        this.offscreenCtx.putImageData(this._processed, 0, 0)
        this._processed = null
      } else {
        let processor = this.processor(ProcessorType.cvProcess)
        if (this._origin == null) return
        let data = await processor[ProcessorCMD.process].call(processor,
          { image: this._origin, width: this._origin.width, height: this._origin.height })
        console.log(data)
        this._processed = new ImageData(this.offscreenCtx.canvas.width, this.offscreenCtx.canvas.height)
        this._processed.data.set(data)
        this.offscreenCtx.putImageData(this._processed, 0, 0)
      }
    }

    let image = this.offscreenCtx.getImageData(0, 0, this.offscreenCtx.canvas.width, this.offscreenCtx.canvas.height)
    if (this._origin == null)
      this._origin = this.offscreenCtx.getImageData(0, 0, this.offscreenCtx.canvas.width, this.offscreenCtx.canvas.height)

    this.previewCtx.drawImage(this.offscreenCtx.canvas, 0, 0)
    this._annotationPanel?.drawImage(this.offscreenCtx.canvas)
    this.previewCtx.fillStyle = '#ff4757'
    this.previewCtx.font = '24px Arial'
    this.previewCtx.fillText(`Face: ${this.face ? this.face.expire : '-'}ms\n 
          Object: ${this.objects ? this.objects.expire : '-'}ms`, 20, 30)

    if (this._drawMode == DrawMode.image) {
      await this.postMessage(ProcessorType.objDetect, { cmd: ProcessorCMD.process, image })
      await this.postMessage(ProcessorType.faceDetect, { cmd: ProcessorCMD.process, image })
      await this.postMessage(ProcessorType.imageGen, { cmd: ProcessorCMD.process, image })
    } else {
      switch (this._frames) {
        case 9:
          await this.postMessage(ProcessorType.faceDetect, { cmd: ProcessorCMD.process, image }, [image.data.buffer])
          this._frames = 1
          break
        case 3:
        case 6:
          await this.postMessage(ProcessorType.faceDetect, { cmd: ProcessorCMD.process, image }, [image.data.buffer])
          this._frames++
          break
        case 5:
          await this.postMessage(ProcessorType.objDetect, { cmd: ProcessorCMD.process, image }, [image.data.buffer])
          this._frames++
          break
        default:
          this._frames++
          break
      }
    }
  }

}