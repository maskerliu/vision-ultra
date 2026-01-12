import { defineStore } from 'pinia'
import {
  cvBlur, cvBlurType, cvDetector, cvEqualizeHist, cvFilter,
  cvFilterType, cvMorph, cvSharpen,
} from '../../common'
import { IntergrateMode, ModelType } from '../common/misc'


class CVOptions {
  isGray: boolean = false
  equalizeHist: boolean = false
  clahe: boolean = false // 自适应直方图均衡化
  rotate: number = 0
  colorMap: number = 0

  enableMorph: boolean = false
  morph: cvMorph = [0, 1, 1, 1]

  enableGamma: boolean = false
  gamma: number = 1 // 伽马校正

  enableContrast: boolean = false
  equalization: cvEqualizeHist = ['equalizeHist', 0, 1, 1]

  enableClahe: boolean = false

  enableBlur: boolean = false
  blur: cvBlur = [cvBlurType.gaussian, 3, 31, 5, 5, 75, 75]

  enableSharpen: boolean = false
  sharpen: cvSharpen = ['laplace', 1, 0, 1]

  enableFilter: boolean = false
  filter: cvFilter = [cvFilterType.sobel, 1, 1, 1, 1]

  enableDetect: boolean = false
  detector: cvDetector = ['contour', 50, 100]

  enableCanny: boolean = false
  canny: [number, number] = [80, 100]

  get value() {
    let params = {
      isGray: this.isGray,
      rotate: this.rotate,
      colorMap: this.colorMap,
      gamma: this.gamma
    }

    if (this.enableMorph) params['morph'] = this.morph.map(val => val)
    else delete params['morph']

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
      intergrateMode: IntergrateMode.WebAssembly, // 1: opencv.js wasm  2: opencv.js node 3: opencv4nodejs
      modelEngine: 'tensorflow', // tensorflow or onnx

      enableObjDetect: false,
      objDetectModel: { name: 'yolo11s-seg', type: ModelType.Segment },

      enableFaceDetect: false,
      drawFaceMesh: true,
      drawEigen: true,
      landmark: false,
      live2d: false,

      enableImageGen: false,
      ganModel: { name: 'animeGANv3', type: ModelType.GenImage },

      enableCVProcess: false,
      cvOptions: new CVOptions(),

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