import { loadOpenCV, type OpenCV } from '@opencvjs/web'

const cv: typeof OpenCV = await loadOpenCV()
let gammaTable = new Uint8Array(256)
let gamma = 1.0
let lut = cv.matFromArray(256, 1, cv.CV_8UC1, gammaTable)
let processedImg = new cv.Mat()

export function imgProcess(frame: ImageData, width: number, height: number,
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

  if (processedImg == null) {
    processedImg = new cv.Mat(height, width, cv.CV_8UC4)
  }

  if (processedImg.cols !== width || processedImg.rows !== height) {
    processedImg.delete()
    processedImg = new cv.Mat(height, width, cv.CV_8UC4)
  }

  // for (let i = 0; i < width * height * 4; i++) {
  //   processedImg.data[i] = frame.data[i]
  // }

  processedImg.data.set(frame.data)
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
      if (gamma !== params.gamma) {
        gamma = params.gamma
        for (let i = 0; i < 256; ++i) {
          gammaTable[i] = Math.pow(i / 255.0, 1 / gamma) * 255.0
          lut.data[i] = gammaTable[i]
        }
      }
      lut = cv.matFromArray(256, 1, cv.CV_8UC1, gammaTable)
      cv.LUT(processedImg, lut, processedImg)
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
  
  frame.data.set(processedImg.data)
  // const data = Uint8ClampedArray.from(processedImg.data)
  // let cols = processedImg.cols, rows = processedImg.rows
  // console.log('data', processedImg)
  // processedImg.delete()
  // return { data, width: cols, height: rows }
}