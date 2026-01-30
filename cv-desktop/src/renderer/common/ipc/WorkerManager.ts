
import { CVMsg, FaceDetectMsg, ImgGenMsg, ObjTrackMsg, OCRMsg, ProcessorCMD, StyleTransMsg } from '../../../shared'
import CVProcessWorker from '../../cvProcess.worker?worker'
import FaceDetectWorker from '../../faceDetect.worker?worker'
import ImageGenWoker from '../../imageGen.worker?worker'
import ObjDetectWorker from '../../objTrack.worker?worker'
import OcrWorker from '../../ocr.worker?worker'
import StyleTransWorker from '../../styleTrans.worker?worker'
import { DrawMode, ProcessorManager, ProcessorType } from './ProcessorManager'

// use cv & tfjs in browser env
export class WorkerManager extends ProcessorManager {

  protected register(target: ProcessorType, data?: any) {
    if (this.processors.has(target)) return

    let processor: Worker
    switch (target) {
      case ProcessorType.cvProcess:
        processor = new CVProcessWorker()
        break
      case ProcessorType.objTrack:
        processor = new ObjDetectWorker()
        break
      case ProcessorType.faceDetect:
        processor = new FaceDetectWorker()
        break
      case ProcessorType.imgGen:
        processor = new ImageGenWoker()
        break
      case ProcessorType.ocr:
        processor = new OcrWorker()
        break
      case ProcessorType.styleTrans:
        processor = new StyleTransWorker()
        break
    }

    console.log(`on${target}Msg`)
    processor.addEventListener('message', this[`on${target}Msg`].bind(this))
    this.processors.set(target, processor)

    if (data != null) this.postMessage(target, data)
  }

  public async postMessage(
    target: ProcessorType,
    data: CVMsg | ObjTrackMsg | FaceDetectMsg | ImgGenMsg | OCRMsg | StyleTransMsg,
    transfer?: Transferable[]) {

    // console.log(`[main] ${target} post`, data)
    if (!this[target]) return

    if (data.cmd == ProcessorCMD.process &&
      (target == ProcessorType.faceDetect || target == ProcessorType.cvProcess))
      this._processorStatus.showLoading = false
    else
      this._processorStatus.showLoading = true;

    (this.processor(target) as Worker)?.postMessage(data, transfer)
  }

  protected onCVMsg(event: MessageEvent) {
    // console.log('[main] cvProcess', event.data)
    this._processorStatus.showLoading = false
    this._processorStatus.showProcess = false

    switch (event.data.type) {
      case 'processed':
        this._processed = event.data.result
        if (this._drawMode == DrawMode.image) this.onDraw()
        break
      case 'contours':
        let scale = [
          this.objects.scale[0] * this.objects.segScale[0],
          this.objects.scale[1] * this.objects.segScale[1]
        ]
        event.data.contours.forEach(points => {
          points.forEach((p: [number, number]) => {
            p[0] *= scale[0]
            p[1] *= scale[1]
          })
        })

        // this.drawContours(event.data.contours)

        this._annotationPanel?.drawAnnotations(this.objects.boxes,
          this.objects.scores, this.objects.classes,
          this.objects.objNum, this.objects.scale, event.data.contours)
        break
    }
  }

  protected onObjTrackMsg(event: MessageEvent) {
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

  protected onFaceDetectMsg(event: MessageEvent<any>) {
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

  protected onAnimeMsg(event: MessageEvent) {
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

  protected onOcrMsg(event: MessageEvent) {

  }

  protected onStyeTransMsg(event: MessageEvent) {

  }

  public async onDraw(data?: HTMLImageElement | HTMLVideoElement) {
    if (data != null) {
      this.offscreenCtx.drawImage(data, 0, 0, this.offscreenCtx.canvas.width, this.offscreenCtx.canvas.height)
      this._origin = this.offscreenCtx.getImageData(0, 0, this.offscreenCtx.canvas.width, this.offscreenCtx.canvas.height)
    }

    if (this[ProcessorType.cvProcess]) {
      if (this._processed) {
        this.offscreenCtx.putImageData(this._processed, 0, 0)
        this._processed = null
      } else {
        await this.postMessage(ProcessorType.cvProcess, { cmd: ProcessorCMD.process, image: this._origin, })
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
      this.postMessage(ProcessorType.objTrack, { cmd: ProcessorCMD.process, image })
      this.postMessage(ProcessorType.faceDetect, { cmd: ProcessorCMD.process, image })
      this.postMessage(ProcessorType.imgGen, { cmd: ProcessorCMD.process, image })
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
          await this.postMessage(ProcessorType.objTrack, { cmd: ProcessorCMD.process, image }, [image.data.buffer])
          this._frames++
          break
        default:
          this._frames++
          break
      }
    }
  }

  protected async drawMask(): Promise<Array<[number, number, number, number]>> {
    let rects = await super.drawMask()
    await this.postMessage(ProcessorType.cvProcess, { cmd: ProcessorCMD.findContours, masks: this.objects.masks, rects })
    return null
  }

}