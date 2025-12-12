import { defineStore } from "pinia"

export type cvEqualizeHist = [
  string, // type equalizeHist
  number, // clipLimit
  number, // tileGridSizeX
  number, // tileGridSizeY
]

export type cvSharpen = [
  string, // type laplacian, usm
  number, // dx
  number, // dy
  number, // scale
]

export type cvBlur = [
  string, // type gaussian, median, bilateral
  number, // sizeX
  number, // sizeY
  number, // aperture
  number, // diameter
  number, // sigmaColor
  number  // sigmaSpace
]

export type cvFilter = [
  string, // type sobel, laplacian, scharr
  number, // dx
  number, // dy
  number, // scale
  number, // size
]

export type cvDetector = [
  string, // type meanShift, camShift
  number, // threshold
  number, // minSize
]

class ImageParams {
  isGray: boolean = false
  equalizeHist: boolean = false
  clahe: boolean = false // 自适应直方图均衡化
  rotate: number = 0
  colorMap: number = 0

  enableGamma: boolean = false
  gamma: number = 1 // 伽马校正

  enableContrast: boolean = false
  equalization: cvEqualizeHist = ['equalizeHist', 0, 1, 1]

  enableClahe: boolean = false

  enableBlur: boolean = false
  blur: cvBlur = ['gaussian', 3, 31, 5, 5, 75, 75]

  enableSharpen: boolean = false
  sharpen: cvSharpen = ['laplace', 1, 0, 1]

  enableFilter: boolean = false
  filter: cvFilter = ['sobel', 1, 1, 1, 1]

  enableDetect: boolean = false
  detector: cvDetector = ['contour', 50, 100]

  enableCanny: boolean = false
  canny: [number, number] = [80, 100]

  get value() {
    let params = {
      isGray: this.isGray,
      rotate: this.rotate,
      colorMap: this.colorMap,
    }

    if (this.enableGamma) params['gamma'] = this.gamma
    else delete params['gamma']

    if (this.enableContrast) params['equalization'] = this.equalization.map(val => val)
    else delete params['equalization']

    if (this.enableSharpen) params['sharpen'] = this.sharpen.map(val => val)
    else delete params['sharpen']

    if (this.enableBlur) params['blur'] = this.blur.map(val => val)
    else delete params['blur']

    if (this.enableFilter) params['filter'] = this.filter.map(val => val)
    else delete params['filter']

    if (this.enableDetect) params['detector'] = this.detector.map(val => val)
    else delete params['detector']

    if (this.enableCanny) params['canny'] = [this.canny[0], this.canny[1]]
    else delete params['canny']

    return params
  }
}


export const VisionStore = defineStore('VisionStore', {
  state: () => {
    return {
      faceRecMode: 'tfjs' as 'tfjs' | 'opencv',  // 1: opencv 2: tensorflow
      faceDetect: false,
      drawFaceMesh: true,
      drawEigen: true,
      landmark: false,
      faceRec: false,
      imgEnhance: true,
      imgProcessMode: '1' as '1' | '2' | '3', // 1: opencv.js wasm  2: opencv.js node 3: opencv4nodejs
      imgParams: new ImageParams(),
      enableYolo: false,
      yoloModel: 'yolov8n',
      showQrCode: false
    }
  },
  actions: {
    updateShowQrCode(show: boolean) {
      this.showQrCode = show
    },
  }
})