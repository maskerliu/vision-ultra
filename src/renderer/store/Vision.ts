import { defineStore } from "pinia"

class ImageParams {
  isGray: boolean = false
  equalizeHist: boolean = false
  clahe: boolean = false // 自适应直方图均衡化
  enableGamma: boolean = false
  gamma: number = 1 // 伽马校正
  enableGaussian: boolean = false
  gaussian: [number, number, number] = [1, 1, 1] // 高斯滤波器的孔径大小，必须为正奇数

  enableSobel: boolean = false
  sobel: [number, number] = [3, 1] // 一阶导数滤波器的孔径大小，必须为正奇数
  enableScharr: boolean = false
  scharr: number = 1 // 一阶导数滤波器的孔径大小，必须为正奇数
  enableLaplace: boolean = false
  laplace: [number, number] = [1, 1] // 二阶导数滤波器的孔径大小，必须为正奇数
  enableCanny: boolean = false
  cannyThreshold: [number, number] = [80, 100]

  getParams() {
    let params = {}
    params['isGray'] = this.isGray
    params['equalizeHist'] = this.equalizeHist
    params['clahe'] = this.clahe
    if (this.enableGamma) params['gamma'] = this.gamma
    else delete params['gamma']
    if (this.enableGaussian) params['gaussian'] = [this.gaussian[0], this.gaussian[1], this.gaussian[2]]
    else delete params['gaussian']
    if (this.enableSobel) params['sobel'] = [this.sobel[0], this.sobel[1]]
    else delete params['sobel']
    if (this.enableScharr) params['scharr'] = this.scharr
    else delete params['scharr']
    if (this.enableLaplace) params['laplace'] = [this.laplace[0], this.laplace[1]]
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
      imgEnhance: true,
      imgProcessMode: '1' as '1' | '2' | '3', // 1: opencv.js wasm  2: opencv.js node 3: opencv4nodejs
      imgParams: new ImageParams(),
      showQrCode: false
    }
  },
  actions: {
    updateShowQrCode(show: boolean) {
      this.showQrCode = show
    },
  }
})