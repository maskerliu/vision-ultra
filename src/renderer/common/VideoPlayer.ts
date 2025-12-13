import { drawCVObjectTrack, drawObjectDetectResult } from './DrawUtils'
import { FaceDetector } from './FaceDetector'
import { ImageProcessor } from './ImageProcessor'
import Hls from 'hls.js'
import { MAX_OBJECTS_NUM, ObjectTracker } from './ObjectTracker'
import { ObjectDetector } from '@mediapipe/tasks-vision'
import { webworker } from 'webpack'

export class VideoPlayer {
  private hls: Hls

  private preVideo: HTMLVideoElement

  private preview: HTMLCanvasElement
  private previewCtx: CanvasRenderingContext2D

  private offscreen: HTMLCanvasElement
  private offscreenCtx: CanvasRenderingContext2D

  private animationId: number
  private flip: boolean = true
  private frame: ImageData

  private _imgProcessor: ImageProcessor = null
  set imgProcessor(value: ImageProcessor) {
    this._imgProcessor = value
  }

  private _faceDetector: FaceDetector = null
  set faceDetector(value: FaceDetector) {
    this._faceDetector = value
  }

  public objDetector: ObjectDetector = null

  public _objTracker: Worker = null

  private objBoxes: Float32Array = new Float32Array(MAX_OBJECTS_NUM * 4)
  private objScores: Float16Array = new Float16Array(MAX_OBJECTS_NUM)
  private objClasses: Uint8Array = new Uint8Array(MAX_OBJECTS_NUM)
  private objNum: number = 0
  private objScale: number[] = [1, 1]

  set objTracker(value: Worker) {
    this._objTracker = value

    this._objTracker.addEventListener("message", (event) => {
      this.objBoxes.set(event.data.boxes)
      this.objScores.set(event.data.scores)
      this.objClasses.set(event.data.classes)
      this.objNum = event.data.objNum
      this.objScale = [event.data.scaleX, event.data.scaleY]

      drawObjectDetectResult(this.previewCtx,
        event.data.boxes, event.data.scores, event.data.classes,
        event.data.objNum, [event.data.scaleX, event.data.scaleY])
    })
  }

  private mediaRecorder: MediaRecorder

  private _faceFrames = 0
  private _objFrames = 0
  private _step = 0

  constructor(video: HTMLVideoElement, priview: HTMLCanvasElement, offscreen: HTMLCanvasElement, flip: boolean = true) {
    this.hls = new Hls()

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
    this._imgProcessor?.process(this.frame)
    this.previewCtx.putImageData(this.frame, 0, 0)

    if (this._faceFrames == 2) {
      await this._faceDetector.detect(this.frame)
      this._faceFrames = 0
    } else {
      this._faceFrames++
    }

    if (this._objFrames == 25) {
      this._objTracker?.postMessage({ type: 'detect', image: this.frame })
      this._objFrames = 0
    } else {
      this._objFrames++
    }

    this._faceDetector?.updateUI()
    drawObjectDetectResult(this.previewCtx,
      this.objBoxes, this.objScores, this.objClasses,
      this.objNum, this.objScale as any)

    this.previewCtx.fillStyle = '#ff4757'
    this.previewCtx.font = '12px Arial'
    this.previewCtx.fillText(`Slope: ${this._faceDetector.faceAngle}\n Time: ${this._faceDetector.expire}`, 10, 20)

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