import Hls from 'hls.js'
import { drawObjectDetectResult, drawTFFaceResult, FaceDetectResult, ObjectDetectResult } from './DrawUtils'
import { ImageProcessor } from './ImageProcessor'

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

  private _trackerWorker: Worker = null
  set trackerWorker(value: Worker) {
    this._trackerWorker = value
  }

  private _enableFace = false
  set enableFace(value: boolean) {
    this._enableFace = value
  }

  private _enableObject = false
  set enableObject(value: boolean) {
    this._enableObject = value
  }

  private _face: FaceDetectResult
  set face(value: FaceDetectResult) {
    this._face = value
  }

  private _objects: ObjectDetectResult
  set objects(value: ObjectDetectResult) {
    this._objects = value
  }

  private _imgProcessor: ImageProcessor = null
  set imgProcessor(value: ImageProcessor) {
    this._imgProcessor = value
  }

  private mediaRecorder: MediaRecorder

  private _faceFrames = 0
  private _objFrames = 0

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
    this._imgProcessor?.process(this.frame)
    this.previewCtx.putImageData(this.frame, 0, 0)

    if (this._faceFrames == 3) {
      if (this._enableFace) this._trackerWorker?.postMessage({ type: 'faceDetect', image: this.frame })
      this._faceFrames = 0
    } else {
      this._faceFrames++
    }

    if (this._objFrames == 5) {
      if (this._enableObject) this._trackerWorker?.postMessage({ type: 'objDetect', image: this.frame })
      this._objFrames = 0
    } else {
      this._objFrames++
    }

    if (this._face && this._face.valid && this._enableFace)
      drawTFFaceResult(this.previewCtx, this._face, 'none', true, true)
    if (this._objects && this._enableObject)
      drawObjectDetectResult(this.previewCtx,
        this._objects.boxes, this._objects.scores, this._objects.classes,
        this._objects.objNum, this._objects.scale)

    this.previewCtx.fillStyle = '#ff4757'
    this.previewCtx.font = '12px Arial'
    this.previewCtx.fillText(`Face: ${this._face ? this._face.expire : '-'}\n 
      Object: ${this._objects ? this._objects.expire : '-'}`, 10, 20)
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