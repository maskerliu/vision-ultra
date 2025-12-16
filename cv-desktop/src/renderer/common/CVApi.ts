import { loadOpenCV, type OpenCV } from '@opencvjs/web'
import { cvBlur, cvEqualizeHist, cvFilter, cvSharpen, cvDetector} from '../store'
import { Open } from 'webpack-dev-server'

const cv: typeof OpenCV = await loadOpenCV()
let gammaTable = new Uint8Array(256)
let gamma = 1.0
let lut = cv.matFromArray(256, 1, cv.CV_8UC1, gammaTable)
let processedImg = new cv.Mat()
let tmpImg = new cv.Mat()
let dsize = new cv.Size(0, 0)
let center = new cv.Point(0, 0)
let rotateMat = new cv.Mat()

let termCrit = new cv.TermCriteria(cv.TermCriteria_EPS | cv.TermCriteria_COUNT, 10, 1)
let trackWindow = new cv.Rect(150, 60, 63, 125)
let roi = new cv.Mat(trackWindow.width, trackWindow.height, cv.CV_8UC3, new cv.Scalar(0, 0, 0))
let upper = new cv.Mat(roi.rows, roi.cols, roi.type(), new cv.Scalar(30, 30, 0))
let lower = new cv.Mat(roi.rows, roi.cols, roi.type(), new cv.Scalar(180, 180, 180))
let mask = new cv.Mat()
cv.inRange(roi, lower, upper, mask)


let roiHist = new cv.Mat()
let roiVec = new cv.MatVector()
roiVec.push_back(roi)
cv.calcHist(roiVec, [0], mask, roiHist, [180], [0, 180])
cv.normalize(roiHist, roiHist, 0, 255, cv.NORM_MINMAX)

roi.delete()
mask.delete()
lower.delete()
upper.delete()
roiVec.delete()

let hsvVec: OpenCV.MatVector

const bgSubtractor = new cv.BackgroundSubtractorMOG2(500, 16, true)


export function release() {
  processedImg.delete()
  tmpImg.delete()
  rotateMat.delete()
  lut.delete()
  gammaTable = null
  lut = null
  processedImg = null
  tmpImg = null
  dsize = null
  center = null
  rotateMat = null
  gammaTable = null
}

export function imgProcess(frame: ImageData, width: number, height: number,
  params: Partial<{
    isGray: boolean,
    rotate: number,
    colorMap: number,
    gamma: number,
    equalization: cvEqualizeHist,
    sharpen: cvSharpen,
    blur: cvBlur,
    filter: cvFilter,
    detector: cvDetector,
    canny: [number, number],
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
    hsvVec?.delete()
    tmpImg = new cv.Mat(height, width, cv.CV_8UC3)
    hsvVec = new cv.MatVector()
    hsvVec.push_back(tmpImg)
  }

  processedImg.data.set(frame.data, 0)
  cv.cvtColor(processedImg, processedImg, cv.COLOR_RGBA2BGR)
  if (tmpImg.type() != processedImg.type()) {
    tmpImg.delete()
    tmpImg = new cv.Mat(height, width, cv.CV_8UC3)
  }
  tmpImg.data.set(processedImg.data)

  if (params.colorMap != 0) cv.applyColorMap(processedImg, processedImg, params.colorMap - 1)

  if (params.isGray) {
    cv.cvtColor(processedImg, processedImg, cv.COLOR_BGR2GRAY)
    processedImg.copyTo(tmpImg)
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

  if (params.isGray && params.equalization) equalization(params.equalization)
  if (params.gamma) gammaEnhance(params.gamma)
  if (params.blur) blur(params.blur)
  if (params.sharpen) sharpen(params.sharpen)


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

  if (params.isGray && params.filter) filtering(params.filter)

  let rects: Array<{ x: number, y: number, width: number, height: number }>
  if (params.detector) {
    try {
      rects = detect(params.detector[0], processedImg, params.detector[1], params.detector[2])
    } catch (err) {
      console.error(err)
    }

  }

  if (params.isGray && params.canny) {
    cv.Canny(processedImg, processedImg, params.canny[0], params.canny[1])
  }

  if (params.isGray) {
    cv.cvtColor(processedImg, processedImg, cv.COLOR_GRAY2RGBA)
  } else {
    cv.cvtColor(processedImg, processedImg, cv.COLOR_BGR2RGBA)
  }
  frame.data.set(processedImg.data)

  return rects
  // const data = Uint8ClampedArray.from(processedImg.data)
  // let cols = processedImg.cols, rows = processedImg.rows
  // console.log('data', processedImg)
  // processedImg.delete()
  // return { data, width: cols, height: rows }
}

function equalization(params: cvEqualizeHist) {
  switch (params[0]) {
    case 'equalizeHist':
      cv.equalizeHist(processedImg, processedImg)
      break
    case 'clahe':
      let clahe = new cv.CLAHE(params[1], new cv.Size(params[2], params[3]))
      clahe.apply(processedImg, processedImg)
      break
  }
}

function gammaEnhance(param: number) {
  if (gamma !== param) {
    gamma = param
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

function blur(params: cvBlur) {
  switch (params[0]) {
    case 'gaussian':
      if (params[1] % 2 !== 1 || params[2] % 2 !== 1) return
      cv.GaussianBlur(processedImg, processedImg, new cv.Size(params[1], params[2]), 0)
      break
    case 'median':
      cv.medianBlur(processedImg, processedImg, params[3])
      break
    case 'avg':
      cv.blur(processedImg, processedImg, new cv.Size(params[1], params[2]))
      break
    case 'bilateral':
      try {
        cv.bilateralFilter(processedImg, processedImg, params[4], params[5], params[6], cv.BORDER_DEFAULT)
      } catch (err) {
        console.error(err)
      }
      break
  }
}

function sharpen(sharpen: cvSharpen) {
  switch (sharpen[0]) {
    case 'laplace':
      cv.Laplacian(processedImg, tmpImg, -1)
      cv.addWeighted(processedImg, sharpen[1], tmpImg, sharpen[2], 0, processedImg)
      break
    case 'usm':
      cv.GaussianBlur(processedImg, tmpImg, new cv.Size(sharpen[1], sharpen[1]), 25)
      cv.addWeighted(processedImg, sharpen[1], tmpImg, sharpen[2], 0, processedImg)
      break
  }
}

function filtering(filter: cvFilter) {
  switch (filter[0]) {
    case 'sobel':
      if (filter[4] % 2 !== 1) return
      cv.Sobel(processedImg, processedImg, cv.CV_8U, filter[1], filter[2], filter[4], filter[3])
      break
    case 'scharr':
      // dx + dy == 1 
      if (filter[1] + filter[2] !== 1) return
      cv.Scharr(processedImg, processedImg, cv.CV_8U, filter[1], filter[2], filter[3])
      break
    case 'laplace':
      if (filter[4] % 2 !== 1) return
      cv.Laplacian(processedImg, processedImg, cv.CV_8U, filter[4], filter[3])
      break
  }
  if (filter[0] === 'sobel' && filter[4] % 2 == 1) {
    cv.Sobel(processedImg, processedImg, cv.CV_8U, filter[1], filter[2], filter[4], filter[3])
  }

  if (filter[0] === 'scharr' && (filter[1] + filter[2] == 1)) {
    // dx + dy == 1 
    cv.Scharr(processedImg, processedImg, cv.CV_8U, filter[1], filter[2], filter[3])
  }

  if (filter[0] === 'laplace' && filter[4] % 2 == 1) {
    cv.Laplacian(processedImg, processedImg, cv.CV_8U, filter[4], filter[3])
  }
}

// 使用背景减除方法
function detect(type: string, src: OpenCV.Mat, threshold: number, minSize: number) {

  let kernel: OpenCV.Mat

  switch (type) {
    case 'color':
      cv.cvtColor(processedImg, tmpImg, cv.COLOR_BGR2HSV)
      if (lower.rows !== tmpImg.rows || lower.cols !== tmpImg.cols) {
        lower.delete()
        lower = new cv.Mat(tmpImg.rows, tmpImg.cols, cv.CV_8UC3)
      }
      if (upper.rows !== tmpImg.rows || upper.cols !== tmpImg.cols) {
        upper.delete()
        upper = new cv.Mat(tmpImg.rows, tmpImg.cols, cv.CV_8UC3)
      }
      // 定义颜色范围
      lower.setTo([30, 30, 100 - threshold, 255])
      upper.setTo([180, 180, 100 + threshold, 255])

      // 创建颜色掩码
      cv.inRange(tmpImg, lower, upper, tmpImg)

      // 形态学操作
      kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(5, 5))
      cv.morphologyEx(tmpImg, tmpImg, cv.MORPH_OPEN, kernel)
      cv.morphologyEx(tmpImg, tmpImg, cv.MORPH_CLOSE, kernel)
      cv.GaussianBlur(tmpImg, tmpImg, new cv.Size(5, 5), 0)
      break
    case 'contour':
      cv.cvtColor(src, tmpImg, cv.COLOR_RGBA2GRAY)
      cv.GaussianBlur(tmpImg, tmpImg, new cv.Size(5, 5), 0)
      cv.Canny(tmpImg, tmpImg, threshold, threshold * 2)
      break
    case 'bgSub':
      cv.cvtColor(src, tmpImg, cv.COLOR_RGBA2GRAY)
      bgSubtractor.apply(tmpImg, tmpImg)
      cv.threshold(tmpImg, tmpImg, threshold * 2.55, 255, cv.THRESH_BINARY)
      // 形态学操作（去除噪声）
      kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3))
      cv.morphologyEx(tmpImg, tmpImg, cv.MORPH_OPEN, kernel)
      break
    case 'camShift':
      cv.cvtColor(processedImg, tmpImg, cv.COLOR_BGR2HSV)
      cv.calcBackProject(hsvVec, [0], roiHist, tmpImg, [0, 180], 1)
      let result = cv.CamShift(tmpImg, trackWindow, termCrit)
      let pts = cv.boxPoints(result).map((p) => ({ x: p.x, y: p.y }))
      break
  }

  let contours = new cv.MatVector()
  let hierarchy = new cv.Mat()
  cv.findContours(tmpImg, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

  let rects = new Array()
  for (let i = 0; i < contours.size(); ++i) {
    let contour = contours.get(i)
    if (cv.contourArea(contour) < minSize) continue
    let rect = cv.boundingRect(contour)
    rects.push({ x: rect.x, y: rect.y, width: rect.width, height: rect.height })
  }

  kernel?.delete()
  contours.delete()
  hierarchy.delete()
  return rects
}

