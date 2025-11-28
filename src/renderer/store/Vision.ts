import { defineStore } from "pinia"

class ImageParams {
  isGray: boolean = false
  equalizeHist: boolean = false
  clahe: boolean = false // 自适应直方图均衡化

  rotate: number = 0

  enableGamma: boolean = false
  gamma: number = 1 // 伽马校正

  enableGaussian: boolean = false
  gaussian: [number, number, number] = [1, 1, 1] // 高斯滤波器的孔径大小，必须为正奇数

  enableBlur: boolean = false
  blur: [string, number, number, number, number, number, number] = ['gaussian', 3, 31, 5, 9, 75, 75] // type, sizeX, sizeY, aperture, diameter, sigmaColor, sigmaSpace

  enableFilter: boolean = false
  filter: [string, number, number, number, number] = ['sobel', 1, 1, 1, 1] // type, dx, dy, scale, size

  enableCanny: boolean = false
  canny: [number, number] = [80, 100]

  get value() {
    let params = {}
    params['isGray'] = this.isGray
    params['equalizeHist'] = this.equalizeHist
    params['clahe'] = this.clahe
    params['rotate'] = this.rotate
    if (this.enableGamma) params['gamma'] = this.gamma
    else delete params['gamma']
    if (this.enableGaussian)
      params['gaussian'] = [this.gaussian[0], this.gaussian[1], this.gaussian[2]]
    else delete params['gaussian']

    if (this.enableBlur)
      params['blur'] = [
        this.blur[0], this.blur[1], this.blur[2],
        this.blur[3], this.blur[4], this.blur[5], this.blur[6]
      ]
    else delete params['blur']

    if (this.enableFilter)
      params['filter'] = [this.filter[0], this.filter[1], this.filter[2], this.filter[3], this.filter[4]]
    else delete params['filter']

    if (this.enableCanny)
      params['canny'] = [this.canny[0], this.canny[1]]
    else delete params['canny']

    return params
  }
}


export const VisionStore = defineStore('VisionStore', {
  state: () => {
    return {
      faceRecMode: '2',  // 1: opencv 2: tensorflow
      faceDetect: true,
      drawFaceMesh: true,
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