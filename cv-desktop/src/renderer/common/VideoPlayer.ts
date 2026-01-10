import Hls from 'hls.js'
import { drawObjectDetectResult, drawTFFaceResult, } from './DrawUtils'
import { WorkerManager, WorkerType } from './WorkerManager'
import { WorkerCMD } from './misc'

export class VideoPlayer {
  private hls: Hls

  private preVideo: HTMLVideoElement

  private preview: HTMLCanvasElement
  private previewCtx: CanvasRenderingContext2D

  private offscreen: HTMLCanvasElement
  private offscreenCtx: CanvasRenderingContext2D

  private captureCtx: CanvasRenderingContext2D

  private animationId: number
  private flip: boolean = true
  private frame: ImageData

  private _workerMgr: WorkerManager = null
  set workerMgr(value: WorkerManager) {
    this._workerMgr = value
  }

  private mediaRecorder: MediaRecorder

  private _frames = 0

  constructor(video: HTMLVideoElement,
    priview: HTMLCanvasElement,
    offscreen: HTMLCanvasElement,
    capture: HTMLCanvasElement,
    flip: boolean = true) {
    this.hls = new Hls()

    this.preVideo = video
    this.preview = priview
    this.offscreen = offscreen

    this.previewCtx = this.preview.getContext('2d', { willReadFrequently: true })
    this.offscreenCtx = this.offscreen.getContext('2d', { willReadFrequently: true })
    this.captureCtx = capture.getContext('2d', { willReadFrequently: true })

    this.previewCtx.imageSmoothingEnabled = true
    this.previewCtx.imageSmoothingQuality = 'high'

    this.flip = flip
  }

  async processFrame() {
    if (this.preVideo.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) return

    this.offscreen.width = this.preview.width = this.preVideo.videoWidth
    this.offscreen.height = this.preview.height = this.preVideo.videoHeight

    if (this.frame == null ||
      this.frame.width != this.offscreen.width ||
      this.frame.height != this.offscreen.height) {
      this.frame = new ImageData(this.offscreen.width, this.offscreen.height)
    }

    if (this.flip) {
      this.offscreenCtx.scale(-1, 1)
      this.offscreenCtx.translate(-this.offscreen.width, 0)
    }

    this.offscreenCtx.drawImage(this.preVideo, 0, 0, this.offscreen.width, this.offscreen.height)
    this.frame.data.set(this.offscreenCtx.getImageData(0, 0, this.offscreen.width, this.offscreen.height).data)
    // this._imgProcessor?.process(this.frame)

    this._workerMgr?.postMessage(WorkerType.cvProcess,
      { cmd: WorkerCMD.process, image: this.frame },
      [this.frame.data.buffer])
    this.previewCtx.putImageData(this.frame, 0, 0)

    if (this._frames == 6) {
      this._workerMgr?.postMessage(WorkerType.objDetect,
        { cmd: WorkerCMD.process, image: this.frame },
        [this.frame.data.buffer])
      this._workerMgr?.postMessage(WorkerType.faceDetect,
        { cmd: WorkerCMD.process, image: this.frame },
        [this.frame.data.buffer])
      this._frames = 0
    } else if (this._frames == 3) {
      this._workerMgr?.postMessage(WorkerType.faceDetect,
        { cmd: WorkerCMD.process, image: this.frame },
        [this.frame.data.buffer])
    } else {
      this._frames++
    }

    drawTFFaceResult(this.previewCtx, this._workerMgr.face, 'none', true, true)

    drawObjectDetectResult(this.previewCtx, this._workerMgr.objects.boxes,
      this._workerMgr.objects.scores, this._workerMgr.objects.classes,
      this._workerMgr.objects.objNum, this._workerMgr.objects.scale)

    this.previewCtx.fillStyle = '#ff4757'
    this.previewCtx.font = '12px Arial'
    this.previewCtx.fillText(`Face: ${this._workerMgr.face ? this._workerMgr.face.expire : '-'}\n 
      Object: ${this._workerMgr.objects ? this._workerMgr.objects.expire : '-'}`, 10, 20)
  }


  get isOpen(): boolean {
    return this.preVideo.srcObject != null || (this.preVideo.src != '' && this.preVideo.src != null)
  }

  async open(url?: string, flip: boolean = true) {
    if (this.preVideo.srcObject && url == null) {
      this.close()
      this.preVideo.srcObject = null
      return
    }

    try {
      if (url == null) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        this.preVideo.srcObject = stream
        this.flip = flip
      } else {
        this.preVideo.srcObject = null
        this.close()

        if (url.endsWith('.m3u8') && Hls.isSupported()) {
          this.hls.loadSource(url)
          this.hls.attachMedia(this.preVideo)
          this.flip = false
          this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
            this.preVideo.play()
          })
        }

        if (url.endsWith('.mp4')) {
          this.preVideo.src = url
          this.preVideo.play()
        }
      }
      var loop = () => {
        this.processFrame()
        this.animationId = requestAnimationFrame(loop)
      }
      this.animationId = requestAnimationFrame(loop)
    } catch (e) {
      console.error(e)
    }
  }

  close() {
    if (this.animationId) cancelAnimationFrame(this.animationId)
    if (this.preVideo.srcObject) {
      (this.preVideo.srcObject as MediaStream).getTracks().forEach(track => track.stop())
    }

    // this.offscreenCtx.clearRect(0, 0, this.offscreen.width, this.offscreen.height)
    // this.previewCtx.clearRect(0, 0, this.preview.width, this.preview.height)
  }
}