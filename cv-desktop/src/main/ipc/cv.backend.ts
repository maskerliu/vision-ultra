import { type OpenCV } from '@opencvjs/node'
import {
  cvBlur, cvBlurType, cvDetector, cvEqualizeHist,
  cvFilter, cvFilterType, cvMorph, cvSharpen, ICVAPI
} from '../../common'

export class CVBackend implements ICVAPI {
  private sharedData: Uint8ClampedArray
  private _options: any = {}

  public imgEnhance: boolean = false
  public imgProcessParams: any = {}
  public objectRects: Array<{ x: number, y: number, width: number, height: number }>

  private cvNode: typeof OpenCV

  private _isInited: boolean = false
  public get isInited() {
    return this._isInited
  }

  private gammaTable = new Uint8Array(256)
  private lut: OpenCV.Mat
  private processedImg: OpenCV.Mat
  private tmpImg: OpenCV.Mat

  private bgSubtractor: OpenCV.BackgroundSubtractorMOG2
  private termCrit: OpenCV.TermCriteria
  private trackWindow: OpenCV.Rect
  private roiHist: OpenCV.Mat
  private upper: OpenCV.Mat
  private lower: OpenCV.Mat
  private hsvVec: OpenCV.MatVector
  private gamma: number = 1.0


  async init(options?: any) {
    if (this.isInited) return

    this._isInited = false
    this._options = options
    const { loadOpenCV } = await import('@opencvjs/node')
    this.cvNode = await loadOpenCV()

    this.bgSubtractor = new this.cvNode.BackgroundSubtractorMOG2(500, 16, true)
    this.gamma = 1.0
    this.lut = this.cvNode.matFromArray(256, 1, this.cvNode.CV_8UC1, this.gammaTable)
    this.processedImg = new this.cvNode.Mat()
    this.tmpImg = new this.cvNode.Mat()

    this.termCrit = new this.cvNode.TermCriteria(this.cvNode.TermCriteria_EPS | this.cvNode.TermCriteria_COUNT, 10, 1)
    this.trackWindow = new this.cvNode.Rect(150, 60, 63, 125)
    let roi = new this.cvNode.Mat(this.trackWindow.width, this.trackWindow.height, this.cvNode.CV_8UC3, new this.cvNode.Scalar(0, 0, 0))
    this.upper = new this.cvNode.Mat(roi.rows, roi.cols, roi.type(), new this.cvNode.Scalar(30, 30, 0))
    this.lower = new this.cvNode.Mat(roi.rows, roi.cols, roi.type(), new this.cvNode.Scalar(180, 180, 180))
    let mask = new this.cvNode.Mat()
    this.cvNode.inRange(roi, this.lower, this.upper, mask)

    this.hsvVec = new this.cvNode.MatVector()

    this.roiHist = new this.cvNode.Mat()
    let roiVec = new this.cvNode.MatVector()
    roiVec.push_back(roi)
    this.cvNode.calcHist(roiVec, [0], mask, this.roiHist, [180], [0, 180])
    this.cvNode.normalize(this.roiHist, this.roiHist, 0, 255, this.cvNode.NORM_MINMAX)

    roi.delete()
    mask.delete()
    this.lower.delete()
    this.upper.delete()
    roiVec.delete()

    this._isInited = true

    return
  }

  terminate() {
    if (this.processedImg) this.processedImg.delete()
    if (this.tmpImg) this.tmpImg.delete()
    if (this.lut) this.lut.delete()
    if (this.hsvVec) this.hsvVec.delete()
    this._isInited = false
    this.cvNode = null
  }

  async process(image: ImageData) {
    try {
      return await this.imgProcess(image, this._options)
    } catch (err) {
      console.error(err)
    }
  }

  async imgProcess(frame: ImageData,
    params: Partial<{
      isGray: boolean,
      rotate: number,
      colorMap: number,
      morph: cvMorph,
      gamma: number,
      equalization: cvEqualizeHist,
      sharpen: cvSharpen,
      blur: cvBlur,
      filter: cvFilter,
      detector: cvDetector,
      canny: [number, number],
    }>) {

    if (this.processedImg == null) {
      this.processedImg = new this.cvNode.Mat(frame.height, frame.width, this.cvNode.CV_8UC4)
    }
    if (this.tmpImg == null) {
      this.tmpImg = new this.cvNode.Mat(frame.height, frame.width, this.cvNode.CV_8UC3)
    }

    if (this.processedImg.cols !== frame.width || this.processedImg.rows !== frame.height) {
      this.processedImg.delete()
      this.processedImg = new this.cvNode.Mat(frame.height, frame.width, this.cvNode.CV_8UC4)
    }

    if (this.tmpImg.cols !== frame.width || this.tmpImg.rows !== frame.height) {
      this.tmpImg.delete()
      this.hsvVec?.delete()
      this.tmpImg = new this.cvNode.Mat(frame.height, frame.width, this.cvNode.CV_8UC3)
      this.hsvVec = new this.cvNode.MatVector()
      this.hsvVec.push_back(this.tmpImg)
    }

    if (this.sharedData == null || this.sharedData.length !== frame.height * frame.width * 4) {
      this.sharedData = new Uint8ClampedArray(frame.height * frame.width * 4)
    }

    this.processedImg.data.set(frame.data, 0)
    this.cvNode.cvtColor(this.processedImg, this.processedImg, this.cvNode.COLOR_RGBA2BGR)
    if (this.tmpImg.type() != this.processedImg.type()) {
      this.tmpImg.delete()
      this.tmpImg = new this.cvNode.Mat(frame.height, frame.width, this.cvNode.CV_8UC3)
    }
    this.tmpImg.data.set(this.processedImg.data)

    if (params.colorMap != 0) this.cvNode.applyColorMap(this.processedImg, this.processedImg, params.colorMap - 1)

    if (params.isGray) {
      this.cvNode.cvtColor(this.processedImg, this.processedImg, this.cvNode.COLOR_BGR2GRAY)
      this.processedImg.copyTo(this.tmpImg)
    }

    if (params.rotate != 0) {
      let dsize = new this.cvNode.Size(frame.width, frame.height)
      let center = new this.cvNode.Point(frame.width / 2, frame.height / 2)
      let rotateMat = this.cvNode.getRotationMatrix2D(center, params.rotate, 1)
      this.cvNode.warpAffine(this.processedImg, this.processedImg, rotateMat, dsize)
      rotateMat.delete()
    }

    if (params.isGray && params.morph) this.morph(params.morph)
    if (params.isGray && params.equalization) this.equalization(params.equalization)
    if (params.gamma) this.gammaEnhance(params.gamma)
    if (params.blur) this.blur(params.blur)
    if (params.sharpen) this.sharpen(params.sharpen)

    let rects: Array<{ x: number, y: number, width: number, height: number }>
    if (params.detector) {
      try {
        rects = this.detect(params.detector[0], params.detector[1], params.detector[2])
      } catch (err) {
        console.error(err)
      }
    }

    if (params.isGray && params.filter) this.filtering(params.filter)

    if (params.isGray && params.canny) {
      this.cvNode.Canny(this.processedImg, this.processedImg, params.canny[0], params.canny[1])
    }

    if (params.isGray) {
      this.cvNode.cvtColor(this.processedImg, this.processedImg, this.cvNode.COLOR_GRAY2RGBA)
    } else {
      this.cvNode.cvtColor(this.processedImg, this.processedImg, this.cvNode.COLOR_BGR2RGBA)
    }
    frame.data.set(this.processedImg.data)

    // todo: return processed image
    if (params.isGray) {
      this.cvNode.cvtColor(this.processedImg, this.processedImg, this.cvNode.COLOR_GRAY2RGBA)
    } else {
      this.cvNode.cvtColor(this.processedImg, this.processedImg, this.cvNode.COLOR_BGR2RGBA)
    }
    this.sharedData.set(this.processedImg.data)
    return this.sharedData
  }


  private equalization(params: cvEqualizeHist) {
    switch (params[0]) {
      case 'equalizeHist':
        this.cvNode.equalizeHist(this.processedImg, this.processedImg)
        break
      case 'clahe':
        let clahe = new this.cvNode.CLAHE(params[1], new this.cvNode.Size(params[2], params[3]))
        clahe.apply(this.processedImg, this.processedImg)
        break
    }
  }

  private gammaEnhance(param: number) {
    if (this.gamma == param) return

    this.gamma = param
    for (let i = 0; i < 256; ++i) {
      this.gammaTable[i] = Math.pow(i / 255.0, 1 / this.gamma) * 255.0
      this.lut.data[i] = this.gammaTable[i]
    }
    this.lut = this.cvNode.matFromArray(256, 1, this.cvNode.CV_8UC1, this.gammaTable)
    this.cvNode.LUT(this.processedImg, this.lut, this.processedImg)
    this.cvNode.normalize(this.processedImg, this.processedImg, 0, 255, this.cvNode.NORM_MINMAX)
    this.cvNode.convertScaleAbs(this.processedImg, this.processedImg, 1, 0)
  }

  private blur(params: cvBlur) {
    try {
      switch (params[0]) {
        case cvBlurType.gaussian:
          if (params[1] % 2 !== 1 || params[2] % 2 !== 1) return
          this.cvNode.GaussianBlur(this.processedImg, this.processedImg, new this.cvNode.Size(params[1], params[2]), 0)
          break
        case cvBlurType.median:
          this.cvNode.medianBlur(this.processedImg, this.processedImg, params[3])
          break
        case cvBlurType.avg:
          this.cvNode.blur(this.processedImg, this.processedImg, new this.cvNode.Size(params[1], params[2]))
          break
        case cvBlurType.bilateral:
          try {
            this.cvNode.bilateralFilter(this.processedImg, this.processedImg,
              params[4], params[5], params[6], this.cvNode.BORDER_DEFAULT)
          } catch (err) {
            console.error(err)
          }
          break
      }

    } catch (err) {
      console.warn(err)
    }
  }

  private sharpen(sharpen: cvSharpen) {
    try {
      switch (sharpen[0]) {
        case 'laplace':
          this.cvNode.Laplacian(this.processedImg, this.tmpImg, -1)
          this.cvNode.addWeighted(this.processedImg, sharpen[1], this.tmpImg, sharpen[2], 0, this.processedImg)
          break
        case 'usm':
          this.cvNode.GaussianBlur(this.processedImg, this.tmpImg, new this.cvNode.Size(sharpen[1], sharpen[1]), 25)
          this.cvNode.addWeighted(this.processedImg, sharpen[1], this.tmpImg, sharpen[2], 0, this.processedImg)
          break
      }
    } catch (err) {
      console.warn(err)
    }

  }

  private filtering(filter: cvFilter) {
    try {
      switch (filter[0]) {
        case cvFilterType.sobel:
          if (filter[4] % 2 !== 1) return
          this.cvNode.Sobel(this.processedImg, this.processedImg, this.cvNode.CV_8U, filter[1], filter[2], filter[4], filter[3])
          break
        case cvFilterType.scharr:
          // dx + dy == 1 
          if (filter[1] + filter[2] !== 1) return
          this.cvNode.Scharr(this.processedImg, this.processedImg, this.cvNode.CV_8U, filter[1], filter[2], filter[3])
          break
        case cvFilterType.laplace:
          if (filter[4] % 2 !== 1) return
          this.cvNode.Laplacian(this.processedImg, this.processedImg, this.cvNode.CV_8U, filter[4], filter[3])
          break
      }

    } catch (err) {
      console.warn(err)
    }

  }

  private morph(params: cvMorph) {
    try {
      let M: any
      if (params[1] == undefined || params[2] == undefined || params[3] == undefined || params[1] < 0 || params[2] < 0 || params[3] < 0) return
      let ksize = new this.cvNode.Size(params[1], params[2])
      M = this.cvNode.getStructuringElement(this.cvNode.MORPH_CROSS, ksize)
      this.cvNode.morphologyEx(this.processedImg, this.processedImg, params[0], M, new this.cvNode.Point(-1, -1), params[3])
      M.delete()
    } catch (err) {
      console.warn(err)
    }
  }

  // 使用背景减除方法
  private detect(type: string, threshold: number, minSize: number) {
    let kernel: OpenCV.Mat
    switch (type) {
      case 'color':
        this.cvNode.cvtColor(this.processedImg, this.tmpImg, this.cvNode.COLOR_BGR2HSV)
        if (this.lower.rows !== this.tmpImg.rows || this.lower.cols !== this.tmpImg.cols) {
          this.lower.delete()
          this.lower = new this.cvNode.Mat(this.tmpImg.rows, this.tmpImg.cols, this.cvNode.CV_8UC3)
        }
        if (this.upper.rows !== this.tmpImg.rows || this.upper.cols !== this.tmpImg.cols) {
          this.upper.delete()
          this.upper = new this.cvNode.Mat(this.tmpImg.rows, this.tmpImg.cols, this.cvNode.CV_8UC3)
        }
        // 定义颜色范围
        this.lower.setTo([30, 30, 100 - threshold, 255])
        this.upper.setTo([180, 180, 100 + threshold, 255])

        // 创建颜色掩码
        this.cvNode.inRange(this.tmpImg, this.lower, this.upper, this.tmpImg)

        // 形态学操作
        kernel = this.cvNode.getStructuringElement(this.cvNode.MORPH_ELLIPSE, new this.cvNode.Size(5, 5))
        this.cvNode.morphologyEx(this.tmpImg, this.tmpImg, this.cvNode.MORPH_OPEN, kernel)
        this.cvNode.morphologyEx(this.tmpImg, this.tmpImg, this.cvNode.MORPH_CLOSE, kernel)
        this.cvNode.GaussianBlur(this.tmpImg, this.tmpImg, new this.cvNode.Size(5, 5), 0)
        break
      case 'contour':
        this.cvNode.cvtColor(this.processedImg, this.tmpImg, this.cvNode.COLOR_RGBA2GRAY)
        this.cvNode.GaussianBlur(this.tmpImg, this.tmpImg, new this.cvNode.Size(5, 5), 0)
        this.cvNode.Canny(this.tmpImg, this.tmpImg, threshold, threshold * 2)
        break
      case 'bgSub':
        this.cvNode.cvtColor(this.processedImg, this.tmpImg, this.cvNode.COLOR_RGBA2GRAY)
        this.bgSubtractor.apply(this.tmpImg, this.tmpImg)
        this.cvNode.threshold(this.tmpImg, this.tmpImg, threshold * 2.55, 255, this.cvNode.THRESH_BINARY)
        // 形态学操作（去除噪声）
        kernel = this.cvNode.getStructuringElement(this.cvNode.MORPH_ELLIPSE, new this.cvNode.Size(3, 3))
        this.cvNode.morphologyEx(this.tmpImg, this.tmpImg, this.cvNode.MORPH_OPEN, kernel)
        break
      case 'camShift':
        this.cvNode.cvtColor(this.processedImg, this.tmpImg, this.cvNode.COLOR_BGR2HSV)
        this.cvNode.calcBackProject(this.hsvVec, [0], this.roiHist, this.tmpImg, [0, 180], 1)
        let result = this.cvNode.CamShift(this.tmpImg, this.trackWindow, this.termCrit)
        let pts = this.cvNode.boxPoints(result).map((p) => ({ x: p.x, y: p.y }))
        break
    }

    let contours = new this.cvNode.MatVector()
    let hierarchy = new this.cvNode.Mat()
    this.cvNode.findContours(this.tmpImg, contours, hierarchy, this.cvNode.RETR_EXTERNAL, this.cvNode.CHAIN_APPROX_SIMPLE)

    let rects = new Array()
    for (let i = 0; i < contours.size(); ++i) {
      let contour = contours.get(i)
      if (this.cvNode.contourArea(contour) < minSize) continue
      let rect = this.cvNode.boundingRect(contour)
      rects.push({ x: rect.x, y: rect.y, width: rect.width, height: rect.height })
    }

    kernel?.delete()
    contours.delete()
    hierarchy.delete()
    return rects
  }


  findContours(data: Uint8Array, width: number, height: number) {
    if (!this._isInited) return []

    let src = new this.cvNode.Mat(height, width, this.cvNode.CV_8UC1)
    src.data.set(data)
    let contours = new this.cvNode.MatVector()
    let hierarchy = new this.cvNode.Mat()
    let M: any
    let ksize = new this.cvNode.Size(2, 2)
    M = this.cvNode.getStructuringElement(this.cvNode.MORPH_CROSS, ksize)
    this.cvNode.morphologyEx(src, src, this.cvNode.MORPH_DILATE, M, new this.cvNode.Point(-1, -1), 1)
    // cv.morphologyEx(src, src, cv.MORPH_DILATE, M, new cv.Point(-1, -1), 1)
    M.delete()
    this.cvNode.findContours(src, contours, hierarchy, this.cvNode.RETR_EXTERNAL, this.cvNode.CHAIN_APPROX_SIMPLE)

    let maxArea = 0
    let maxCnt: any
    for (let i = 0; i < contours.size(); ++i) {
      let cnt = contours.get(i)
      let area = this.cvNode.contourArea(cnt)
      if (area > maxArea) {
        if (maxCnt) maxCnt.delete()
        maxArea = area
        maxCnt = cnt
      } else {
        cnt.delete()
      }
    }
    let finalCoordinates = []
    if (maxCnt) {
      let cnt = contours.get(maxCnt)

      // 计算轮廓周长，用于设定逼近精度
      let epsilon = 0.008 * this.cvNode.arcLength(cnt, true)
      let approx = new this.cvNode.Mat()

      // 关键函数：进行多边形逼近，得到平滑边框
      this.cvNode.approxPolyDP(cnt, approx, epsilon, true)

      for (let i = 0; i < approx.rows; i++) {
        finalCoordinates.push([approx.data32S[i * 2], approx.data32S[i * 2 + 1]]) // 以 [x, y] 数组形式存储
      }
      approx.delete()
    }

    src.delete()
    contours.delete()
    hierarchy.delete()

    return finalCoordinates
  }
}

const cvBackend = new CVBackend()

export default cvBackend