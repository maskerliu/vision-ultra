import { Face, FaceLandmarksDetector } from '@tensorflow-models/face-landmarks-detection'
import { Point2, Rect } from "@u4/opencv4nodejs"
import { showNotify } from "vant"
import { imgProcess } from "./CVApi"
import { drawCVFaceResult, drawTFFaceResult, getFaceContour, getFaceGradient } from "./DrawUtils"

const CameraOpts = { mimeType: 'video/webm;codecs=vp9' }

export class Camera {

  private preVideo: HTMLVideoElement

  private preview: HTMLCanvasElement
  private previewCtx: CanvasRenderingContext2D

  private offscreen: HTMLCanvasElement
  private offscreenCtx: CanvasRenderingContext2D

  private capture: HTMLCanvasElement
  private captureCtx: CanvasRenderingContext2D

  private masklayer: HTMLCanvasElement
  private masklayerCtx: CanvasRenderingContext2D

  private animationId: number
  private flip: boolean = true
  private frame: ImageData

  public imgEnhance: boolean = false
  public imgProcessMode: '1' | '2' | '3' = '1'
  public imgProcessParams: any = {}
  mediaRecorder: MediaRecorder

  public faceDetect: boolean = false
  public faceRecMode: '1' | '2' = '2'
  private frames = 0
  private face: Rect = null
  private eyes: Array<Rect> = null
  private landmarks: Array<Point2> = null
  public faceDector: FaceLandmarksDetector = null
  private faces: Array<Face> = []

  constructor(video: HTMLVideoElement, priview: HTMLCanvasElement, offscreen: HTMLCanvasElement,
    capture: HTMLCanvasElement, masklayer: HTMLCanvasElement, flip: boolean = true) {
    this.preVideo = video
    this.preview = priview
    this.offscreen = offscreen
    this.capture = capture
    this.masklayer = masklayer

    this.previewCtx = this.preview.getContext('2d', { willReadFrequently: true })
    this.offscreenCtx = this.offscreen.getContext('2d', { willReadFrequently: true })
    this.captureCtx = this.capture.getContext('2d', { willReadFrequently: true })
    this.masklayerCtx = this.masklayer.getContext('2d', { willReadFrequently: true })

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
    // this.frame.data = this.offscreenCtx.getImageData(0, 0, this.offscreen.width, this.offscreen.height).data
    this.processImage(this.frame)
    // if (visionStore.faceDetect) {
    //   await faceDect(frame)
    // } else {
    //   faces = eyes = landmarks = face = null
    // }

    this.offscreenCtx.putImageData(this.frame, 0, 0)
    this.previewCtx.drawImage(this.offscreen,
      0, 0, this.frame.width, this.frame.height,
      0, 0, this.frame.width, this.frame.height)

    this.faceDect()
  }

  async openCamera() {
    if (__IS_WEB__) return

    if (this.preVideo.srcObject) {
      this.previewCtx.clearRect(0, 0, this.preview.width, this.preview.height)
      this.offscreenCtx.clearRect(0, 0, this.offscreen.width, this.offscreen.height)
      this.closeCamera()
      this.preVideo.srcObject = null
      return
    }

    // faceDector.reset()

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

  closeCamera() {
    if (this.animationId) cancelAnimationFrame(this.animationId)
    if (this.preVideo.srcObject) {
      (this.preVideo.srcObject as MediaStream).getTracks().forEach(track => track.stop())
    }

    this.offscreenCtx.clearRect(0, 0, this.offscreen.width, this.offscreen.height)
    this.previewCtx.clearRect(0, 0, this.preview.width, this.preview.height)
  }

  private processImage(image: ImageData) {
    if (!this.imgEnhance) return

    switch (this.imgProcessMode) {
      case '1': {
        imgProcess(image, image.width, image.height, this.imgProcessParams)
        break
      }
      case '2': {
        let data = window.cvWasmApi?.imgProcess(image, image.width, image.height, this.imgProcessParams)
        for (let i = 0; i < data?.length; i++)
          image.data[i] = data[i]
        break
      }
      case '3': {
        let data = window.cvNativeApi?.imgProcess(image, image.width, image.height, this.imgProcessParams)
        for (let i = 0; i < data?.length; i++)
          image.data[i] = data[i]
        break
      }
    }
  }

  private async faceDect() {
    // if (this.frames < 3) {
    //   this.frames++
    //   return
    // }



    this.frames = 0

    if (!this.faceDetect) {
      this.faces = this.eyes = this.landmarks = this.face = null
      return
    }

    switch (this.faceRecMode) {
      case '1': {
        const result = window.cvNativeApi.faceRecognize(this.frame, this.frame.width, this.frame.height)
        this.face = result?.face
        this.eyes = result?.eyes
        this.landmarks = result?.landmarks
        drawCVFaceResult(this.previewCtx, this.face, this.eyes, this.landmarks)
        break
      }
      case '2': {
        // if (this.faceDector == null) {
        //   this.faceDector = await createDetector(SupportedModels.MediaPipeFaceMesh, {
        //     runtime: 'mediapipe',
        //     solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@${VERSION}`,
        //     refineLandmarks: true,
        //     maxFaces: 1
        //   })
        // }
        this.faces = await this.faceDector?.estimateFaces(this.frame)
        drawTFFaceResult(this.previewCtx, this.faces, true, true)
        break
      }
    }
  }

  faceCapture() {
    if (__IS_WEB__) return
    if (this.faces == null || this.faces.length == 0) {
      showNotify({ type: 'warning', message: '未检测到人脸...', duration: 500 })
      return
    }

    let path = getFaceContour(this.faces[0])
    this.captureCtx.clearRect(0, 0, this.capture.width, this.capture.height)
    this.masklayerCtx.clearRect(0, 0, this.masklayer.width, this.masklayer.height)
    this.capture.width = this.faces[0].box.width
    this.capture.height = this.faces[0].box.height
    this.masklayer.width = this.faces[0].box.width
    this.masklayer.height = this.faces[0].box.height

    let eyes = getFaceGradient(this.faces[0])
    console.log(eyes)

    let imageData = this.offscreenCtx.getImageData(this.faces[0].box.xMin, this.faces[0].box.yMin,
      this.faces[0].box.width, this.faces[0].box.height)

    // const { data, width, height } = window.cvApi.imgProcess(imageData, imageData.width, imageData.height, {
    //   isGray: visionStore.isGray,
    //   contrast: visionStore.contrast,
    //   brightness: visionStore.brightness,
    //   laplace: visionStore.laplace,
    //   enhance: visionStore.enhance
    // })
    // imageData = new ImageData(data as ImageDataArray, width, height)
    this.captureCtx.putImageData(imageData, 0, 0)
    this.masklayerCtx.beginPath()
    for (let i = 1; i < path.length; i++) {
      this.masklayerCtx.lineTo(path[i][0], path[i][1])
    }
    this.masklayerCtx.fillStyle = 'white'
    this.masklayerCtx.fill()
    let maskImgData = this.masklayerCtx.getImageData(0, 0, this.masklayer.width, this.masklayer.height)
    for (let i = 0; i < maskImgData.data.length; i += 4) {
      if (maskImgData.data[i + 3] == 0) {
        maskImgData.data[i + 3] = 255
      } else {
        maskImgData.data[i + 3] = 0
      }
    }

    for (let i = 0; i < imageData.data.length; i += 4) {
      if (maskImgData.data[i + 3] == 255) {
        imageData.data[i + 3] = 0
      }
    }
    this.captureCtx.putImageData(imageData, 0, 0)

    this.capture.toBlob(async (blob) => {
      let buffer = await blob.arrayBuffer()
      window.mainApi.saveFile('保存图片', `face-${new Date().getTime()}.png`, buffer, true)
      this.captureCtx.clearRect(0, 0, this.capture.width, this.capture.height)
    }, 'image/png')
  }
}