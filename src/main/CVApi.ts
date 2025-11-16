// import cv, { CascadeClassifier, FacemarkLBF, Mat, Rect } from '@u4/opencv4nodejs'
import path from 'path'
import { IOpencvAPI } from '../common/ipc.api'

import { loadOpenCV, type OpenCV } from '@opencvjs/node'
// import  OpenCV from '@opencvjs/node'
const cv: typeof OpenCV = await loadOpenCV()

console.log('opencv', cv)

let originFrame: any
let sharedData: Uint8ClampedArray
let bgrFrame = new cv.Mat()
// let classifierEye: CascadeClassifier
// let classifierDef: CascadeClassifier
// let classifierAlt: CascadeClassifier
// create the facemark object with the landmarks model
// let facemark: FacemarkLBF

let cvApi: IOpencvAPI = {
  async init() {
    try {

      let is_dev = process.env.NODE_ENV === 'development'
      let baseDataPath = path.join(__dirname, '../../../data/')

      // classifierEye = new cv.CascadeClassifier(is_dev ? cv.HAAR_EYE_TREE_EYEGLASSES : path.join(baseDataPath, './haarcascades/haarcascade_eye.xml'))
      // classifierDef = new cv.CascadeClassifier(is_dev ? cv.HAAR_FRONTALFACE_DEFAULT : path.join(baseDataPath, './haarcascades/haarcascade_frontalface_default.xml'))
      // classifierAlt = new cv.CascadeClassifier(is_dev ? cv.HAAR_FRONTALFACE_ALT : path.join(baseDataPath, './haarcascades/haarcascade_frontalface_alt.xml'))

      // facemark = new cv.FacemarkLBF()
      const modelFile = path.join(__dirname, `${is_dev ? '../../' : '../../../'}data/lbfmodel.yaml`)
      // facemark.loadModel(modelFile)
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
      equalizeHist: boolean,
      gamma: number,
      guassian: [number, number],
      sobel: [number, number],
      scharr: number,
      laplace: [number, number], // 二阶导数滤波器的孔径大小，必须为正奇数
      cannyThreshold: [number, number],
      gaussian: number, // 决定滤波器的尺寸
    }>) {

    // if (originFrame == null) {
    //   originFrame = new cv.Mat(height, width, cv.CV_8UC4)
    // } else {
    //   if (originFrame.cols !== width || originFrame.rows !== height) {
    //     originFrame.delete()
    //     originFrame = new cv.Mat(height, width, cv.CV_8UC4)
    //   }
    // }
    // if (sharedData == null) {
    //   sharedData = new Uint8ClampedArray(height * width * cv.CV_8UC4)
    // }
    let processedImg = cv.matFromArray(height, width, cv.CV_8UC4, frame.data)
    cv.cvtColor(processedImg, processedImg, cv.COLOR_RGBA2BGR)
    try {
      if (params.isGray) {
        cv.cvtColor(processedImg, processedImg, cv.COLOR_BGR2GRAY)
      }
    } catch (e) {
      console.error(e)
    }

    try {
      if (params.isGray && params.equalizeHist) {
        cv.equalizeHist(processedImg, processedImg)
      }
    } catch (e) {
      console.error(e)
    }

    try {
      if (params.gamma) {
        let gammaTable = new cv.Mat(256)
        for (let i = 0; i < 256; ++i) {
          gammaTable[i] = Math.pow(i / 255.0, 1 / params.gamma) * 255.0
        }

        cv.LUT(processedImg, gammaTable, processedImg)
        cv.normalize(processedImg, processedImg, 0, 255, cv.NORM_MINMAX)
        cv.convertScaleAbs(processedImg, processedImg, 1, 0)
      }
    } catch (e) { console.error(e) }

    try {
      if (params.gaussian) {
        cv.GaussianBlur(processedImg, processedImg,
          new cv.Size(params.gaussian[0], params.gaussian[0]),
          params.gaussian[1])
      }
    } catch (e) {
      console.error(e)
    }

    // let hsv = originFrame.cvtColor(cv.COLOR_BGR2HSV)

    try {
      if (params.sobel) {
        cv.Sobel(processedImg, processedImg, cv.CV_8U, 1, 1, params.sobel[0], params.sobel[1])
      }
    } catch (e) { console.error(e) }

    try {
      if (params.laplace) {
        cv.Laplacian(processedImg, processedImg, cv.CV_8U, params.laplace[0], params.laplace[1])
      }
    } catch (e) {
      console.error(e)
    }

    try {
      if (params.cannyThreshold) {
        cv.Canny(processedImg, processedImg, params.cannyThreshold[0], params.cannyThreshold[1])
      }
    } catch (e) {
      console.error(e)
    }

    if (params.isGray) {
      cv.cvtColor(processedImg, processedImg, cv.COLOR_GRAY2RGBA)
    } else {
      cv.cvtColor(processedImg, processedImg, cv.COLOR_BGR2RGBA)
    }
    const data = Uint8ClampedArray.from(processedImg.data)
    let cols = processedImg.cols, rows = processedImg.rows
    // console.log('data', processedImg)
    processedImg.delete()
    return { data, width: cols, height: rows }
  },
  faceRecognize: function (frame: ImageData, width: number, height: number) {
    // try {
    //   if (originFrame == null) {
    //     originFrame = new cv.Mat(height, width, cv.CV_8UC4)
    //   } else {
    //     if (originFrame.cols !== width || originFrame.rows !== height) {
    //       originFrame.release()
    //       originFrame = new cv.Mat(height, width, cv.CV_8UC4)
    //     }
    //   }
    //   if (sharedData == null || sharedData.length !== height * width * cv.CV_8UC4) {
    //     sharedData = new Uint8ClampedArray(height * width * cv.CV_8UC4)
    //   }

    //   originFrame.setData(Buffer.from(frame.data.buffer))
    //   const bgrFrame = originFrame.cvtColor(cv.COLOR_RGBA2BGR)
    //   let grayImage = bgrFrame.cvtColor(cv.COLOR_BGR2GRAY)
    //   let faceResult = classifierAlt.detectMultiScale(grayImage, 1.1)

    //   const sortByNumDetections = (result: { objects: Rect[], numDetections: number[] }) => result.numDetections
    //     .map((num, idx) => ({ num, idx }))
    //     .sort(((n0, n1) => n1.num - n0.num))
    //     .map(({ idx }) => idx)

    //   // get best result
    //   const faceRect = faceResult.objects[sortByNumDetections(faceResult)[0]]
    //   if (faceRect == null) return null
    //   // detect eyes
    //   const faceRegion = grayImage.getRegion(faceRect)
    //   const eyeResult = classifierEye.detectMultiScale(faceRegion)
    //   const eyeRects = sortByNumDetections(eyeResult)
    //     .slice(0, 2)
    //     .map(idx => eyeResult.objects[idx])

    //   const faceLandmarks = facemark.fit(grayImage, [faceRect])

    //   // grayImage = grayImage.cvtColor(cv.COLOR_GRAY2RGBA)
    //   // const data = Uint8ClampedArray.from(grayImage.getData())
    //   // let cols = grayImage.cols, rows = grayImage.rows
    //   grayImage.release()
    //   bgrFrame.release()
    // return { face: faceRect, eyes: eyeRects, landmarks: faceLandmarks[0] }
    // } catch (e) {
    //   console.error(e)
    //   return null
    // }
    return null
  }
}

export default cvApi