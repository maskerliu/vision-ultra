import cv, { CascadeClassifier, FacemarkLBF, Mat, Rect } from '@u4/opencv4nodejs'
import path from 'path'
import { IOpencvAPI } from '../common/ipc.api'


let gamma = 1.0
let gammaTable = Uint8Array.from({ length: 256 }, (_, i) => i)
let lut = new Mat(256, 1, cv.CV_8UC1)
let processedImg: Mat
let sharedData: Uint8ClampedArray
let bgrFrame = new cv.Mat()
let classifierEye: CascadeClassifier
let classifierDef: CascadeClassifier
let classifierAlt: CascadeClassifier
// create the facemark object with the landmarks model
let facemark: FacemarkLBF

let cvNativeApi: IOpencvAPI = {
  async init() {
    try {

      let is_dev = process.env.NODE_ENV === 'development'
      let baseDataPath = path.join(__dirname, '../../../data/')

      classifierEye = new cv.CascadeClassifier(is_dev ? cv.HAAR_EYE_TREE_EYEGLASSES : path.join(baseDataPath, './haarcascades/haarcascade_eye.xml'))
      classifierDef = new cv.CascadeClassifier(is_dev ? cv.HAAR_FRONTALFACE_DEFAULT : path.join(baseDataPath, './haarcascades/haarcascade_frontalface_default.xml'))
      classifierAlt = new cv.CascadeClassifier(is_dev ? cv.HAAR_FRONTALFACE_ALT : path.join(baseDataPath, './haarcascades/haarcascade_frontalface_alt.xml'))

      facemark = new cv.FacemarkLBF()
      const modelFile = path.join(__dirname, `${is_dev ? '../../' : '../../../'}data/lbfmodel.yaml`)
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
    processedImg?.release()
    processedImg = null
    lut?.release()
    lut = null
  },
  imgProcess: function (frame: ImageData, width: number, height: number, params: Partial<{
    isGray: boolean,
    equalizeHist: boolean,
    gamma: number,
    gaussian: [number, number, number],
    sobel: [number, number],
    scharr: number,
    laplace: [number, number], // 二阶导数滤波器的孔径大小，必须为正奇数
    cannyThreshold: [number, number],
  }>) {
    if (processedImg == null) {
      processedImg = new cv.Mat(height, width, cv.CV_8UC4)
    }

    if (processedImg.cols !== width || processedImg.rows !== height) {
      processedImg.release()
      processedImg = new cv.Mat(height, width, cv.CV_8UC4)
    }

    if (sharedData == null || sharedData.length !== height * width * 4) {
      sharedData = new Uint8ClampedArray(height * width * 4)
    }

    processedImg.setData(Buffer.from(frame.data.buffer))
    processedImg = processedImg.cvtColor(cv.COLOR_RGBA2BGR)

    try {
      if (params.isGray) {
        processedImg = processedImg.cvtColor(cv.COLOR_BGR2GRAY)
      }
    } catch (e) {
      console.error(e)
    }
    try {
      if (params.isGray && params.equalizeHist) {
        processedImg = processedImg.equalizeHist()
      }
    } catch (e) {
      console.error(e)
    }

    try {
      if (params.gaussian) {
        processedImg = processedImg.gaussianBlur(new cv.Size(params.gaussian[0], params.gaussian[0]), params.gaussian[1])
        // processedImg = processedImg.addWeighted(1.0 + params.gaussian[2], processedImg, -params.gaussian[2], 0, 0)
      }
    } catch (e) {
      console.error(e)
    }

    try {
      if (params.laplace) {
        processedImg = processedImg.laplacian(cv.CV_8U, params.laplace[0], params.laplace[1])
      }
    } catch (e) {
      console.error(e)
    }

    try {
      if (params.cannyThreshold) {
        processedImg = processedImg.canny(params.cannyThreshold[0], params.cannyThreshold[1])
      }
    } catch (e) {
      console.error(e)
    }

    if (params.isGray) {
      processedImg = processedImg.cvtColor(cv.COLOR_GRAY2RGBA)
    } else {
      processedImg = processedImg.cvtColor(cv.COLOR_BGR2RGBA)
    }
    sharedData.set(processedImg.getData())
    return sharedData
  },
  faceRecognize: function (frame: ImageData, width: number, height: number) {
    try {
      if (processedImg == null) {
        processedImg = new cv.Mat(height, width, cv.CV_8UC4)
      } else {
        if (processedImg.cols !== width || processedImg.rows !== height) {
          processedImg.release()
          processedImg = new cv.Mat(height, width, cv.CV_8UC4)
        }
      }
      if (sharedData == null || sharedData.length !== height * width * cv.CV_8UC4) {
        sharedData = new Uint8ClampedArray(height * width * cv.CV_8UC4)
      }

      processedImg.setData(Buffer.from(frame.data.buffer))
      const bgrFrame = processedImg.cvtColor(cv.COLOR_RGBA2BGR)
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
      return { face: faceRect, eyes: eyeRects, landmarks: faceLandmarks[0] }
    } catch (e) {
      console.error(e)
      return null
    }
    return null
  }
}

export default cvNativeApi