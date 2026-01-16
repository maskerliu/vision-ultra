import Hls from 'hls.js'
import { WorkerManager, WorkerType } from './WorkerManager'
import { WorkerCMD } from './misc'

export class VideoPlayer {
  private hls: Hls

  private preVideo: HTMLVideoElement

  // private preview: HTMLCanvasElement
  private previewCtx: CanvasRenderingContext2D

  // private offscreen: HTMLCanvasElement
  private offscreenCtx: CanvasRenderingContext2D
  private captureCtx: CanvasRenderingContext2D

  private animationId: number
  private flip: boolean = true
  private frame: ImageData

  private _workerMgr: WorkerManager = null
  set workerMgr(value: WorkerManager) { this._workerMgr = value }

  private mediaRecorder: MediaRecorder

  private _frames = 1

  constructor(video: HTMLVideoElement,
    preview: HTMLCanvasElement,
    offscreen: HTMLCanvasElement,
    capture: HTMLCanvasElement,
    flip: boolean = true) {
    this.hls = new Hls()

    this.preVideo = video
    // this.preview = priview
    // this.offscreen = offscreen

    this.previewCtx = preview.getContext('2d', { willReadFrequently: true })
    this.offscreenCtx = offscreen.getContext('2d', { willReadFrequently: true })
    this.captureCtx = capture.getContext('2d', { willReadFrequently: true })

    this.previewCtx.imageSmoothingEnabled = true
    this.previewCtx.imageSmoothingQuality = 'high'

    this.flip = flip
  }

  async processFrame() {
    if (this.preVideo.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) return

    this.offscreenCtx.canvas.width = this.previewCtx.canvas.width = this.preVideo.videoWidth
    this.offscreenCtx.canvas.height = this.previewCtx.canvas.height = this.preVideo.videoHeight

    if (this.frame == null ||
      this.frame.width != this.offscreenCtx.canvas.width ||
      this.frame.height != this.offscreenCtx.canvas.height) {
      this.frame = new ImageData(this.offscreenCtx.canvas.width, this.offscreenCtx.canvas.height)
    }

    if (this.flip) {
      this.offscreenCtx.scale(-1, 1)
      this.offscreenCtx.translate(-this.offscreenCtx.canvas.width, 0)
    }

    this.offscreenCtx.drawImage(this.preVideo, 0, 0, this.offscreenCtx.canvas.width, this.offscreenCtx.canvas.height)
    let data = this.offscreenCtx.getImageData(0, 0, this.offscreenCtx.canvas.width, this.offscreenCtx.canvas.height)

    if (this._workerMgr.enableCVProcess) {
      this._workerMgr?.postMessage(WorkerType.cvProcess,
        { cmd: WorkerCMD.process, image: data }, [data.data.buffer])

      this._workerMgr.onDraw()
    } else {
      this.previewCtx.drawImage(this.offscreenCtx.canvas, 0, 0)

      if (this._frames == 8) {
        this._workerMgr?.postMessage(WorkerType.faceDetect,
          { cmd: WorkerCMD.process, image: data }, [data.data.buffer])
        this._frames = 1
      } else {
        if (this._frames == 4) {
          this._workerMgr?.postMessage(WorkerType.faceDetect,
            { cmd: WorkerCMD.process, image: data }, [data.data.buffer])
        }

        if (this._frames == 5) {
          this._workerMgr?.postMessage(WorkerType.objDetect,
            { cmd: WorkerCMD.process, image: data }, [data.data.buffer])
        }
        this._frames++
      }
    }

    this._workerMgr.drawFace()
    this._workerMgr.drawObjects()

    this.previewCtx.fillStyle = '#ff4757'
    this.previewCtx.font = '24px Arial'
    this.previewCtx.fillText(`Face: ${this._workerMgr.face ? this._workerMgr.face.expire : '-'}ms\n 
      Object: ${this._workerMgr.objects ? this._workerMgr.objects.expire : '-'}ms`, 20, 20)
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
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { min: 720, ideal: 1280, max: 1920 },
            height: { min: 776, ideal: 720, max: 1080 }
          }
        })
        this.preVideo.srcObject = stream
        this.flip = flip
      } else {
        this.preVideo.srcObject = null
        this.close()

        if (url.endsWith('.m3u8') && Hls.isSupported()) {
          this.hls.loadSource(url)
          this.hls.attachMedia(this.preVideo)
          this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
            var variants = this.hls.levels // 获取所有变体（质量等级）信息
            variants.forEach(function (variant) {
              console.log('Variant:', variant)
              console.log('Bitrate:', variant.bitrate) // 打印每个变体的码率
            })
          })
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
  }
}