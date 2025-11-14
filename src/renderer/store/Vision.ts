import { defineStore } from "pinia"

class ImageParams {
  isGray: boolean = false
  equalizeHist: boolean = false
  clahe: boolean = false
  enableGamma: boolean = false
  gamma: number = 0.0
  enableGaussian: boolean = false
  gaussian: number = 1

  enableSobel: boolean = false
  sobel: number = 1
  enableScharr: boolean = false
  scharr: number = 1
  enableLaplace: boolean = false
  laplace: number = 1
  enableCanny: boolean = false
  cannyThreshold: [number, number] = [80, 100]

  getParams() {
    let params = {}
    params['isGray'] = this.isGray
    params['equalizeHist'] = this.equalizeHist
    params['clahe'] = this.clahe
    if (this.enableGamma) params['gamma'] = this.gamma
    else delete params['gamma']
    if (this.enableGaussian) params['gaussian'] = this.gaussian
    else delete params['gaussian']
    if (this.enableSobel) params['sobel'] = this.sobel
    else delete params['sobel']
    if (this.enableScharr) params['scharr'] = this.scharr
    else delete params['scharr']
    if (this.enableLaplace) params['laplace'] = this.laplace
    else delete params['laplace']
    if (this.enableCanny) params['cannyThreshold'] = [this.cannyThreshold[0], this.cannyThreshold[1]]
    else delete params['cannyThreshold']

    return params
  }
}


export const VisionStore = defineStore('VisionStore', {
  state: () => {
    return {
      faceRecMode: '2',  // 1: opencv 2: tensorflow
      faceDetect: false,
      landmark: false,
      faceRec: false,
      imgEnhance: false,
      imgParams: new ImageParams(),
      isGray: false,
      equalizeHist: false,
      clahe: false, // 自适应直方图均衡化
      brightness: 0.0,
      enableSobel: false,
      sobel: 1, // 一阶导数滤波器的孔径大小，必须为正奇数
      enableScharr: false,
      scharr: 1, // 一阶导数滤波器的孔径大小，必须为正奇数
      enableLaplace: false,
      laplace: 1, // 二阶导数滤波器的孔径大小，必须为正奇数
      enableCanny: false,
      cannyThreshold: [80, 100] as [number, number],
      enhance: 0.0,
      gaussian: 1,
      showQrCode: false
    }
  },
  actions: {
    updateShowQrCode(show: boolean) {
      this.showQrCode = show
    },
  }
})