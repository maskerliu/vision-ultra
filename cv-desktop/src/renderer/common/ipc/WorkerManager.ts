
import Tesseract, { OEM } from 'tesseract.js'
import { CVMsg, FaceDetectMsg, ImgGenMsg, ObjTrackMsg, OCRMsg, ProcessorCMD, StyleTransMsg } from '../../../shared'
import AnimeGenWoker from './animeGen.worker?worker'
import CVProcessWorker from './cvProcess.worker?worker'
import FaceDetectWorker from './faceDetect.worker?worker'
import ObjDetectWorker from './objTrack.worker?worker'
import OcrWorker from './ocr.worker?worker'
import { DrawMode, ProcessorManager, ProcessorType } from './ProcessorManager'
import StyleTransWorker from './styleTrans.worker?worker'

// use cv & tfjs in browser env
export class WorkerManager extends ProcessorManager {

  private tessWorker: Tesseract.Worker | null = null

  protected async register(target: ProcessorType, data?: any) {
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
      case ProcessorType.animeGen:
        processor = new AnimeGenWoker()
        break
      case ProcessorType.ocr:
        console.log(data)
        let info = JSON.parse(data.model)
        if (info.name == 'tesseract') {
          this.tessWorker = await Tesseract.createWorker("eng", OEM.LSTM_ONLY, {
            corePath: '../../../../node_modules/tesseract.js-core',
            workerPath: "../../node_modules/tesseract.js/dist/worker.min.js",
          })

          let result = await this.tessWorker.recognize('https://tesseract.projectnaptha.com/img/eng_bw.png', {

          })
          console.log(result)
        } else {
          processor = new OcrWorker()
        }
        break
      case ProcessorType.styleTrans:
        processor = new StyleTransWorker()
        break
    }

    processor?.addEventListener('message', this[`on${target}Msg`].bind(this))
    this.processors.set(target, processor)

    if (data != null) this.postMessage(target, data)
  }

  public async postMessage(
    target: ProcessorType,
    data: CVMsg | ObjTrackMsg | FaceDetectMsg | ImgGenMsg | OCRMsg | StyleTransMsg,
    transfer?: Transferable[]) {

    // console.log(`[main] ${target}`, data)
    if (!this[target]) return

    if (data.cmd == ProcessorCMD.process &&
      (target == ProcessorType.faceDetect || target == ProcessorType.cvProcess)) {
      this._processorStatus.showLoading = false
    } else if (data.cmd == ProcessorCMD.updateOptions) {
      this._processorStatus.showLoading = false
    } else {
      this._processorStatus.showLoading = true
    }

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
      case 'segment':
        this._objects = event.data
        this._annotationPanel?.drawAnnotations(this.objects.boxes,
          this.objects.scores, this.objects.classes,
          this.objects.objNum, this.objects.scale)

        console.log(event.data)
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

  protected onOcrMsg(event: MessageEvent) {
    this._processorStatus.showLoading = false
    this._processorStatus.showProcess = false


  }

  protected onAnimeGenMsg(event: MessageEvent) {
    this._processorStatus.showLoading = false
    this._processorStatus.showProcess = false

    switch (event.data.type) {
      case 'generated':
        let imageData = new ImageData(event.data.width, event.data.height)
        imageData.data.set(event.data.image)
        let offscreen = new OffscreenCanvas(imageData.width, imageData.height)
        let offscreenCtx = offscreen.getContext('2d')
        offscreenCtx.putImageData(imageData, 0, 0)
        this.previewCtx.save()
        this.previewCtx.scale(1.5, 1.5)
        this.previewCtx.drawImage(offscreen, 0, 0)
        this.previewCtx.restore()
        break
    }
  }

  protected onStyleTransMsg(event: MessageEvent) {
    this._processorStatus.showLoading = false
    this._processorStatus.showProcess = false
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
      this.postMessage(ProcessorType.ocr, { cmd: ProcessorCMD.process, image })
      this.postMessage(ProcessorType.animeGen, { cmd: ProcessorCMD.process, image })
      this.postMessage(ProcessorType.styleTrans, { cmd: ProcessorCMD.process, image })
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