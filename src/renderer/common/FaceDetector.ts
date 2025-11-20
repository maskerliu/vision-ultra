import { Face, FaceLandmarksDetector } from "@tensorflow-models/face-landmarks-detection"
import { drawCVFaceResult, drawTFFaceResult, getFaceContour, getFaceSlope } from "./DrawUtils"
import { showNotify } from "vant"
import * as tf from '@tensorflow/tfjs'


export class FaceDetector {
  public faceDetect: boolean = false
  public faceRecMode: '1' | '2' = '2'
  private frames = 0
  private face: any = null
  private eyes: Array<any> = null
  private landmarks: Array<any> = null
  public dector: FaceLandmarksDetector = null
  private faces: Array<Face> = []

  public drawFace: boolean = true

  private previewCtx: CanvasRenderingContext2D

  private capture: HTMLCanvasElement
  private captureCtx: CanvasRenderingContext2D

  private masklayer: HTMLCanvasElement
  private masklayerCtx: CanvasRenderingContext2D

  private faceTensor: tf.Tensor = null

  private _faceAngle: number = 0

  constructor(context: CanvasRenderingContext2D, capture: HTMLCanvasElement, masklayer: HTMLCanvasElement) {
    this.previewCtx = context
    this.capture = capture
    this.masklayer = masklayer

    this.captureCtx = this.capture.getContext('2d', { willReadFrequently: true })
    this.masklayerCtx = this.masklayer.getContext('2d', { willReadFrequently: true })

  }

  reset() {
    this.dector?.reset()
    this.faces = this.eyes = this.landmarks = this.face = null
  }

  get faceAngle() {
    return this._faceAngle
  }

  async detect(frame: ImageData) {
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
        const result = window.cvNativeApi?.faceRecognize(frame, frame.width, frame.height)
        this.face = result?.face
        this.eyes = result?.eyes
        this.landmarks = result?.landmarks
        if (this.drawFace) drawCVFaceResult(this.previewCtx, this.face, this.eyes, this.landmarks)
        break
      }
      case '2': {
        this.faces = await this.dector?.estimateFaces(frame)
        if (this.drawFace) drawTFFaceResult(this.previewCtx, this.faces, true, true)
        console.log(this.faces[0].keypoints.length)
        let slope = getFaceSlope(this.faces[0])
        let angle = Math.atan(slope) * 180 / Math.PI
        let tmpAngle = 0
        if (angle > 0) {
          tmpAngle = 90 - angle
        }
        if (angle < 0) {
          tmpAngle = -(90 + angle)
        }

        if (Math.abs(tmpAngle - this._faceAngle) > 20 && Math.abs(tmpAngle) > 5) {
          this._faceAngle = tmpAngle
        }
      }
    }
  }

  async faceCapture(context: CanvasRenderingContext2D) {
    if (__IS_WEB__) return
    if (this.faces == null || this.faces.length == 0) {
      showNotify({ type: 'warning', message: '未检测到人脸...', duration: 500 })
      return
    }

    let face = this.faces[0].keypoints.map((p) => [p.x - this.faces[0].box.xMin, p.y - this.faces[0].box.yMin])
    let tensor = tf.tensor(face)
    tensor = tensor.sub(tensor.min()).div(tensor.max().sub(tensor.min()))
    if (this.faceTensor == null) {
      this.faceTensor = tensor
    } else {
      let diff = this.faceTensor.squaredDifference(tensor)
      let distance = diff.sum().sqrt()
      distance.print()
      distance.dispose()
      // let similarity = this.faceTensor.dot(tensor).div(this.faceTensor.norm(2).mul(tensor.norm(2)))
      // similarity.print()
      // similarity.dispose()

      this.faceTensor.dispose()
      this.faceTensor = tensor
    }



    let path = getFaceContour(this.faces[0])
    this.captureCtx.clearRect(0, 0, this.capture.width, this.capture.height)
    this.masklayerCtx.clearRect(0, 0, this.masklayer.width, this.masklayer.height)
    this.capture.width = this.faces[0].box.width
    this.capture.height = this.faces[0].box.height
    this.masklayer.width = this.faces[0].box.width
    this.masklayer.height = this.faces[0].box.height

    let eyes = getFaceSlope(this.faces[0])
    let imageData = context.getImageData(this.faces[0].box.xMin, this.faces[0].box.yMin,
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
    this.captureCtx.translate(this.capture.width / 2, this.capture.height / 2)

    this.captureCtx.putImageData(imageData, 0, 0)
    this.capture.toBlob(async (blob) => {
      let buffer = await blob.arrayBuffer()
      // window.mainApi.saveFile('保存图片', `face-${new Date().getTime()}.png`, buffer, true)
      if (!__IS_WEB__) {
        window.mainApi?.saveFile('保存图片', `face-${new Date().getTime()}.png`, buffer, true)
      } else {
        showNotify({ type: 'warning', message: '图片已保存到剪贴板', duration: 500 })
      }
      this.captureCtx.clearRect(0, 0, this.capture.width, this.capture.height)
    }, 'image/png')
  }
}