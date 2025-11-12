import { defineStore } from "pinia"

export const VisionStore = defineStore('Common', {
  state: () => {
    return {
      faceRecMode: '1',  // 1: opencv 2: tensorflow
      faceDetect: false,
      landmark: false,
      faceRec: false,
      isGray: false,
      contrast: 0.0,
      imgEnhance: false,
      brightness: 0.0,
      laplace: 0.0,
      enhance: 0.0,
      gaussian: 0.0,
      showQrCode: false
    }
  },
  actions: {
    updateShowQrCode(show: boolean) {
      this.showQrCode = show
    },
  }
})