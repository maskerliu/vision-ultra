import { loadOpenCV, type OpenCV } from '@opencvjs/web'
import { cvBlur, cvFilter, cvSharpen } from '../store'

const cv: typeof OpenCV = await loadOpenCV()
let gammaTable = new Uint8Array(256)
let gamma = 1.0
let lut = cv.matFromArray(256, 1, cv.CV_8UC1, gammaTable)
let processedImg = new cv.Mat()
let tmpImg = new cv.Mat()
let dsize = new cv.Size(0, 0)
let center = new cv.Point(0, 0)
let rotateMat = new cv.Mat()

export function imgProcess(frame: ImageData, width: number, height: number,
  params: Partial<{
    isGray: boolean,
    equalizeHist: boolean,
    rotate: number,
    gamma: number,
    equalization: cvSharpen,
    blur: cvBlur,
    sharpen: cvSharpen,
    filter: cvFilter,
    cannyThreshold: [number, number],
  }>) {

  if (processedImg == null) {
    processedImg = new cv.Mat(height, width, cv.CV_8UC4)
  }
  if (tmpImg == null) {
    tmpImg = new cv.Mat(height, width, cv.CV_8UC3)
  }

  if (processedImg.cols !== width || processedImg.rows !== height) {
    processedImg.delete()
    processedImg = new cv.Mat(height, width, cv.CV_8UC4)
  }

  if (tmpImg.cols !== width || tmpImg.rows !== height) {
    tmpImg.delete()
    tmpImg = new cv.Mat(height, width, cv.CV_8UC3)
  }

  processedImg.data.set(frame.data, 0)
  cv.cvtColor(processedImg, processedImg, cv.COLOR_RGBA2BGR)
  if (tmpImg.type() != processedImg.type()) {
    tmpImg.delete()
    tmpImg = new cv.Mat(height, width, cv.CV_8UC3)
  }
  tmpImg.data.set(processedImg.data)

  if (params.isGray) {
    cv.cvtColor(processedImg, processedImg, cv.COLOR_BGR2GRAY)
    cv.cvtColor(tmpImg, tmpImg, cv.COLOR_BGR2GRAY)
  }

  if (params.rotate != 0) {
    dsize.width = width
    dsize.height = height
    center.x = width / 2
    center.y = height / 2
    // You can try more different parameters
    rotateMat = cv.getRotationMatrix2D(center, params.rotate, 1)
    cv.warpAffine(processedImg, processedImg, rotateMat, dsize)
    rotateMat.delete()
  }

  if (params.isGray && params.equalization) {
    if (params.equalization[0] === 'equalizeHist') {
      cv.equalizeHist(processedImg, processedImg)
    }

    if (params.equalization[0] === 'clahe') {
      let clahe = new cv.CLAHE(params.equalization[1], new cv.Size(params.equalization[2], params.equalization[3]))
      clahe.apply(processedImg, processedImg)
    }
  }

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

  if (params.blur) {
    if (params.blur[0] === 'gaussian' && params.blur[1] % 2 == 1 && params.blur[2] % 2 == 1) {
      cv.GaussianBlur(processedImg, processedImg, new cv.Size(params.blur[1], params.blur[2]), 0)
    }
    if (params.blur[0] === 'median') {
      cv.medianBlur(processedImg, processedImg, params.blur[3])
    }
    if (params.blur[0] === 'avg') {
      cv.blur(processedImg, processedImg, new cv.Size(params.blur[1], params.blur[2]))
    }
    if (params.blur[0] === 'bilateral') {
      try {
        cv.bilateralFilter(processedImg, processedImg, params.blur[4], params.blur[5], params.blur[6], cv.BORDER_DEFAULT)
      } catch (err) {
        console.error(err)
      }
    }
  }


  if (params.sharpen && params.sharpen[0] === 'laplace') {
    cv.Laplacian(processedImg, tmpImg, -1)
    cv.addWeighted(processedImg, params.sharpen[1], tmpImg, params.sharpen[2], 0, processedImg)
  }

  if (params.sharpen && params.sharpen[0] === 'usm') {
    cv.GaussianBlur(processedImg, tmpImg, new cv.Size(params.sharpen[1], params.sharpen[1]), 25)
    cv.addWeighted(processedImg, params.sharpen[1], tmpImg, params.sharpen[2], 0, processedImg)
  }
  // let hsv = originFrame.cvtColor(cv.COLOR_BGR2HSV)

  let kernel = cv.matFromArray(3, 3, cv.CV_8UC1, [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0])
  // cv.GaussianBlur(processedImg, processedImg, new cv.Size(7, 7), 10)
  // cv.subtract(tmpImg, processedImg, processedImg)
  // cv.Laplacian(tmpImg, processedImg, cv.CV_8U, 1, 3)
  // cv.filter2D(tmpImg, processedImg, cv.CV_8UC3, kernel)
  // cv.addWeighted(tmpImg, 1.5, processedImg, -0.5, 0, processedImg)
  if (params.isGray && params.filter && params.filter[0] === 'sobel' && params.filter[4] % 2 == 1) {
    cv.Sobel(processedImg, processedImg, cv.CV_8U, params.filter[1], params.filter[2], params.filter[4], params.filter[3])
  }

  if (params.isGray && params.filter && params.filter[0] === 'scharr' && (params.filter[1] + params.filter[2] == 1)) {
    // dx + dy == 1 
    cv.Scharr(processedImg, processedImg, cv.CV_8U, params.filter[1], params.filter[2], params.filter[3])
  }

  if (params.isGray && params.filter && params.filter[0] === 'laplace' && params.filter[4] % 2 == 1) {
    cv.Laplacian(processedImg, processedImg, cv.CV_8U, params.filter[4], params.filter[3])
  }


  if (params.isGray && params.cannyThreshold) {
    cv.Canny(processedImg, processedImg, params.cannyThreshold[0], params.cannyThreshold[1])
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