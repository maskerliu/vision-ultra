
import { ModelType, ProcessorCMD } from '../../common'
import CVProcessWorker from '../cvProcess.worker?worker'
import FaceDetectWorker from '../faceDetect.worker?worker'
import ImageGenWoker from '../imageGen.worker?worker'
import ObjDetectWorker from '../objDetect.worker?worker'
import { DrawMode, ProcessorManager, ProcessorType } from './BaseManager'


// use cv & tfjs in browser env
export class WorkerManager extends ProcessorManager {


  setParam(param: string, val: boolean, metadata?: any, anyway: boolean = false) {

    if (this[`_${param}`] == val && !anyway) return

    this[`_${param}`] = val

    let type = ProcessorType.unknown
    if (param == 'enableCVProcess') {
      type = ProcessorType.cvProcess
    } else if (param == 'enableObjDetect') {
      type = ProcessorType.objDetect
    } else if (param == 'enableFaceDetect') {
      type = ProcessorType.faceDetect
    }

    if (val) {
      this._processorStatus.showLoading = true
      if (anyway) { this.terminate(type) }
      this.register(type, Object.assign({ cmd: ProcessorCMD.init }, metadata))
    } else {
      this.terminate(type)
    }
  }

  protected register(target: ProcessorType, data?: any) {
    if (this.processors.has(target)) return

    let processor: Worker
    switch (target) {
      case ProcessorType.cvProcess: {
        processor = new CVProcessWorker()
        processor.addEventListener('message', this.onCVProcessMessage.bind(this))
        break
      }
      case ProcessorType.faceDetect: {
        processor = new FaceDetectWorker()
        processor.addEventListener('message', this.onFaceDetectMessage.bind(this))
        break
      }
      case ProcessorType.objDetect: {
        processor = new ObjDetectWorker()
        processor.addEventListener('message', this.onObjDetectMessage.bind(this))
        break
      }
      case ProcessorType.imageGen: {
        processor = new ImageGenWoker()
        processor.addEventListener('message', this.handleMessage.bind(this))
        break
      }
    }

    this.processors.set(target, processor)

    if (data != null) this.postMessage(target, data)
  }

  public postMessage(
    target: ProcessorType,
    data: Partial<{
      cmd: ProcessorCMD
      modelTypes?: ModelType[] // for obj rec 
      model?: string // for obj rec 
      image?: ImageData
      frame?: SharedArrayBuffer
      width?: number
      height?: number
      options?: any // for cv process
      masks?: Array<Uint8Array>
      rects?: Array<[number, number, number, number]>
    }>,
    transfer?: Transferable[]) {

    // console.log(`[main] ${target} post`, data)
    if (!this._enableCVProcess && target == ProcessorType.cvProcess) return
    if (!this._enableFaceDetect && target == ProcessorType.faceDetect) return
    if (!this._enableObjDetect && target == ProcessorType.objDetect) return
    if (!this._enableImageGen && target == ProcessorType.imageGen) return

    if (data.cmd == ProcessorCMD.process &&
      (target == ProcessorType.faceDetect || target == ProcessorType.cvProcess))
      this._processorStatus.showLoading = false
    else
      this._processorStatus.showLoading = true;

    (this.processor(target) as Worker)?.postMessage(data, transfer)
  }

  protected handleMessage(event: MessageEvent) {
    this._processorStatus.showLoading = false
    this._processorStatus.showProcess = false

    switch (event.data.type) {
      case 'generated':
        let imageData = new ImageData(event.data.width, event.data.height)
        imageData.data.set(event.data.image)
        this.previewCtx.save()
        this.previewCtx.scale(4, 4)
        this.previewCtx.putImageData(imageData, 0, 0)
        this.previewCtx.restore()
        break
    }
  }

  protected onCVProcessMessage(event: MessageEvent) {
    // console.log('[main] cvProcess', event.data)
    this._processorStatus.showLoading = false
    this._processorStatus.showProcess = false

    switch (event.data.type) {
      case 'processed':
        this._processed = event.data.result
        if (this._drawMode == DrawMode.image) this.onDraw()
        break
      case 'contours':
        event.data.contours.forEach(points => {
          points.forEach((p: [number, number]) => {
            p[0] *= this.objects.scale[0] * this.objects.segScale[0]
            p[1] *= this.objects.scale[1] * this.objects.segScale[1]
          })
        })

        // this.drawContours(event.data.contours)

        this._annotationPanel?.drawAnnotations(this.objects.boxes,
          this.objects.scores, this.objects.classes,
          this.objects.objNum, this.objects.scale, event.data.contours)
        break
    }
  }

  protected onFaceDetectMessage(event: MessageEvent<any>) {
    // console.log('[main] faceDetect', event.data)
    this._processorStatus.showLoading = false
    this._processorStatus.showProcess = false

    switch (event.data.type) {
      case 'face':
        this._face = event.data.face
        if (this._drawMode == DrawMode.image) {
          this.drawFace()
        }

        if (event.data.tface) this._live2dPanel?.animateLive2DModel(event.data.tface)
        break
    }
  }

  protected onObjDetectMessage(event: MessageEvent) {
    // console.log('[main] objDetect', event.data)
    this._processorStatus.showLoading = false
    this._processorStatus.showProcess = false
    this._processorStatus.error = event.data.error ? event.data.error : null

    switch (event.data.type) {
      case 'mask':
        this._objects = event.data
        this._annotationPanel?.drawAnnotations(this.objects.boxes,
          this.objects.scores, this.objects.classes,
          this.objects.objNum, this.objects.scale)

        this.drawOverlay()
        this.drawMask()
        break
    }
  }

  public onDraw(data?: HTMLImageElement | HTMLVideoElement) {
    if (data != null) {
      this.offscreenCtx.drawImage(data, 0, 0, this.offscreenCtx.canvas.width, this.offscreenCtx.canvas.height)
      this._origin = this.offscreenCtx.getImageData(0, 0, this.offscreenCtx.canvas.width, this.offscreenCtx.canvas.height)
    }

    if (this._enableCVProcess) {
      if (this._processed) {
        this.offscreenCtx.putImageData(this._processed, 0, 0)
        this._processed = null
      } else {
        this.postMessage(ProcessorType.cvProcess, { cmd: ProcessorCMD.process, image: this._origin, })
        return
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
      this.postMessage(ProcessorType.objDetect, { cmd: ProcessorCMD.process, image })
      this.postMessage(ProcessorType.faceDetect, { cmd: ProcessorCMD.process, image })
      this.postMessage(ProcessorType.imageGen, { cmd: ProcessorCMD.process, image })
    } else {
      switch (this._frames) {
        case 9:
          this.postMessage(ProcessorType.faceDetect, { cmd: ProcessorCMD.process, image }, [image.data.buffer])
          this._frames = 1
          break
        case 3:
        case 6:
          this.postMessage(ProcessorType.faceDetect, { cmd: ProcessorCMD.process, image }, [image.data.buffer])
          this._frames++
          break
        case 5:
          this.postMessage(ProcessorType.objDetect, { cmd: ProcessorCMD.process, image }, [image.data.buffer])
          this._frames++
          break
        default:
          this._frames++
          break
      }
    }
  }

  protected drawMask(): Array<[number, number, number, number]> {
    let rects = super.drawMask()
    this.postMessage(ProcessorType.cvProcess, { cmd: ProcessorCMD.findContours, masks: this.objects.masks, rects })
    return null
  }

}