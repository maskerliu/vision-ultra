import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision"
import { showNotify } from "vant"
import { baseDomain, FaceRec } from "../../common"
import { drawCVFaceResult, drawTFFaceResult, FACE_DIMS, FaceResult, getFaceContour, getFaceSlope, landmarksToFace, NUM_KEYPOINTS } from "./DrawUtils"
import { ImageProcessor } from "./ImageProcessor"


export class FaceDetector {
  private faceLandmarker: FaceLandmarker = null
  public _enable: boolean = false
  set enable(val: boolean) {
    this._enable = val
  }

  private _faceRecMode: 'opencv' | 'tfjs' = 'tfjs' // opencv or tfjs
  set faceRecMode(val: 'opencv' | 'tfjs') {
    this._faceRecMode = val
  }
  private face: FaceResult = null

  private _drawFace: boolean = true

  set drawFace(val: boolean) {
    this._drawFace = val
  }

  private _drawEigen: boolean = true
  set drawEigen(val: boolean) {
    this._drawEigen = val
  }

  private previewCtx: CanvasRenderingContext2D

  private capture: HTMLCanvasElement
  private captureCtx: CanvasRenderingContext2D

  private masklayer: HTMLCanvasElement
  private masklayerCtx: CanvasRenderingContext2D

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

  async init() {
    if (!this._enable) return
    this.face = {
      landmarks: new Float16Array(NUM_KEYPOINTS * FACE_DIMS),
      box: { xMin: 0, yMin: 0, xMax: 0, yMax: 0, width: 0, height: 0 },
      valid: false
    }

    const filesetResolver = await FilesetResolver.forVisionTasks(
      __DEV__ ? 'node_modules/@mediapipe/tasks-vision/wasm' : baseDomain() + '/static/tasks-vision/wasm')
    this.faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: `${__DEV__ ? '' : baseDomain()}/static/face_landmarker.task`,
        delegate: 'GPU'
      },
      numFaces: 1,
      outputFaceBlendshapes: true
    })
  }

  dispose() {
    if (this.face) this.face.valid = false
    // this.faceLandmarker?.close()
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


  updateUI() {
    if (!this.face?.valid || !this._enable) return

    drawTFFaceResult(this.previewCtx, this.face, 'none', this._drawFace, true)

    if (this._drawEigen) {
      this.captureCtx.clearRect(0, 0, this.capture.width, this.capture.height)
      drawTFFaceResult(this.captureCtx, this.face, 'mesh', false, false, this.capture.height)
    }
  }


  async detect(frame: ImageData) {
    if (!this._enable) {
      if (this.face) this.face.valid = false
      return
    }

    switch (this._faceRecMode) {
      case 'opencv': {
        const result = window.cvNativeApi?.faceRecognize(frame, frame.width, frame.height)
        this.face = result?.face
        // if (this.drawFace) drawCVFaceResult(this.previewCtx, this.face, this.eyes, this.landmarks)
        break
      }
      case 'tfjs': {
        let time = Date.now()
        let result = this.faceLandmarker?.detect(frame)
        landmarksToFace(result?.faceLandmarks[0], this.face, frame.width, frame.height)
        this._time = Date.now() - time
        this.calacleFaceAngle()
        break
      }
    }
  }

  async faceRec() {

    // let vector = this.genFaceTensor(this.faces[0])
    // this.capture.width = this.faces[0].box.width
    // this.capture.height = this.faces[0].box.height
    // await drawTFEigenFace(this.captureCtx, vector)
    // try {
    //   let result = await FaceRec.recognize(vector.arraySync())
    //   return result
    // } catch (e) {
    //   showNotify({ type: 'warning', message: '人脸识别失败...', duration: 500 })
    // } finally {
    //   vector?.dispose()
    // }
    return null
  }

  private calacleFaceAngle() {
    if (!this._enableFaceAngle) {
      this._faceAngle = 0
      return
    }
    let slope = getFaceSlope(this.face)
    let angle = Math.atan(slope) * 180 / Math.PI
    let tmpAngle = 0
    if (angle > 0) {
      tmpAngle = 90 - angle
    }
    if (angle < 0) {
      tmpAngle = -(90 + angle)
    }

    this._faceAngle = tmpAngle
    // if (Math.abs(tmpAngle - this._faceAngle) > 20 && Math.abs(tmpAngle) > 5) {
    //   this._faceAngle = tmpAngle
    // }
  }


  private genFaceTensor(face: FaceResult) {
    if (face == null || face.landmarks == null) return null
    let slope = getFaceSlope(face)
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
    // let martix = tf.tensor([[cos, -sin], [sin, cos]])
    // let tmp = face.landmarks.map((p) => [
    //   p.x - face.box.xMin,
    //   p.y - face.box.yMin
    // ])

    // let tensor = tf.tensor(tmp)
    // let result = tf.matMul(tensor, martix)

    // let min = tensor.min()
    // let max = tensor.max()
    // tensor = tensor.sub(min).div(max.sub(min)) // normilize
    // tensor.dispose()
    // min.dispose()
    // max.dispose()
    // martix.dispose()
    return null
  }

  async faceCapture(context: CanvasRenderingContext2D, name: string) {
    if (this.face == null || this.face.landmarks.length == 0) {
      showNotify({ type: 'warning', message: '未检测到人脸...', duration: 500 })
      return
    }

    this.captureCtx.clearRect(0, 0, this.capture.width, this.capture.height)
    this.masklayerCtx.clearRect(0, 0, this.masklayer.width, this.masklayer.height)

    let ratio = Math.min(this.capture.width / this.face.box.width, this.capture.height / this.face.box.height)
    this.captureCtx.drawImage(context.canvas,
      this.face.box.xMin, this.face.box.yMin, this.face.box.width, this.face.box.height,
      0, 0, this.face.box.width * ratio, this.face.box.height * ratio)
    // let imageData = this.captureCtx.getImageData(0, 0, this.face.box.width * ratio, this.face.box.height * ratio)
    // let faceOval = getFaceContour(this.face, Math.max(this.face.box.width * ratio, this.face.box.height * ratio))
    // let region = new Path2D()
    // region.moveTo(faceOval[0], faceOval[1])
    // this.masklayerCtx.moveTo(faceOval[0], faceOval[1])
    // for (let i = FACE_DIMS; i < faceOval.length; i += FACE_DIMS) {
    //   region.lineTo(faceOval[i], faceOval[i + 1])
    // }
    // region.closePath()
    // this.masklayerCtx.fillStyle = '#ff000088'
    // this.masklayerCtx.fill(region)
    // let maskImgData = this.masklayerCtx.getImageData(0, 0, this.masklayer.width, this.masklayer.height)
    // for (let i = 0; i < maskImgData.data.length; i += 4) {
    //   if (maskImgData.data[i + 3] != 136) {
    //     maskImgData.data[i + 3] = 0
    //   }
    // }
    // this.masklayerCtx.clearRect(0, 0, this.masklayer.width, this.masklayer.height)
    // this.masklayerCtx.putImageData(maskImgData, 0, 0)
    // this.calacleFaceAngle()
    // this.imgProcessor.imgProcessParams['rotate'] = this._faceAngle
    // this.imgProcessor?.process(imageData)
    // this.captureCtx.clearRect(0, 0, this.capture.width, this.capture.height)
    // this.captureCtx.putImageData(imageData, 0, 0)
    this.capture.toBlob(async (blob) => {
      try {
        await FaceRec.registe(name, this.face.landmarks, new File([blob], 'avatar.png', { type: 'image/png' }))
        showNotify({ type: 'success', message: '人脸采集成功', duration: 500 })
      } catch (err) {
        console.error(err)
        showNotify({ type: 'warning', message: '保存失败', duration: 500 })
      }

      // TODO: 保存图片 不通过请求直接native
      // let buffer = await blob.arrayBuffer()
      // window.mainApi?.saveFile('保存图片', `/static/face/face-${new Date().getTime()}.png`, buffer, true)

      // this.captureCtx.clearRect(0, 0, this.capture.width, this.capture.height)
    }, 'image/png')
  }
}