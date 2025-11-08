import cv, { CascadeClassifier, FacemarkLBF, Mat, Rect } from '@u4/opencv4nodejs'
import path from 'path'
import { IOpencvAPI } from '../common/ipc.api'

let originFrame: Mat
let sharedData: Uint8ClampedArray
let bgrFrame: Mat
let classifierEye: CascadeClassifier
let classifierDef: CascadeClassifier
let classifierAlt: CascadeClassifier
// create the facemark object with the landmarks model
let facemark: FacemarkLBF

let cvApi: IOpencvAPI = {
  async init() {
    try {

      let is_dev = process.env.NODE_ENV === 'development'
      let baseDataPath = path.join(__dirname, '../../../data/')

      classifierEye = new cv.CascadeClassifier(is_dev ? cv.HAAR_EYE_TREE_EYEGLASSES : path.join(baseDataPath, './haarcascades/haarcascade_eye.xml'))
      classifierDef = new cv.CascadeClassifier(is_dev ? cv.HAAR_FRONTALFACE_DEFAULT : path.join(baseDataPath, './haarcascades/haarcascade_frontalface_default.xml'))
      classifierAlt = new cv.CascadeClassifier(is_dev ? cv.HAAR_FRONTALFACE_ALT : path.join(baseDataPath, './haarcascades/haarcascade_frontalface_alt.xml'))

      facemark = new cv.FacemarkLBF()
      const modelFile = path.join(__dirname, `${is_dev ? '../../' : '../../../'}data/lbfmodel.yaml`)
      console.log(modelFile)
      console.log(facemark)
      facemark.loadModel(modelFile)
      // give the facemark object it's face detection callback
      // facemark.setFaceDetector((frame: Mat) => {
      //   const { objects } = classifierAlt.detectMultiScale(frame, 1.12)
      //   return objects
      // })

    } catch (e) {
      console.error(e)
    }
  },
  destroy() {
    if (originFrame) originFrame.release()
    if (sharedData) sharedData = null
  },
  imgProcess: function (frame: ImageData, width: number, height: number,
    params: Partial<{
      isGray: boolean,
      isFaceDetect: boolean,
      isFaceRecognize: boolean,
      isFaceLandmark: boolean,
      isFaceEyes: boolean,
      contrast: number,
      brightness: number,
      laplace: number,
      enhance: number,
      sharpness: number,
      gaussian: number,
    }>) {
    try {
      if (originFrame == null) {
        originFrame = new cv.Mat(height, width, cv.CV_8UC4)
      } else {
        if (originFrame.cols !== width || originFrame.rows !== height) {
          originFrame.release()
          originFrame = new cv.Mat(height, width, cv.CV_8UC4)
        }
      }
      if (sharedData == null) {
        sharedData = new Uint8ClampedArray(height * width * cv.CV_8UC4)
      }

      originFrame.setData(Buffer.from(frame.data.buffer))
      const bgrFrame = originFrame.cvtColor(cv.COLOR_RGBA2BGR)

      let grayImage = bgrFrame.cvtColor(cv.COLOR_BGR2GRAY)
      grayImage = grayImage.equalizeHist()
      // grayImage = cv.gaussianBlur(grayImage, new cv.Size(3, 3), params.gaussian, params.gaussian, cv.BORDER_DEFAULT)

      grayImage = grayImage.cvtColor(cv.COLOR_GRAY2RGBA)
      const data = Uint8ClampedArray.from(grayImage.getData())
      let cols = grayImage.cols, rows = grayImage.rows
      grayImage.release()
      bgrFrame.release()
      return { data, width: cols, height: rows }
    } catch (e) {
      console.error(e)
      return { data: null, width, height }
    }
  },
  faceRecognize: function (frame: ImageData, width: number, height: number) {
    try {
      if (originFrame == null) {
        originFrame = new cv.Mat(height, width, cv.CV_8UC4)
      } else {
        if (originFrame.cols !== width || originFrame.rows !== height) {
          originFrame.release()
          originFrame = new cv.Mat(height, width, cv.CV_8UC4)
        }
      }
      if (sharedData == null || sharedData.length !== height * width * cv.CV_8UC4) {
        sharedData = new Uint8ClampedArray(height * width * cv.CV_8UC4)
      }

      originFrame.setData(Buffer.from(frame.data.buffer))
      const bgrFrame = originFrame.cvtColor(cv.COLOR_RGBA2BGR)
      let grayImage = bgrFrame.cvtColor(cv.COLOR_BGR2GRAY)
      let faceResult = classifierAlt.detectMultiScale(grayImage, 1.1)

      const sortByNumDetections = (result: { objects: Rect[], numDetections: number[] }) => result.numDetections
        .map((num, idx) => ({ num, idx }))
        .sort(((n0, n1) => n1.num - n0.num))
        .map(({ idx }) => idx)

      // get best result
      const faceRect = faceResult.objects[sortByNumDetections(faceResult)[0]]
      if (faceRect == null) return null
      // detect eyes
      const faceRegion = grayImage.getRegion(faceRect)
      const eyeResult = classifierEye.detectMultiScale(faceRegion)
      const eyeRects = sortByNumDetections(eyeResult)
        .slice(0, 2)
        .map(idx => eyeResult.objects[idx])

      const faceLandmarks = facemark.fit(grayImage, [faceRect])

      // grayImage = grayImage.cvtColor(cv.COLOR_GRAY2RGBA)
      // const data = Uint8ClampedArray.from(grayImage.getData())
      // let cols = grayImage.cols, rows = grayImage.rows
      grayImage.release()
      bgrFrame.release()
      return { face: faceRect, eyes: eyeRects, landmarks: faceLandmarks[0] }
    } catch (e) {
      console.error(e)
      return null
    }
  }
}

export default cvApi