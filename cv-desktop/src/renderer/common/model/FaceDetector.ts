import { FaceLandmarker, FilesetResolver, NormalizedLandmark } from '@mediapipe/tasks-vision'
import { Face, TFace } from 'kalidokit'
import { baseDomain, FaceDetectResult } from '../../../shared'
import { FACE_DIMS, getFaceSlope, NUM_KEYPOINTS } from '../DrawUtils'


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

  private _tface: TFace = null
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
    for (let i = 0; i < face.landmarks.length; i += FACE_DIMS) {
      face.landmarks[i] = (face.landmarks[i] - face.box.xMin) / face.box.width
      face.landmarks[i + 1] = (face.landmarks[i + 1] - face.box.yMin) / face.box.height
    }

    face.valid = true
  }
}