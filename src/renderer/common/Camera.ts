import { Face } from "@tensorflow-models/face-landmarks-detection";
import { drawResults, VIDEO_SIZE } from "./DrawUtils";

const CameraOpts = { mimeType: 'video/webm;codecs=vp9' }

export class Camera {
  private video: HTMLVideoElement
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  // private stream: MediaStream

  mediaRecorder: MediaRecorder

  constructor(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
    this.video = video
    this.canvas = canvas
    this.ctx = this.canvas.getContext('2d')
    // this.stream = this.canvas.captureStream()
    // this.mediaRecorder = new MediaRecorder(this.stream, CameraOpts)
  }

  static async setupCamera(video: HTMLVideoElement, canvas: HTMLCanvasElement, params: any) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Browser API navigator.mediaDevices.getUserMedia not available');
    }

    const { targetFPS, sizeOpt } = params
    const size = VIDEO_SIZE[sizeOpt]
    const videoConfig = {
      'audio': false,
      'video': {
        facingMode: 'user',
        width: size.width,
        height: size.height,
        frameRate: { ideal: targetFPS }
      }
    }

    const stream = await navigator.mediaDevices.getUserMedia(videoConfig)
    const camera = new Camera(video, canvas)
    camera.video.srcObject = stream

    await new Promise((resolve) => {
      camera.video.onloadedmetadata = () => {
        resolve(video)
      }
    })

    camera.video.play()

    const videoW = camera.video.videoWidth
    const videoH = camera.video.videoHeight

    camera.canvas.width = videoW
    camera.canvas.height = videoH

    camera.ctx.translate(camera.video.videoWidth, 0)
    camera.ctx.scale(-1, 1)

    return camera
  }

  drawCtx() {
    this.ctx.drawImage(this.video, 0, 0, this.video.videoWidth, this.video.videoHeight)
  }

  drawResult(faces:Face[], triangulateMesh = false, boundingBox = false) {
    drawResults(this.ctx, faces, triangulateMesh, boundingBox)
  }
}