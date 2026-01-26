// import cv, { CascadeClassifier, Contour, FacemarkLBF, Mat } from '@u4/opencv4nodejs'
// import path from 'path'
// import {
//   cvBlur, cvBlurType, cvDetector, cvEqualizeHist,
//   cvFilter, cvFilterType, cvMorph, cvSharpen, ICVAPI
// } from '../../common'


// let gamma = 1.0
// let gammaTable = Uint8Array.from({ length: 256 }, (_, i) => i)
// let lut = new Mat(256, 1, cv.CV_8UC1)
// let processedImg: Mat
// let sharedData: Uint8ClampedArray
// let bgrFrame = new cv.Mat()
// let classifierEye: CascadeClassifier
// let classifierDef: CascadeClassifier
// let classifierAlt: CascadeClassifier
// // create the facemark object with the landmarks model
// let facemark: FacemarkLBF


// class CVNative implements ICVAPI {

//   async init() {
//     try {
//       let is_dev = process.env.NODE_ENV === 'development'
//       let baseDataPath = path.join(__dirname, '../../../data/')

//       classifierEye = new cv.CascadeClassifier(is_dev ? cv.HAAR_EYE_TREE_EYEGLASSES : path.join(baseDataPath, './haarcascades/haarcascade_eye.xml'))
//       classifierDef = new cv.CascadeClassifier(is_dev ? cv.HAAR_FRONTALFACE_DEFAULT : path.join(baseDataPath, './haarcascades/haarcascade_frontalface_default.xml'))
//       classifierAlt = new cv.CascadeClassifier(is_dev ? cv.HAAR_FRONTALFACE_ALT : path.join(baseDataPath, './haarcascades/haarcascade_frontalface_alt.xml'))

//       facemark = new cv.FacemarkLBF()
//       const modelFile = path.join(__dirname, '../../../data/lbfmodel.yaml')
//       facemark.loadModel(modelFile)
//       // give the facemark object it's face detection callback
//       // facemark.setFaceDetector((frame: Mat) => {
//       //   const { objects } = classifierAlt.detectMultiScale(frame, 1.12)
//       //   return objects
//       // })

//     } catch (e) {
//       console.error(e)
//     }
//   }

//   dispose() {
//     processedImg?.release()
//     processedImg = null
//     lut?.release()
//     lut = null
//   }

//   async imgProcess(frame: ImageData,
//     params: Partial<{
//       isGray: boolean,
//       rotate: number,
//       colorMap: number,
//       morph: cvMorph,
//       gamma: number,
//       equalization: cvEqualizeHist,
//       sharpen: cvSharpen,
//       blur: cvBlur,
//       filter: cvFilter,
//       detector: cvDetector,
//       canny: [number, number],
//     }>) {

//     if (processedImg == null) {
//       processedImg = new cv.Mat(frame.height, frame.width, cv.CV_8UC4)
//     }

//     if (processedImg.cols !== frame.width || processedImg.rows !== frame.height) {
//       processedImg.release()
//       processedImg = new cv.Mat(frame.height, frame.width, cv.CV_8UC4)
//     }

//     if (sharedData == null || sharedData.length !== frame.height * frame.width * 4) {
//       sharedData = new Uint8ClampedArray(frame.height * frame.width * 4)
//     }

//     processedImg.setData(Buffer.from(frame.data.buffer))
//     processedImg = processedImg.cvtColor(cv.COLOR_RGBA2BGR)

//     if (params.isGray) {
//       processedImg = processedImg.cvtColor(cv.COLOR_BGR2GRAY)
//     }

//     if (params.isGray && params.equalization) {
//       processedImg = processedImg.equalizeHist()
//     }


//     if (params.blur) {
//       switch (params.blur[0]) {
//         case cvBlurType.gaussian:
//           processedImg = processedImg.gaussianBlur(new cv.Size(params.blur[1], params.blur[2]), 0)
//           break
//         case cvBlurType.median:
//           processedImg = processedImg.medianBlur(params.blur[3])
//           break
//         case cvBlurType.bilateral:
//           processedImg = processedImg.bilateralFilter(params.blur[4], params.blur[5], params.blur[6])
//           break
//         case cvBlurType.avg:
//           processedImg = processedImg.blur(new cv.Size(params.blur[1], params.blur[2]))
//           break
//       }
//     }

//     // if (params.blur && params.blur[0] === 'adaptive') {
//     // processedImg = processedImg.adaptiveThreshold(params.blur[3], params.blur[4], params.blur[5], params.blur[6], params.blur[7])
//     // }

//     switch (params.filter[0]) {
//       case cvFilterType.sobel:
//         processedImg = processedImg.sobel(processedImg.depth, params.filter[1], params.filter[2], params.filter[3] as any)
//         break
//       case cvFilterType.scharr:
//         processedImg = processedImg.scharr(processedImg.depth, params.filter[1], params.filter[2], params.filter[3] as any)
//         break
//       case cvFilterType.laplace:
//         processedImg = processedImg.laplacian(processedImg.depth, params.filter[3])
//         break
//     }

//     try {
//       if (params.canny) {
//         processedImg = processedImg.canny(params.canny[0], params.canny[1])
//       }
//     } catch (e) {
//       console.error(e)
//     }

//     if (params.isGray) {
//       processedImg = processedImg.cvtColor(cv.COLOR_GRAY2RGBA)
//     } else {
//       processedImg = processedImg.cvtColor(cv.COLOR_BGR2RGBA)
//     }
//     sharedData.set(processedImg.getData())
//     return sharedData
//   }

//   findContours(data: Uint8Array, width: number, height: number): Array<[number, number]> {
//     let src = new cv.Mat(height, width, cv.CV_8UC1)
//     src.setData(Buffer.from(data))
//     let hierarchy = new cv.Mat()
//     let M: any
//     let ksize = new cv.Size(2, 2)
//     M = cv.getStructuringElement(cv.MORPH_CROSS, ksize)
//     src.morphologyEx(M, cv.MORPH_DILATE, new cv.Point2(-1, -1), 1)
//     // cv.morphologyEx(src, src, cv.MORPH_DILATE, M, new cv.Point(-1, -1), 1)
//     M.delete()
//     let contours = src.findContours(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

//     let maxArea = 0
//     let maxCnt: Contour = null
//     for (let i = 0; i < contours.length; ++i) {
//       let cnt = contours[i]
//       if (cnt.area > maxArea) {
//         maxArea = cnt.area
//         maxCnt = cnt
//       }
//     }
//     let finalCoordinates = []
//     if (maxCnt) {

//       // 计算轮廓周长，用于设定逼近精度
//       let epsilon = 0.008 * maxCnt.arcLength(true)
//       let approx = maxCnt.approxPolyDP(epsilon, true)

//       return approx.map(it => { return [it.x, it.y] })
//     }

//     src.release()
//     hierarchy.release()

//     return []
//   }
// }


// // let cvNative: ICVAPI = {
// //   async init() {
// //     try {
// //       let is_dev = process.env.NODE_ENV === 'development'
// //       let baseDataPath = path.join(__dirname, '../../../data/')

// //       classifierEye = new cv.CascadeClassifier(is_dev ? cv.HAAR_EYE_TREE_EYEGLASSES : path.join(baseDataPath, './haarcascades/haarcascade_eye.xml'))
// //       classifierDef = new cv.CascadeClassifier(is_dev ? cv.HAAR_FRONTALFACE_DEFAULT : path.join(baseDataPath, './haarcascades/haarcascade_frontalface_default.xml'))
// //       classifierAlt = new cv.CascadeClassifier(is_dev ? cv.HAAR_FRONTALFACE_ALT : path.join(baseDataPath, './haarcascades/haarcascade_frontalface_alt.xml'))

// //       facemark = new cv.FacemarkLBF()
// //       const modelFile = path.join(__dirname, '../../../data/lbfmodel.yaml')
// //       facemark.loadModel(modelFile)
// //       // give the facemark object it's face detection callback
// //       // facemark.setFaceDetector((frame: Mat) => {
// //       //   const { objects } = classifierAlt.detectMultiScale(frame, 1.12)
// //       //   return objects
// //       // })

// //     } catch (e) {
// //       console.error(e)
// //     }
// //   },
// //   dispose() {
// //     processedImg?.release()
// //     processedImg = null
// //     lut?.release()
// //     lut = null
// //   },
// //   imgProcess: function (frame: ImageData, width: number, height: number, params: Partial<{
// //     isGray: boolean,
// //     rotate: number,
// //     colorMap: number,
// //     morph: cvMorph,
// //     gamma: number,
// //     equalization: cvEqualizeHist,
// //     sharpen: cvSharpen,
// //     blur: cvBlur,
// //     filter: cvFilter,
// //     detector: cvDetector,
// //     canny: [number, number],
// //   }>) {
// //     if (processedImg == null) {
// //       processedImg = new cv.Mat(height, width, cv.CV_8UC4)
// //     }

// //     if (processedImg.cols !== width || processedImg.rows !== height) {
// //       processedImg.release()
// //       processedImg = new cv.Mat(height, width, cv.CV_8UC4)
// //     }

// //     if (sharedData == null || sharedData.length !== height * width * 4) {
// //       sharedData = new Uint8ClampedArray(height * width * 4)
// //     }

// //     processedImg.setData(Buffer.from(frame.data.buffer))
// //     processedImg = processedImg.cvtColor(cv.COLOR_RGBA2BGR)

// //     if (params.isGray) {
// //       processedImg = processedImg.cvtColor(cv.COLOR_BGR2GRAY)
// //     }

// //     if (params.isGray && params.equalization) {
// //       processedImg = processedImg.equalizeHist()
// //     }


// //     if (params.blur) {
// //       switch (params.blur[0]) {
// //         case cvBlurType.gaussian:
// //           processedImg = processedImg.gaussianBlur(new cv.Size(params.blur[1], params.blur[2]), 0)
// //           break
// //         case cvBlurType.median:
// //           processedImg = processedImg.medianBlur(params.blur[3])
// //           break
// //         case cvBlurType.bilateral:
// //           processedImg = processedImg.bilateralFilter(params.blur[4], params.blur[5], params.blur[6])
// //           break
// //         case cvBlurType.avg:
// //           processedImg = processedImg.blur(new cv.Size(params.blur[1], params.blur[2]))
// //           break
// //       }
// //     }

// //     // if (params.blur && params.blur[0] === 'adaptive') {
// //     // processedImg = processedImg.adaptiveThreshold(params.blur[3], params.blur[4], params.blur[5], params.blur[6], params.blur[7])
// //     // }

// //     switch (params.filter[0]) {
// //       case cvFilterType.sobel:
// //         processedImg = processedImg.sobel(processedImg.depth, params.filter[1], params.filter[2], params.filter[3] as any)
// //         break
// //       case cvFilterType.scharr:
// //         processedImg = processedImg.scharr(processedImg.depth, params.filter[1], params.filter[2], params.filter[3] as any)
// //         break
// //       case cvFilterType.laplace:
// //         processedImg = processedImg.laplacian(processedImg.depth, params.filter[3])
// //         break
// //     }

// //     try {
// //       if (params.canny) {
// //         processedImg = processedImg.canny(params.canny[0], params.canny[1])
// //       }
// //     } catch (e) {
// //       console.error(e)
// //     }

// //     if (params.isGray) {
// //       processedImg = processedImg.cvtColor(cv.COLOR_GRAY2RGBA)
// //     } else {
// //       processedImg = processedImg.cvtColor(cv.COLOR_BGR2RGBA)
// //     }
// //     sharedData.set(processedImg.getData())
// //     // return new Promise(sharedData)
// //   },
// //   findContours(data: Uint8Array, width: number, height: number): Array<[number, number]> {


// //     return []
// //   }
// //   // faceRecognize: function (frame: ImageData, width: number, height: number) {
// //   //   try {
// //   //     if (processedImg == null) {
// //   //       processedImg = new cv.Mat(height, width, cv.CV_8UC4)
// //   //     } else {
// //   //       if (processedImg.cols !== width || processedImg.rows !== height) {
// //   //         processedImg.release()
// //   //         processedImg = new cv.Mat(height, width, cv.CV_8UC4)
// //   //       }
// //   //     }
// //   //     if (sharedData == null || sharedData.length !== height * width * cv.CV_8UC4) {
// //   //       sharedData = new Uint8ClampedArray(height * width * cv.CV_8UC4)
// //   //     }

// //   //     processedImg.setData(Buffer.from(frame.data.buffer))
// //   //     const bgrFrame = processedImg.cvtColor(cv.COLOR_RGBA2BGR)
// //   //     let grayImage = bgrFrame.cvtColor(cv.COLOR_BGR2GRAY)
// //   //     let faceResult = classifierAlt.detectMultiScale(grayImage, 1.1)

// //   //     const sortByNumDetections = (result: { objects: Rect[], numDetections: number[] }) => result.numDetections
// //   //       .map((num, idx) => ({ num, idx }))
// //   //       .sort(((n0, n1) => n1.num - n0.num))
// //   //       .map(({ idx }) => idx)

// //   //     // get best result
// //   //     const faceRect = faceResult.objects[sortByNumDetections(faceResult)[0]]
// //   //     if (faceRect == null) return null
// //   //     // detect eyes
// //   //     const faceRegion = grayImage.getRegion(faceRect)
// //   //     const eyeResult = classifierEye.detectMultiScale(faceRegion)
// //   //     const eyeRects = sortByNumDetections(eyeResult)
// //   //       .slice(0, 2)
// //   //       .map(idx => eyeResult.objects[idx])

// //   //     const faceLandmarks = facemark.fit(grayImage, [faceRect])

// //   //     // grayImage = grayImage.cvtColor(cv.COLOR_GRAY2RGBA)
// //   //     // const data = Uint8ClampedArray.from(grayImage.getData())
// //   //     // let cols = grayImage.cols, rows = grayImage.rows
// //   //     grayImage.release()
// //   //     return { face: faceRect, eyes: eyeRects, landmarks: faceLandmarks[0] }
// //   //   } catch (e) {
// //   //     console.error(e)
// //   //     return null
// //   //   }
// //   //   return null
// //   // }
// // }

// const cvNative = new CVNative()
// export default cvNative