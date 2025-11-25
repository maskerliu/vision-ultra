import { Face, FaceLandmarksDetector } from "@tensorflow-models/face-landmarks-detection"
import * as tf from '@tensorflow/tfjs'
import { showNotify } from "vant"
import { drawCVFaceResult, drawTFFaceResult, getFaceContour, getFaceSlope } from "./DrawUtils"
import { ImageProcessor } from "./ImageProcessor"
import { FaceRec } from "../../common"


export class FaceDetector {
  public faceDetect: boolean = false
  public faceRecMode: '1' | '2' = '2'
  private face: any = null
  private eyes: Array<any> = null
  private landmarks: Array<any> = null
  public dector: FaceLandmarksDetector = null
  private faces: Array<Face> = []

  public imgProcessor: ImageProcessor = null

  public drawFace: boolean = true

  private previewCtx: CanvasRenderingContext2D

  private capture: HTMLCanvasElement
  private captureCtx: CanvasRenderingContext2D

  private masklayer: HTMLCanvasElement
  private masklayerCtx: CanvasRenderingContext2D

  private faceTensor: tf.Tensor = null

  private _enableFaceAngle: boolean = false
  private _faceAngle: number = 0
  private _time = 0

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

  set enableFaceAngle(enable: boolean) {
    this._enableFaceAngle = enable
    this._faceAngle = 0
  }

  get enableFaceAngle() {
    return this._enableFaceAngle
  }

  get faceAngle() {
    return this._faceAngle
  }

  get time() {
    return this._time
  }

  async detect(frame: ImageData) {
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
        let time = Date.now()
        this.faces = await this.dector?.estimateFaces(frame)
        this._time = Date.now() - time
        if (this.drawFace) drawTFFaceResult(this.previewCtx, this.faces, true, true)
        this.calacleFaceAngle()
      }
    }
  }

  async faceRec() {
    let vector = this.genFaceTensor(this.faces[0])
    vector.print()
    let result = await FaceRec.recognize(vector.arraySync())
    vector.dispose()
    console.log(result)
  }

  private calacleFaceAngle() {
    if (!this._enableFaceAngle) {
      this._faceAngle = 0
      return
    }
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


  private genFaceTensor(face: Face) {
    let slope = getFaceSlope(this.faces[0])
    let angle = Math.atan(slope) * 180 / Math.PI
    let tmpAngle = 0
    if (angle > 0) {
      tmpAngle = 90 - angle
    }
    if (angle < 0) {
      tmpAngle = -(90 + angle)
    }

    let cos = Math.cos(tmpAngle)
    let sin = Math.sin(tmpAngle)
    let martix = tf.tensor([[cos, -sin], [sin, cos]])
    let tmp = face.keypoints.map((p) => [p.x - face.box.xMin, p.y - face.box.yMin])
    let tensor = tf.tensor(tmp)
    let min = tensor.min()
    let max = tensor.max()
    tensor = tensor.sub(min).div(max.sub(min)) // normilize
    let result = tf.matMul(tensor, martix)
    tensor.dispose()
    min.dispose()
    max.dispose()
    martix.dispose()
    return result
  }

  async faceCapture(context: CanvasRenderingContext2D, name: string = '') {
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

    let imageData = context.getImageData(this.faces[0].box.xMin, this.faces[0].box.yMin,
      this.faces[0].box.width, this.faces[0].box.height)
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
    this.calacleFaceAngle()
    this.imgProcessor.imgProcessParams['rotate'] = this._faceAngle
    this.imgProcessor?.process(imageData)
    this.captureCtx.putImageData(imageData, 0, 0)
    context.putImageData(imageData, this.faces[0].box.xMin, this.faces[0].box.yMin)
    this.capture.toBlob(async (blob) => {
      try {
        let faceTensor = this.genFaceTensor(this.faces[0])
        await FaceRec.registe(name, faceTensor.arraySync(), new File([blob], 'avatar.png', { type: 'image/png' }))
        showNotify({ type: 'success', message: '人脸采集成功', duration: 500 })
        faceTensor.dispose()
      } catch (err) {
        showNotify({ type: 'warning', message: '保存失败', duration: 500 })
      }
      // if (!__IS_WEB__) {
      //   window.mainApi?.saveFile('保存图片', `/static/face/face-${new Date().getTime()}.png`, buffer, true)
      // } else {
      //   showNotify({ type: 'warning', message: '图片已保存到剪贴板', duration: 500 })
      // }
      this.captureCtx.clearRect(0, 0, this.capture.width, this.capture.height)
    }, 'image/png')
  }
}