import { loadOpenCV, OpenCV } from "@opencvjs/web"
import { showNotify } from "vant"
import { IOpencvAPI } from "../../common/ipc.api"
import { cvBlur, cvBlurType, cvDetector, cvEqualizeHist, cvFilter, cvFilterType, cvMorph, cvSharpen, IntergrateMode } from "./CVApi"

export class ImageProcessor {
  public imgEnhance: boolean = false
  public _mode: IntergrateMode = IntergrateMode.WebAssembly
  public imgProcessParams: any = {}
  public objectRects: Array<{ x: number, y: number, width: number, height: number }>

  private cvWeb: typeof OpenCV
  private cvBackend: IOpencvAPI
  private cvNative: IOpencvAPI

  private _isInited: boolean = false
  public get isInited() {
    return this._isInited
  }

  private gammaTable = new Uint8Array(256)
  private lut: OpenCV.Mat
  private processedImg: OpenCV.Mat
  private tmpImg: OpenCV.Mat
  private rotateMat: OpenCV.Mat

  private bgSubtractor: OpenCV.BackgroundSubtractorMOG2
  private termCrit: OpenCV.TermCriteria
  private trackWindow: OpenCV.Rect
  private roiHist: OpenCV.Mat
  private upper: OpenCV.Mat
  private lower: OpenCV.Mat
  private hsvVec: OpenCV.MatVector
  private gamma: number = 1.0


  async init(mode: IntergrateMode) {
    if (this.isInited && this._mode == mode) return

    this._mode = mode
    this._isInited = false
    switch (this._mode) {
      case IntergrateMode.WebAssembly:
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
      case IntergrateMode.Native:
        this.cvNative = window.cvNativeApi
        this._isInited = true
        break
      case IntergrateMode.Backend:
        this.cvBackend = window.cvWasmApi
        break
    }
  }

  dispose() {
    if (this.processedImg) this.processedImg.delete()
    if (this.tmpImg) this.tmpImg.delete()
    if (this.lut) this.lut.delete()
    if (this.rotateMat) this.rotateMat.delete()
    if (this.hsvVec) this.hsvVec.delete()
  }

  process(image: ImageData) {
    if (!this.imgEnhance) return
    if (this._mode != IntergrateMode.WebAssembly && window.isWeb) {
      showNotify({ type: 'danger', message: '当前环境不支持' })
      return
    }
    switch (this._mode) {
      case IntergrateMode.WebAssembly: {
        try {
          this.imgProcess(image, image.width, image.height, this.imgProcessParams)
        } catch (err) {
          console.error(err)
        }
        break
      }
      case IntergrateMode.Backend: {
        let data = this.cvBackend?.imgProcess(image, image.width, image.height, this.imgProcessParams)
        if (data) image.data.set(data)
        break
      }
      case IntergrateMode.Native: {
        let data = this.cvNative.imgProcess(image, image.width, image.height, this.imgProcessParams)
        if (data) image.data.set(data)
        break
      }
    }
  }

  private imgProcess(frame: ImageData, width: number, height: number,
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
      this.processedImg = new this.cvWeb.Mat(height, width, this.cvWeb.CV_8UC4)
    }
    if (this.tmpImg == null) {
      this.tmpImg = new this.cvWeb.Mat(height, width, this.cvWeb.CV_8UC3)
    }

    if (this.processedImg.cols !== width || this.processedImg.rows !== height) {
      this.processedImg.delete()
      this.processedImg = new this.cvWeb.Mat(height, width, this.cvWeb.CV_8UC4)
    }

    if (this.tmpImg.cols !== width || this.tmpImg.rows !== height) {
      this.tmpImg.delete()
      this.hsvVec?.delete()
      this.tmpImg = new this.cvWeb.Mat(height, width, this.cvWeb.CV_8UC3)
      this.hsvVec = new this.cvWeb.MatVector()
      this.hsvVec.push_back(this.tmpImg)
    }

    this.processedImg.data.set(frame.data, 0)
    this.cvWeb.cvtColor(this.processedImg, this.processedImg, this.cvWeb.COLOR_RGBA2BGR)
    if (this.tmpImg.type() != this.processedImg.type()) {
      this.tmpImg.delete()
      this.tmpImg = new this.cvWeb.Mat(height, width, this.cvWeb.CV_8UC3)
    }
    this.tmpImg.data.set(this.processedImg.data)

    if (params.colorMap != 0) this.cvWeb.applyColorMap(this.processedImg, this.processedImg, params.colorMap - 1)

    if (params.isGray) {
      this.cvWeb.cvtColor(this.processedImg, this.processedImg, this.cvWeb.COLOR_BGR2GRAY)
      this.processedImg.copyTo(this.tmpImg)
    }

    if (params.rotate != 0) {
      let dsize = new this.cvWeb.Size(width, height)
      let center = new this.cvWeb.Point(width / 2, height / 2)
      let rotateMat = this.cvWeb.getRotationMatrix2D(center, params.rotate, 1)
      this.cvWeb.warpAffine(this.processedImg, this.processedImg, this.rotateMat, dsize)
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

    return rects
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
  }

  private sharpen(sharpen: cvSharpen) {
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
  }

  private filtering(filter: cvFilter) {
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
  }

  private morph(params: cvMorph) {
    let M: any
    if (params[1] < 0 || params[2] < 0 || params[3] < 0) return
    let ksize = new this.cvWeb.Size(params[1], params[2])
    M = this.cvWeb.getStructuringElement(this.cvWeb.MORPH_CROSS, ksize)
    this.cvWeb.morphologyEx(this.processedImg, this.processedImg, params[0], M, new this.cvWeb.Point(-1, -1), params[3])
    M.delete()
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
        let x = approx.data32S[i * 2]
        let y = approx.data32S[i * 2 + 1]
        finalCoordinates.push([x, y]) // 以 [x, y] 数组形式存储
      }
      approx.delete()
    }

    src.delete()
    contours.delete()
    hierarchy.delete()

    return finalCoordinates
  }
}