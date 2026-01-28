import { OpenCV } from '@opencvjs/web'
import {
  cvBlur, cvBlurType, cvDetector, cvEqualizeHist, cvFilter,
  cvFilterType, cvMorph, cvSharpen
} from '../../shared'

export class CVProcessor {
  private _options: any = {}
  set options(options: any) { this._options = options }

  private cv: typeof OpenCV

  private _isInited: boolean = false
  public get isInited() { return this._isInited }

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
    this._options = options
    this._isInited = false

    const { loadOpenCV } = await import('@opencvjs/web')
    this.cv = await loadOpenCV()

    this.bgSubtractor = new this.cv.BackgroundSubtractorMOG2(500, 16, true)
    this.gamma = 1.0
    this.lut = this.cv.matFromArray(256, 1, this.cv.CV_8UC1, this.gammaTable)
    this.processedImg = new this.cv.Mat()
    this.tmpImg = new this.cv.Mat()

    this.termCrit = new this.cv.TermCriteria(this.cv.TermCriteria_EPS | this.cv.TermCriteria_COUNT, 10, 1)
    this.trackWindow = new this.cv.Rect(150, 60, 63, 125)
    let roi = new this.cv.Mat(this.trackWindow.width, this.trackWindow.height, this.cv.CV_8UC3, new this.cv.Scalar(0, 0, 0))
    this.upper = new this.cv.Mat(roi.rows, roi.cols, roi.type(), new this.cv.Scalar(30, 30, 0))
    this.lower = new this.cv.Mat(roi.rows, roi.cols, roi.type(), new this.cv.Scalar(180, 180, 180))
    let mask = new this.cv.Mat()
    this.cv.inRange(roi, this.lower, this.upper, mask)

    this.hsvVec = new this.cv.MatVector()

    this.roiHist = new this.cv.Mat()
    let roiVec = new this.cv.MatVector()
    roiVec.push_back(roi)
    this.cv.calcHist(roiVec, [0], mask, this.roiHist, [180], [0, 180])
    this.cv.normalize(this.roiHist, this.roiHist, 0, 255, this.cv.NORM_MINMAX)

    roi.delete()
    mask.delete()
    this.lower.delete()
    this.upper.delete()
    roiVec.delete()

    this._isInited = true
  }

  dispose() {
    if (this.processedImg) this.processedImg.delete()
    if (this.tmpImg) this.tmpImg.delete()
    if (this.lut) this.lut.delete()
    if (this.hsvVec) this.hsvVec.delete()
    this._isInited = false
    this.cv = null
  }

  async process(image: ImageData) {
    try {
      return await this.imgProcess(image, this._options)
    } catch (err) {
      console.error(err)
    }
  }

  private async imgProcess(frame: ImageData,
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
    if (!this._isInited) throw Error('processor not inited!!')

    if (this.processedImg == null) {
      this.processedImg = new this.cv.Mat(frame.height, frame.width, this.cv.CV_8UC4)
    }
    if (this.tmpImg == null) {
      this.tmpImg = new this.cv.Mat(frame.height, frame.width, this.cv.CV_8UC3)
    }

    if (this.processedImg.cols !== frame.width || this.processedImg.rows !== frame.height) {
      this.processedImg.delete()
      this.processedImg = new this.cv.Mat(frame.height, frame.width, this.cv.CV_8UC4)
    }

    if (this.tmpImg.cols !== frame.width || this.tmpImg.rows !== frame.height) {
      this.tmpImg.delete()
      this.hsvVec?.delete()
      this.tmpImg = new this.cv.Mat(frame.height, frame.width, this.cv.CV_8UC3)
      this.hsvVec = new this.cv.MatVector()
      this.hsvVec.push_back(this.tmpImg)
    }

    this.processedImg.data.set(frame.data, 0)
    this.cv.cvtColor(this.processedImg, this.processedImg, this.cv.COLOR_RGBA2BGR)
    if (this.tmpImg.type() != this.processedImg.type()) {
      this.tmpImg.delete()
      this.tmpImg = new this.cv.Mat(frame.height, frame.width, this.cv.CV_8UC3)
    }
    this.tmpImg.data.set(this.processedImg.data)

    if (params.colorMap != null && params.colorMap != 0)
      this.cv.applyColorMap(this.processedImg, this.processedImg, params.colorMap - 1)

    if (params.isGray) {
      this.cv.cvtColor(this.processedImg, this.processedImg, this.cv.COLOR_BGR2GRAY)
      this.processedImg.copyTo(this.tmpImg)
    }

    if (params.rotate != null && params.rotate != 0) {
      let dsize = new this.cv.Size(frame.width, frame.height)
      let center = new this.cv.Point(frame.width / 2, frame.height / 2)
      let rotateMat = this.cv.getRotationMatrix2D(center, params.rotate, 1)
      this.cv.warpAffine(this.processedImg, this.processedImg, rotateMat, dsize)
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
      this.cv.Canny(this.processedImg, this.processedImg, params.canny[0], params.canny[1])
    }

    if (params.isGray) {
      this.cv.cvtColor(this.processedImg, this.processedImg, this.cv.COLOR_GRAY2RGBA)
    } else {
      this.cv.cvtColor(this.processedImg, this.processedImg, this.cv.COLOR_BGR2RGBA)
    }

    frame.data.set(this.processedImg.data)

    return frame
  }

  private equalization(params: cvEqualizeHist) {
    switch (params[0]) {
      case 'equalizeHist':
        this.cv.equalizeHist(this.processedImg, this.processedImg)
        break
      case 'clahe':
        let clahe = new this.cv.CLAHE(params[1], new this.cv.Size(params[2], params[3]))
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
    this.lut = this.cv.matFromArray(256, 1, this.cv.CV_8UC1, this.gammaTable)
    this.cv.LUT(this.processedImg, this.lut, this.processedImg)
    this.cv.normalize(this.processedImg, this.processedImg, 0, 255, this.cv.NORM_MINMAX)
    this.cv.convertScaleAbs(this.processedImg, this.processedImg, 1, 0)
  }

  private blur(params: cvBlur) {
    try {
      switch (params[0]) {
        case cvBlurType.gaussian:
          if (params[1] % 2 !== 1 || params[2] % 2 !== 1) return
          this.cv.GaussianBlur(this.processedImg, this.processedImg, new this.cv.Size(params[1], params[2]), 0)
          break
        case cvBlurType.median:
          this.cv.medianBlur(this.processedImg, this.processedImg, params[3])
          break
        case cvBlurType.avg:
          this.cv.blur(this.processedImg, this.processedImg, new this.cv.Size(params[1], params[2]))
          break
        case cvBlurType.bilateral:
          try {
            this.cv.bilateralFilter(this.processedImg, this.processedImg,
              params[4], params[5], params[6], this.cv.BORDER_DEFAULT)
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
          this.cv.Laplacian(this.processedImg, this.tmpImg, -1)
          this.cv.addWeighted(this.processedImg, sharpen[1], this.tmpImg, sharpen[2], 0, this.processedImg)
          break
        case 'usm':
          this.cv.GaussianBlur(this.processedImg, this.tmpImg, new this.cv.Size(sharpen[1], sharpen[1]), 25)
          this.cv.addWeighted(this.processedImg, sharpen[1], this.tmpImg, sharpen[2], 0, this.processedImg)
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
          this.cv.Sobel(this.processedImg, this.processedImg, this.cv.CV_8U, filter[1], filter[2], filter[4], filter[3])
          break
        case cvFilterType.scharr:
          // dx + dy == 1 
          if (filter[1] + filter[2] !== 1) return
          this.cv.Scharr(this.processedImg, this.processedImg, this.cv.CV_8U, filter[1], filter[2], filter[3])
          break
        case cvFilterType.laplace:
          if (filter[4] % 2 !== 1) return
          this.cv.Laplacian(this.processedImg, this.processedImg, this.cv.CV_8U, filter[4], filter[3])
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
      let ksize = new this.cv.Size(params[1], params[2])
      M = this.cv.getStructuringElement(this.cv.MORPH_CROSS, ksize)
      this.cv.morphologyEx(this.processedImg, this.processedImg, params[0], M, new this.cv.Point(-1, -1), params[3])
      M.delete()
    } catch (err) {
      console.warn(err)
    }
  }

  private detect(type: string, threshold: number, minSize: number) {
    let kernel: OpenCV.Mat
    switch (type) {
      case 'color':
        this.cv.cvtColor(this.processedImg, this.tmpImg, this.cv.COLOR_BGR2HSV)
        if (this.lower.rows !== this.tmpImg.rows || this.lower.cols !== this.tmpImg.cols) {
          this.lower.delete()
          this.lower = new this.cv.Mat(this.tmpImg.rows, this.tmpImg.cols, this.cv.CV_8UC3)
        }
        if (this.upper.rows !== this.tmpImg.rows || this.upper.cols !== this.tmpImg.cols) {
          this.upper.delete()
          this.upper = new this.cv.Mat(this.tmpImg.rows, this.tmpImg.cols, this.cv.CV_8UC3)
        }
        // 定义颜色范围
        this.lower.setTo([30, 30, 100 - threshold, 255])
        this.upper.setTo([180, 180, 100 + threshold, 255])

        // 创建颜色掩码
        this.cv.inRange(this.tmpImg, this.lower, this.upper, this.tmpImg)

        // 形态学操作
        kernel = this.cv.getStructuringElement(this.cv.MORPH_ELLIPSE, new this.cv.Size(5, 5))
        this.cv.morphologyEx(this.tmpImg, this.tmpImg, this.cv.MORPH_OPEN, kernel)
        this.cv.morphologyEx(this.tmpImg, this.tmpImg, this.cv.MORPH_CLOSE, kernel)
        this.cv.GaussianBlur(this.tmpImg, this.tmpImg, new this.cv.Size(5, 5), 0)
        break
      case 'contour':
        this.cv.cvtColor(this.processedImg, this.tmpImg, this.cv.COLOR_RGBA2GRAY)
        this.cv.GaussianBlur(this.tmpImg, this.tmpImg, new this.cv.Size(5, 5), 0)
        this.cv.Canny(this.tmpImg, this.tmpImg, threshold, threshold * 2)
        break
      case 'bgSub':
        this.cv.cvtColor(this.processedImg, this.tmpImg, this.cv.COLOR_RGBA2GRAY)
        this.bgSubtractor.apply(this.tmpImg, this.tmpImg)
        this.cv.threshold(this.tmpImg, this.tmpImg, threshold * 2.55, 255, this.cv.THRESH_BINARY)
        // 形态学操作（去除噪声）
        kernel = this.cv.getStructuringElement(this.cv.MORPH_ELLIPSE, new this.cv.Size(3, 3))
        this.cv.morphologyEx(this.tmpImg, this.tmpImg, this.cv.MORPH_OPEN, kernel)
        break
      case 'camShift':
        this.cv.cvtColor(this.processedImg, this.tmpImg, this.cv.COLOR_BGR2HSV)
        this.cv.calcBackProject(this.hsvVec, [0], this.roiHist, this.tmpImg, [0, 180], 1)
        let result = this.cv.CamShift(this.tmpImg, this.trackWindow, this.termCrit)
        let pts = this.cv.boxPoints(result).map((p) => ({ x: p.x, y: p.y }))
        break
    }

    let contours = new this.cv.MatVector()
    let hierarchy = new this.cv.Mat()
    this.cv.findContours(this.tmpImg, contours, hierarchy, this.cv.RETR_EXTERNAL, this.cv.CHAIN_APPROX_SIMPLE)

    let rects = new Array()
    for (let i = 0; i < contours.size(); ++i) {
      let contour = contours.get(i)
      if (this.cv.contourArea(contour) < minSize) continue
      let rect = this.cv.boundingRect(contour)
      rects.push({ x: rect.x, y: rect.y, width: rect.width, height: rect.height })
    }

    kernel?.delete()
    contours.delete()
    hierarchy.delete()
    return rects
  }


  findContours(data: Uint8Array, width: number, height: number) {
    if (!this._isInited) return []

    let src = new this.cv.Mat(height, width, this.cv.CV_8UC1)
    src.data.set(data)
    let contours = new this.cv.MatVector()
    let hierarchy = new this.cv.Mat()
    let M: any
    let ksize = new this.cv.Size(2, 2)
    M = this.cv.getStructuringElement(this.cv.MORPH_CROSS, ksize)
    this.cv.morphologyEx(src, src, this.cv.MORPH_DILATE, M, new this.cv.Point(-1, -1), 1)
    // cv.morphologyEx(src, src, cv.MORPH_DILATE, M, new cv.Point(-1, -1), 1)
    M.delete()
    this.cv.findContours(src, contours, hierarchy, this.cv.RETR_EXTERNAL, this.cv.CHAIN_APPROX_SIMPLE)

    let maxArea = 0
    let maxCnt: any
    for (let i = 0; i < contours.size(); ++i) {
      let cnt = contours.get(i)
      let area = this.cv.contourArea(cnt)
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
      let epsilon = 0.008 * this.cv.arcLength(cnt, true)
      let approx = new this.cv.Mat()
      this.cv.approxPolyDP(cnt, approx, epsilon, true)

      for (let i = 0; i < approx.rows; i++) {
        finalCoordinates.push([approx.data32S[i * 2], approx.data32S[i * 2 + 1]])
      }
      approx.delete()
    }

    src.delete()
    contours.delete()
    hierarchy.delete()

    return finalCoordinates
  }
}