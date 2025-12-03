import { FaceDetector } from './FaceDetector'
import { ImageProcessor } from './ImageProcessor'


export class Camera {

  private preVideo: HTMLVideoElement

  private preview: HTMLCanvasElement
  private previewCtx: CanvasRenderingContext2D

  private offscreen: HTMLCanvasElement
  private offscreenCtx: CanvasRenderingContext2D

  private animationId: number
  private flip: boolean = true
  private frame: ImageData

  public imgProcessor: ImageProcessor = null
  public faceDetector: FaceDetector = null
  private mediaRecorder: MediaRecorder

  private _frames = 0
  private _step = 0
  // private face: Rect = null
  // private eyes: Array<Rect> = null
  // private landmarks: Array<Point2> = null
  // public faceDector: FaceLandmarksDetector = null
  // private faces: Array<Face> = []

  constructor(video: HTMLVideoElement, priview: HTMLCanvasElement, offscreen: HTMLCanvasElement, flip: boolean = true) {
    this.preVideo = video
    this.preview = priview
    this.offscreen = offscreen

    this.previewCtx = this.preview.getContext('2d', { willReadFrequently: true })
    this.offscreenCtx = this.offscreen.getContext('2d', { willReadFrequently: true })

    this.previewCtx.imageSmoothingEnabled = true
    this.previewCtx.imageSmoothingQuality = 'high'

    this.flip = flip
  }

  async processFrame() {
    if (this.preVideo.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) return

    this.offscreen.width = this.preview.width = this.preVideo.videoWidth
    this.offscreen.height = this.preview.height = this.preVideo.videoHeight

    if (this.frame == null || this.frame.width != this.offscreen.width || this.frame.height != this.offscreen.height) {
      this.frame = new ImageData(this.offscreen.width, this.offscreen.height)
    }

    if (this.flip) {
      this.offscreenCtx.scale(-1, 1)
      this.offscreenCtx.translate(-this.offscreen.width, 0)
    }

    this.offscreenCtx.drawImage(this.preVideo, 0, 0, this.offscreen.width, this.offscreen.height)
    this.frame.data.set(this.offscreenCtx.getImageData(0, 0, this.offscreen.width, this.offscreen.height).data)
    this.imgProcessor?.process(this.frame)
    this.offscreenCtx.putImageData(this.frame, 0, 0)
    this.previewCtx.drawImage(this.offscreen,
      0, 0, this.frame.width, this.frame.height,
      0, 0, this.frame.width, this.frame.height)

    if (this._frames == 2) {
      await this.faceDetector.detect(this.frame)
      this._frames = 0
    } else {
      this._frames++
    }

    this.faceDetector.updateUI()

    this.previewCtx.fillStyle = '#ff4757'
    this.previewCtx.font = '14px sans-serif'
    this.previewCtx.fillText(`Slope: ${this.faceDetector.faceAngle}\n Time: ${this.faceDetector.time}`, 10, 20)

    // if (Math.abs(this.faceDetector.faceAngle) > 5) {
    //   this.faceDetector.enableFaceAngle = false
    //   let size = Math.floor(500 / this.faceDetector.time)
    //   this._step = this.faceDetector.faceAngle / 15
    //   this._frames = 15
    // }

    // if (this._frames > 0) {
    //   this._frames--
    //   this.imgProcessor.imgProcessParams['rotate'] = this._step * (15 - this._frames)
    // } else {
    //   this.faceDetector.enableFaceAngle = true
    //   this._step = 0
    //   this._frames = 0
    // }
  }


  get isOpen(): boolean {
    return this.preVideo.srcObject != null
  }

  async open() {
    if (this.preVideo.srcObject) {
      this.close()
      this.preVideo.srcObject = null
      return
    }

    // this.faceDetector?.reset()

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      this.preVideo.srcObject = stream
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