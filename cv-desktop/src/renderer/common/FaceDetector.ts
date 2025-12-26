import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision"
import { baseDomain } from "../../common"
import { FACE_DIMS, FaceDetectResult, getFaceSlope, landmarksToFace, NUM_KEYPOINTS } from "./DrawUtils"


export class FaceDetector {
  private faceLandmarker: FaceLandmarker = null
  public _enable: boolean = false
  set enable(val: boolean) {
    this._enable = val
    if (!val) this.dispose()
  }

  private _faceRecMode: 'opencv' | 'tfjs' = 'tfjs' // opencv or tfjs
  set faceRecMode(val: 'opencv' | 'tfjs') { this._faceRecMode = val }

  private _face: FaceDetectResult = null
  get face() { return this._face }

  private _enableFaceAngle: boolean = false
  get enableFaceAngle() { return this._enableFaceAngle }

  private _faceAngle: number = 0
  get faceAngle() { return this._faceAngle }

  private _isInited: boolean = false

  async init() {
    this._isInited = false
    this._face = {
      landmarks: new Float16Array(NUM_KEYPOINTS * FACE_DIMS),
      box: { xMin: 0, yMin: 0, xMax: 0, yMax: 0, width: 0, height: 0 },
      valid: false,
      expire: 0,
    }

    let filesetResolver = await FilesetResolver.forVisionTasks(
      __DEV__ ? 'node_modules/@mediapipe/tasks-vision/wasm' : baseDomain() + '/static/tasks-vision/wasm')
    this.faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: `${__DEV__ ? '' : baseDomain()}/static/face_landmarker.task`,
        delegate: 'GPU'
      },
      numFaces: 1,
      outputFaceBlendshapes: true
    })

    this._isInited = true
  }

  dispose() {
    if (this.face) this.face.valid = false
    // this.faceLandmarker?.close()
    this._isInited = false
    if (this._face) this._face.landmarks = null
    this._face = null
  }

  set enableFaceAngle(enable: boolean) {
    this._enableFaceAngle = enable
    this._faceAngle = 0
  }

  async detect(frame: ImageData) {
    if (!this._isInited) {
      if (this.face) this.face.valid = false
      return
    }

    switch (this._faceRecMode) {
      case 'opencv': {
        const result = window.cvNativeApi?.faceRecognize(frame, frame.width, frame.height)
        this._face = result?.face
        // if (this.drawFace) drawCVFaceResult(this.previewCtx, this.face, this.eyes, this.landmarks)
        break
      }
      case 'tfjs': {
        let time = Date.now()
        let result = this.faceLandmarker?.detect(frame)
        landmarksToFace(result?.faceLandmarks[0], this._face, frame.width, frame.height)
        this._face.expire = Date.now() - time
        this.calacleFaceAngle()
        break
      }
    }
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

  /**
   * 人脸采集方法
   * @param context - CanvasRenderingContext2D对象，用于绘制图像
   * @param name - 要注册的人脸名称
   */
  async faceCapture(context: CanvasRenderingContext2D, name: string) {
    // // 检查是否检测到人脸，如果没有则提示并返回
    // if (this.face == null || this.face.landmarks.length == 0) {
    //   showNotify({ type: 'warning', message: '未检测到人脸...', duration: 500 })
    //   return
    // }

    // // 清除画布内容
    // this.captureCtx.clearRect(0, 0, this.capture.width, this.capture.height)
    // this.masklayerCtx.clearRect(0, 0, this.masklayer.width, this.masklayer.height)

    // // 计算缩放比例，确保人脸图像适应画布大小
    // let ratio = Math.min(this.capture.width / this.face.box.width, this.capture.height / this.face.box.height)
    // // 将检测到的人脸区域绘制到画布上
    // this.captureCtx.drawImage(context.canvas,
    //   this.face.box.xMin, this.face.box.yMin, this.face.box.width, this.face.box.height,
    //   0, 0, this.face.box.width * ratio, this.face.box.height * ratio)
    // // 以下代码被注释，原本用于处理人脸轮廓和蒙版效果
    // // let imageData = this.captureCtx.getImageData(0, 0, this.face.box.width * ratio, this.face.box.height * ratio)
    // // let faceOval = getFaceContour(this.face, Math.max(this.face.box.width * ratio, this.face.box.height * ratio))
    // // let region = new Path2D()
    // // region.moveTo(faceOval[0], faceOval[1])
    // // this.masklayerCtx.moveTo(faceOval[0], faceOval[1])
    // // for (let i = FACE_DIMS; i < faceOval.length; i += FACE_DIMS) {
    // //   region.lineTo(faceOval[i], faceOval[i + 1])
    // // }
    // // region.closePath()
    // // this.masklayerCtx.fillStyle = '#ff000088'
    // // this.masklayerCtx.fill(region)
    // // let maskImgData = this.masklayerCtx.getImageData(0, 0, this.masklayer.width, this.masklayer.height)
    // // for (let i = 0; i < maskImgData.data.length; i += 4) {
    // //   if (maskImgData.data[i + 3] != 136) {
    // //     maskImgData.data[i + 3] = 0
    // //   }
    // // }
    // // this.masklayerCtx.clearRect(0, 0, this.masklayer.width, this.masklayer.height)
    // // this.masklayerCtx.putImageData(maskImgData, 0, 0)
    // // this.calacleFaceAngle()
    // // this.imgProcessor.imgProcessParams['rotate'] = this._faceAngle
    // // this.imgProcessor?.process(imageData)
    // // this.captureCtx.clearRect(0, 0, this.capture.width, this.capture.height)
    // // this.captureCtx.putImageData(imageData, 0, 0)
    // this.capture.toBlob(async (blob) => {
    //   try {
    //     await FaceRec.registe(name, this.face.landmarks, new File([blob], 'avatar.png', { type: 'image/png' }))
    //     showNotify({ type: 'success', message: '人脸采集成功', duration: 500 })
    //   } catch (err) {
    //     console.error(err)
    //     showNotify({ type: 'warning', message: '保存失败', duration: 500 })
    //   }

    //   // TODO: 保存图片 不通过请求直接native
    //   // let buffer = await blob.arrayBuffer()
    //   // window.mainApi?.saveFile('保存图片', `/static/face/face-${new Date().getTime()}.png`, buffer, true)

    //   // this.captureCtx.clearRect(0, 0, this.capture.width, this.capture.height)
    // }, 'image/png')
  }
}