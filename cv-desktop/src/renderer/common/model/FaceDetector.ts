import { FaceLandmarker, FilesetResolver, NormalizedLandmark } from '@mediapipe/tasks-vision'
import { baseDomain, FaceDetectResult } from '@shared/index'
import { Face, TFace } from 'kalidokit'
import { FACE_DIMS, getFaceSlope, NUM_KEYPOINTS } from '../DrawUtils'


export class FaceDetector {
  private faceLandmarker: FaceLandmarker | null = null
  public _enable: boolean = false
  set enable(val: boolean) {
    this._enable = val
    if (!val) this.dispose()
  }

  private _faceRecMode: 'opencv' | 'tfjs' = 'tfjs' // opencv or tfjs
  set faceRecMode(val: 'opencv' | 'tfjs') { this._faceRecMode = val }

  private _face: FaceDetectResult | null = null
  get face() { return this._face }

  private _tface: TFace | undefined = undefined
  get tface() { return this._tface }

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
      ratio: 0
    }

    let filesetResolver = await FilesetResolver.forVisionTasks(
      __DEV__ ? 'node_modules/@mediapipe/tasks-vision/wasm' : `${baseDomain()}/static/tasks-vision/wasm`)
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
        // const result = window.cvNative?.faceRecognize(frame, frame.width, frame.height)
        // this._face = result?.face
        // if (this.drawFace) drawCVFaceResult(this.previewCtx, this.face, this.eyes, this.landmarks)
        break
      }
      case 'tfjs': {
        let time = Date.now()
        let result = this.faceLandmarker?.detect(frame)
        if (result != null && result.faceLandmarks[0] != null) {
          try {
            this._tface = Face.solve(result.faceLandmarks[0], { runtime: 'mediapipe' })
          } catch (err) {
            console.log(err, result.faceLandmarks[0])
          }

          this.landmarksToFace(result.faceLandmarks[0], this._face, frame.width, frame.height)
          this._face.expire = Date.now() - time
          this.calacleFaceAngle()
        }
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

  private landmarksToFace(landmarks: NormalizedLandmark[], face: FaceDetectResult, width: number, height: number) {
    if (landmarks == null || landmarks.length == 0) {
      face.valid = false
      return
    }

    var xMin = Number.MAX_SAFE_INTEGER
    var xMax = Number.MIN_SAFE_INTEGER
    var yMin = Number.MAX_SAFE_INTEGER
    var yMax = Number.MIN_SAFE_INTEGER

    for (let i = 0; i < landmarks.length; i++) {
      var landmark = landmarks[i]
      xMin = Math.min(xMin, landmark.x * width)
      xMax = Math.max(xMax, landmark.x * width)
      yMin = Math.min(yMin, landmark.y * height)
      yMax = Math.max(yMax, landmark.y * height)
      face.landmarks[i * FACE_DIMS] = landmarks[i].x * width
      face.landmarks[i * FACE_DIMS + 1] = landmarks[i].y * height
      // face.landmarks[i * 3 + 2] = landmarks[i].z
    }

    face.box.xMax = xMax
    face.box.xMin = xMin
    face.box.yMax = yMax
    face.box.yMin = yMin
    face.box.width = xMax - xMin
    face.box.height = yMax - yMin

    face.ratio = width / height
    let normilize = Math.max(face.box.width, face.box.height)
    // 只归一化实际被填充的关键点（MediaPipe 返回 468 个关键点）
    // NUM_KEYPOINTS = 478，后 10 个保持为 0，避免引入噪声
    const actualKeypoints = Math.min(landmarks.length, NUM_KEYPOINTS)
    for (let i = 0; i < actualKeypoints; i++) {
      face.landmarks[i * FACE_DIMS] = (face.landmarks[i * FACE_DIMS] - face.box.xMin) / face.box.width
      face.landmarks[i * FACE_DIMS + 1] = (face.landmarks[i * FACE_DIMS + 1] - face.box.yMin) / face.box.height
    }

    face.valid = true
  }
}

/**
 * 从 MediaPipe 人脸关键点提取几何距离特征向量
 * 将 468 个原始关键点（1404+ 维）压缩为 ~100 维的几何特征：
 * 1. 关键距离比例（18 维）：对平移/尺度/轻微旋转不敏感
 * 2. 面部轮廓相对坐标（72 维）：描述脸型轮廓
 * 3. 对称性特征（10 维）：左右脸差异
 * 总维度：100 维，比原始坐标更紧凑、更具区分度
 */
export function extractEigenFeatures(landmarks: Float16Array | Float32Array): Float16Array {
  const features: number[] = []

  // 辅助：计算两个关键点之间的欧氏距离
  const dist = (a: number, b: number): number => {
    const ax = landmarks[a * FACE_DIMS], ay = landmarks[a * FACE_DIMS + 1]
    const bx = landmarks[b * FACE_DIMS], by = landmarks[b * FACE_DIMS + 1]
    return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2)
  }

  // 基准尺寸：面宽（左脸颊→右脸颊）、面高（额头→下巴）
  const faceWidth = dist(234, 454)
  const faceHeight = dist(10, 152)
  if (faceWidth < 0.01 || faceHeight < 0.01) {
    return new Float16Array(100) // 返回空特征，避免除零
  }

  // 1. 关键距离比例（18 维）—— 对平移/尺度/轻微旋转不敏感
  const eyeDist = dist(33, 362) // 两眼外角距离
  features.push(
    eyeDist / faceWidth,                      // 眼距 / 面宽
    eyeDist / faceHeight,                     // 眼距 / 面高
    dist(33, 133) / eyeDist,                  // 左眼宽 / 眼距
    dist(362, 263) / eyeDist,                 // 右眼宽 / 眼距
    dist(61, 291) / eyeDist,                  // 嘴宽 / 眼距
    dist(1, 4) / faceHeight,                  // 鼻长 / 面高
    dist(48, 278) / eyeDist,                  // 鼻宽 / 眼距
    dist(1, 33) / faceHeight,                 // 鼻尖到左眼 / 面高
    dist(1, 362) / faceHeight,                // 鼻尖到右眼 / 面高
    dist(1, 61) / faceHeight,                 // 鼻尖到左嘴角 / 面高
    dist(1, 291) / faceHeight,                // 鼻尖到右嘴角 / 面高
    dist(105, 334) / eyeDist,                 // 眉间距 / 眼距
    dist(65, 105) / eyeDist,                  // 左眉长 / 眼距
    dist(295, 334) / eyeDist,                 // 右眉长 / 眼距
    faceHeight / faceWidth,                   // 面高/面宽（脸型比例）
    dist(0, 17) / dist(61, 291),              // 嘴高 / 嘴宽
    dist(61, 291) / faceWidth,                // 嘴宽 / 面宽
    dist(10, 152) / dist(234, 454),           // 面高/面宽（另一种）
  )

  // 2. 面部轮廓关键点相对坐标（36 点 × 2 = 72 维）
  const contourIdx = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]
  for (let idx of contourIdx) {
    features.push(landmarks[idx * FACE_DIMS] / faceWidth)
    features.push(landmarks[idx * FACE_DIMS + 1] / faceHeight)
  }

  // 3. 对称性特征（5 对 × 2 = 10 维）—— 左右脸对称差异
  const symPairs = [
    [33, 362],   // 左眼外角 - 右眼外角
    [133, 263],  // 左眼内角 - 右眼内角
    [61, 291],   // 左嘴角 - 右嘴角
    [105, 334],  // 左眉外 - 右眉外
    [65, 295],   // 左眉内 - 右眉内
  ]
  for (let [l, r] of symPairs) {
    const lx = landmarks[l * FACE_DIMS], ly = landmarks[l * FACE_DIMS + 1]
    const rx = landmarks[r * FACE_DIMS], ry = landmarks[r * FACE_DIMS + 1]
    features.push(Math.abs(lx - rx) / faceWidth)
    features.push(Math.abs(ly - ry) / faceHeight)
  }

  return new Float16Array(features)
}