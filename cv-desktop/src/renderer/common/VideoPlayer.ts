import Hls from 'hls.js'
import { ProcessorManager } from './ipc/ProcessorManager'

export class VideoPlayer {
  private hls: Hls

  private preVideo: HTMLVideoElement

  private animationId: number
  private flip: boolean = true

  private _processorMgr: ProcessorManager = null
  set processorMgr(value: ProcessorManager) { this._processorMgr = value }

  private mediaRecorder: MediaRecorder
  private _once = false

  constructor(video: HTMLVideoElement, flip: boolean = true) {
    this.hls = new Hls()
    this.preVideo = video
    this.flip = flip
  }

  async processFrame() {
    if (this.preVideo.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) return

    if (!this._once) {
      this._processorMgr?.updateSize(640, 360)
      this._processorMgr?.flip(this.flip)
      this._once = true
    }

    this._processorMgr?.onDraw(this.preVideo)
    this._processorMgr?.drawFace()
    this._processorMgr?.drawObjects()
  }


  get isOpen(): boolean {
    return this.preVideo.srcObject != null || (this.preVideo.src != '' && this.preVideo.src != null)
  }

  async open(url?: string, flip: boolean = true) {
    this._once = false
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