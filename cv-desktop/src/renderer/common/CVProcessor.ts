import { OpenCV } from '@opencvjs/web'
import { showNotify } from 'vant'
import {
  ICVAPI, cvBlur, cvBlurType, cvDetector, cvEqualizeHist, cvFilter,
  cvFilterType, cvMorph, cvSharpen
} from '../../common'
import { IntergrateMode } from './misc'

export class CVProcessor {
  public _mode: IntergrateMode = IntergrateMode.WebAssembly
  private _options: any = {}
  set options(options: any) { this._options = options }

  private cvWeb: typeof OpenCV
  private cvBackend: ICVAPI
  private cvNative: ICVAPI

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


  async init(mode: IntergrateMode, options?: any) {
    if (this.isInited && this._mode == mode) return

    this._mode = mode
    this._options = options

    this._isInited = false
    switch (this._mode) {
      case IntergrateMode.WebAssembly:
        this.cvNative?.dispose()
        this.cvBackend?.dispose()
        const { loadOpenCV } = await import('@opencvjs/web')
        this.cvWeb = await loadOpenCV()

        this.bgSubtractor = new this.cvWeb.BackgroundSubtractorMOG2(500, 16, true)
        this.gamma = 1.0
        this.lut = this.cvWeb.matFromArray(256, 1, this.cvWeb.CV_8UC1, this.gammaTable)
        this.processedImg = new this.cvWeb.Mat()
        this.tmpImg = new this.cvWeb.Mat()

        this.termCrit = new this.cvWeb.TermCriteria(this.cvWeb.TermCriteria_EPS | this.cvWeb.TermCriteria_COUNT, 10, 1)
        this.trackWindow = new this.cvWeb.Rect(150, 60, 63, 125)
        let roi = new this.cvWeb.Mat(this.trackWindow.width, this.trackWindow.height, this.cvWeb.CV_8UC3, new this.cvWeb.Scalar(0, 0, 0))
        this.upper = new this.cvWeb.Mat(roi.rows, roi.cols, roi.type(), new this.cvWeb.Scalar(30, 30, 0))
        this.lower = new this.cvWeb.Mat(roi.rows, roi.cols, roi.type(), new this.cvWeb.Scalar(180, 180, 180))
        let mask = new this.cvWeb.Mat()
        this.cvWeb.inRange(roi, this.lower, this.upper, mask)

        this.hsvVec = new this.cvWeb.MatVector()

        this.roiHist = new this.cvWeb.Mat()
        let roiVec = new this.cvWeb.MatVector()
        roiVec.push_back(roi)
        this.cvWeb.calcHist(roiVec, [0], mask, this.roiHist, [180], [0, 180])
        this.cvWeb.normalize(this.roiHist, this.roiHist, 0, 255, this.cvWeb.NORM_MINMAX)

        roi.delete()
        mask.delete()
        this.lower.delete()
        this.upper.delete()
        roiVec.delete()
        break
      case IntergrateMode.Native:
        this.dispose()
        this.cvBackend?.dispose()
        this.cvNative = window.cvNative
        await this.cvNative.init()
        break
      case IntergrateMode.Backend:
        this.dispose()
        this.cvNative?.dispose()
        this.cvBackend = window.cvBackend
        await this.cvBackend.init()

        break
    }
    this._isInited = true
  }

  dispose() {
    if (this.processedImg) this.processedImg.delete()
    if (this.tmpImg) this.tmpImg.delete()
    if (this.lut) this.lut.delete()
    if (this.hsvVec) this.hsvVec.delete()
    this._isInited = false
    this.cvWeb = null
  }

  async process(image: ImageData) {
    if (this._mode != IntergrateMode.WebAssembly && window.isWeb) {
      showNotify({ type: 'danger', message: '当前环境不支持' })
      return
    }
    switch (this._mode) {
      case IntergrateMode.WebAssembly: {
        try {
          return await this.imgProcess(image, this._options)
        } catch (err) {
          console.error(err)
        }
        break
      }
      case IntergrateMode.Backend: {
        let data = await this.cvBackend?.imgProcess(image, this._options)
        if (data) image.data.set(data)
        return image
      }
      case IntergrateMode.Native: {
        let data = await this.cvNative.imgProcess(image, this._options)
        if (data) image.data.set(data)
        return image
      }
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
      this.processedImg = new this.cvWeb.Mat(frame.height, frame.width, this.cvWeb.CV_8UC4)
    }
    if (this.tmpImg == null) {
      this.tmpImg = new this.cvWeb.Mat(frame.height, frame.width, this.cvWeb.CV_8UC3)
    }

    if (this.processedImg.cols !== frame.width || this.processedImg.rows !== frame.height) {
      this.processedImg.delete()
      this.processedImg = new this.cvWeb.Mat(frame.height, frame.width, this.cvWeb.CV_8UC4)
    }

    if (this.tmpImg.cols !== frame.width || this.tmpImg.rows !== frame.height) {
      this.tmpImg.delete()
      this.hsvVec?.delete()
      this.tmpImg = new this.cvWeb.Mat(frame.height, frame.width, this.cvWeb.CV_8UC3)
      this.hsvVec = new this.cvWeb.MatVector()
      this.hsvVec.push_back(this.tmpImg)
    }

    this.processedImg.data.set(frame.data, 0)
    this.cvWeb.cvtColor(this.processedImg, this.processedImg, this.cvWeb.COLOR_RGBA2BGR)
    if (this.tmpImg.type() != this.processedImg.type()) {
      this.tmpImg.delete()
      this.tmpImg = new this.cvWeb.Mat(frame.height, frame.width, this.cvWeb.CV_8UC3)
    }
    this.tmpImg.data.set(this.processedImg.data)

    if (params.colorMap != null && params.colorMap != 0)
      this.cvWeb.applyColorMap(this.processedImg, this.processedImg, params.colorMap - 1)

    if (params.isGray) {
      this.cvWeb.cvtColor(this.processedImg, this.processedImg, this.cvWeb.COLOR_BGR2GRAY)
      this.processedImg.copyTo(this.tmpImg)
    }

    if (params.rotate != null && params.rotate != 0) {
      let dsize = new this.cvWeb.Size(frame.width, frame.height)
      let center = new this.cvWeb.Point(frame.width / 2, frame.height / 2)
      let rotateMat = this.cvWeb.getRotationMatrix2D(center, params.rotate, 1)
      this.cvWeb.warpAffine(this.processedImg, this.processedImg, rotateMat, dsize)
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
      this.cvWeb.Canny(this.processedImg, this.processedImg, params.canny[0], params.canny[1])
    }

    if (params.isGray) {
      this.cvWeb.cvtColor(this.processedImg, this.processedImg, this.cvWeb.COLOR_GRAY2RGBA)
    } else {
      this.cvWeb.cvtColor(this.processedImg, this.processedImg, this.cvWeb.COLOR_BGR2RGBA)
    }

    frame.data.set(this.processedImg.data)

    return frame
  }

  private equalization(params: cvEqualizeHist) {
    switch (params[0]) {
      case 'equalizeHist':
        this.cvWeb.equalizeHist(this.processedImg, this.processedImg)
        break
      case 'clahe':
        let clahe = new this.cvWeb.CLAHE(params[1], new this.cvWeb.Size(params[2], params[3]))
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
    this.lut = this.cvWeb.matFromArray(256, 1, this.cvWeb.CV_8UC1, this.gammaTable)
    this.cvWeb.LUT(this.processedImg, this.lut, this.processedImg)
    this.cvWeb.normalize(this.processedImg, this.processedImg, 0, 255, this.cvWeb.NORM_MINMAX)
    this.cvWeb.convertScaleAbs(this.processedImg, this.processedImg, 1, 0)
  }

  private blur(params: cvBlur) {
    try {
      switch (params[0]) {
        case cvBlurType.gaussian:
          if (params[1] % 2 !== 1 || params[2] % 2 !== 1) return
          this.cvWeb.GaussianBlur(this.processedImg, this.processedImg, new this.cvWeb.Size(params[1], params[2]), 0)
          break
        case cvBlurType.median:
          this.cvWeb.medianBlur(this.processedImg, this.processedImg, params[3])
          break
        case cvBlurType.avg:
          this.cvWeb.blur(this.processedImg, this.processedImg, new this.cvWeb.Size(params[1], params[2]))
          break
        case cvBlurType.bilateral:
          try {
            this.cvWeb.bilateralFilter(this.processedImg, this.processedImg,
              params[4], params[5], params[6], this.cvWeb.BORDER_DEFAULT)
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
          this.cvWeb.Laplacian(this.processedImg, this.tmpImg, -1)
          this.cvWeb.addWeighted(this.processedImg, sharpen[1], this.tmpImg, sharpen[2], 0, this.processedImg)
          break
        case 'usm':
          this.cvWeb.GaussianBlur(this.processedImg, this.tmpImg, new this.cvWeb.Size(sharpen[1], sharpen[1]), 25)
          this.cvWeb.addWeighted(this.processedImg, sharpen[1], this.tmpImg, sharpen[2], 0, this.processedImg)
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
          this.cvWeb.Sobel(this.processedImg, this.processedImg, this.cvWeb.CV_8U, filter[1], filter[2], filter[4], filter[3])
          break
        case cvFilterType.scharr:
          // dx + dy == 1 
          if (filter[1] + filter[2] !== 1) return
          this.cvWeb.Scharr(this.processedImg, this.processedImg, this.cvWeb.CV_8U, filter[1], filter[2], filter[3])
          break
        case cvFilterType.laplace:
          if (filter[4] % 2 !== 1) return
          this.cvWeb.Laplacian(this.processedImg, this.processedImg, this.cvWeb.CV_8U, filter[4], filter[3])
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
      let ksize = new this.cvWeb.Size(params[1], params[2])
      M = this.cvWeb.getStructuringElement(this.cvWeb.MORPH_CROSS, ksize)
      this.cvWeb.morphologyEx(this.processedImg, this.processedImg, params[0], M, new this.cvWeb.Point(-1, -1), params[3])
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
        this.cvWeb.cvtColor(this.processedImg, this.tmpImg, this.cvWeb.COLOR_BGR2HSV)
        if (this.lower.rows !== this.tmpImg.rows || this.lower.cols !== this.tmpImg.cols) {
          this.lower.delete()
          this.lower = new this.cvWeb.Mat(this.tmpImg.rows, this.tmpImg.cols, this.cvWeb.CV_8UC3)
        }
        if (this.upper.rows !== this.tmpImg.rows || this.upper.cols !== this.tmpImg.cols) {
          this.upper.delete()
          this.upper = new this.cvWeb.Mat(this.tmpImg.rows, this.tmpImg.cols, this.cvWeb.CV_8UC3)
        }
        // 定义颜色范围
        this.lower.setTo([30, 30, 100 - threshold, 255])
        this.upper.setTo([180, 180, 100 + threshold, 255])

        // 创建颜色掩码
        this.cvWeb.inRange(this.tmpImg, this.lower, this.upper, this.tmpImg)

        // 形态学操作
        kernel = this.cvWeb.getStructuringElement(this.cvWeb.MORPH_ELLIPSE, new this.cvWeb.Size(5, 5))
        this.cvWeb.morphologyEx(this.tmpImg, this.tmpImg, this.cvWeb.MORPH_OPEN, kernel)
        this.cvWeb.morphologyEx(this.tmpImg, this.tmpImg, this.cvWeb.MORPH_CLOSE, kernel)
        this.cvWeb.GaussianBlur(this.tmpImg, this.tmpImg, new this.cvWeb.Size(5, 5), 0)
        break
      case 'contour':
        this.cvWeb.cvtColor(this.processedImg, this.tmpImg, this.cvWeb.COLOR_RGBA2GRAY)
        this.cvWeb.GaussianBlur(this.tmpImg, this.tmpImg, new this.cvWeb.Size(5, 5), 0)
        this.cvWeb.Canny(this.tmpImg, this.tmpImg, threshold, threshold * 2)
        break
      case 'bgSub':
        this.cvWeb.cvtColor(this.processedImg, this.tmpImg, this.cvWeb.COLOR_RGBA2GRAY)
        this.bgSubtractor.apply(this.tmpImg, this.tmpImg)
        this.cvWeb.threshold(this.tmpImg, this.tmpImg, threshold * 2.55, 255, this.cvWeb.THRESH_BINARY)
        // 形态学操作（去除噪声）
        kernel = this.cvWeb.getStructuringElement(this.cvWeb.MORPH_ELLIPSE, new this.cvWeb.Size(3, 3))
        this.cvWeb.morphologyEx(this.tmpImg, this.tmpImg, this.cvWeb.MORPH_OPEN, kernel)
        break
      case 'camShift':
        this.cvWeb.cvtColor(this.processedImg, this.tmpImg, this.cvWeb.COLOR_BGR2HSV)
        this.cvWeb.calcBackProject(this.hsvVec, [0], this.roiHist, this.tmpImg, [0, 180], 1)
        let result = this.cvWeb.CamShift(this.tmpImg, this.trackWindow, this.termCrit)
        let pts = this.cvWeb.boxPoints(result).map((p) => ({ x: p.x, y: p.y }))
        break
    }

    let contours = new this.cvWeb.MatVector()
    let hierarchy = new this.cvWeb.Mat()
    this.cvWeb.findContours(this.tmpImg, contours, hierarchy, this.cvWeb.RETR_EXTERNAL, this.cvWeb.CHAIN_APPROX_SIMPLE)

    let rects = new Array()
    for (let i = 0; i < contours.size(); ++i) {
      let contour = contours.get(i)
      if (this.cvWeb.contourArea(contour) < minSize) continue
      let rect = this.cvWeb.boundingRect(contour)
      rects.push({ x: rect.x, y: rect.y, width: rect.width, height: rect.height })
    }

    kernel?.delete()
    contours.delete()
    hierarchy.delete()
    return rects
  }


  findContours(data: Uint8Array, width: number, height: number) {
    if (!this._isInited) return []

    let src = new this.cvWeb.Mat(height, width, this.cvWeb.CV_8UC1)
    src.data.set(data)
    let contours = new this.cvWeb.MatVector()
    let hierarchy = new this.cvWeb.Mat()
    let M: any
    let ksize = new this.cvWeb.Size(2, 2)
    M = this.cvWeb.getStructuringElement(this.cvWeb.MORPH_CROSS, ksize)
    this.cvWeb.morphologyEx(src, src, this.cvWeb.MORPH_DILATE, M, new this.cvWeb.Point(-1, -1), 1)
    // cv.morphologyEx(src, src, cv.MORPH_DILATE, M, new cv.Point(-1, -1), 1)
    M.delete()
    this.cvWeb.findContours(src, contours, hierarchy, this.cvWeb.RETR_EXTERNAL, this.cvWeb.CHAIN_APPROX_SIMPLE)

    let maxArea = 0
    let maxCnt: any
    for (let i = 0; i < contours.size(); ++i) {
      let cnt = contours.get(i)
      let area = this.cvWeb.contourArea(cnt)
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
      let epsilon = 0.008 * this.cvWeb.arcLength(cnt, true)
      let approx = new this.cvWeb.Mat()

      // 关键函数：进行多边形逼近，得到平滑边框
      this.cvWeb.approxPolyDP(cnt, approx, epsilon, true)

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