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

class ImgParams {
  // 0: isGray
  // 1: equalizeHist
  // 2: rotate
  // 3: colorMap
  // 4: enableGamma
  // 5: gamma
  // 6: enableContrast
  // 7: equalization[0]
  // 8: equalization[1]
  // 9: equalization[2]
  // 10: enableBlur
  // 11: blur[0]
  // 12: blur[1]
  // 13: blur[2]
  // 14: blur[3]
  // 15: blur[4]
  // 16: blur[5]
  // 17: blur[6]
  // 18: enableSharpen
  // 19: sharpen[0]
  // 20: sharpen[1]
  // 21: sharpen[2]
  // 22: sharpen[3]
  // 23: enableFilter
  // 24: filter[0]
  // 25: filter[1]  
  // 26: filter[2]
  // 27: filter[3]
  // 28: enableDetect
  // 29: detector[0]
  // 30: detector[1]
  // 31: detector[2]
  // 32: enableCanny
  // 33: canny[0]
  // 34: canny[1]
  params: Uint8Array = new Uint8Array(34)

  isGray() {
    return this.params[0] === 1
  }

  setGray(val: boolean) {
    this.params[0] = val ? 1 : 0
  }

  equalizeHist() {
    return this.params[1] === 1
  }
}

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
      intergrateMode: '1' as '1' | '2' | '3', // 1: opencv.js wasm  2: opencv.js node 3: opencv4nodejs
      modelEngine: 'tf', // tensorflow or onnx

      enableSegment: false,
      segmentModel: 'deeplab',

      enableDetect: false,
      detectModel: 'yolov8n',

      faceDetect: false,
      drawFaceMesh: true,
      drawEigen: true,
      landmark: false,
      faceRec: false,
      imgEnhance: true,

      imgParams: new ImageParams(),

      streamHistories: [] as string[],
    }
  },
  getters: {
    liveStreamHistories: (state) => {
      let data = window.localStorage.getItem('liveStreamHistories')
      state.streamHistories = data === null ? [] : window.localStorage.getItem('liveStreamHistories').split(',')
      return state.streamHistories
    }
  },
  actions: {
    updateShowQrCode(show: boolean) {
      this.showQrCode = show
    },
    updateLiveStreamHistories(url: string) {
      this.streamHistories = [url, ...this.streamHistories]
      window.localStorage.setItem('liveStreamHistories', this.streamHistories)
    },
    deleteLiveStreamHistory(idx: number) {
      this.liveStreamHistories.splice(idx, 1)
      window.localStorage.setItem('liveStreamHistories', this.streamHistories)
    }
  }
})