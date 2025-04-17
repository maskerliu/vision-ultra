import { defineStore } from "pinia"

export const FaceRecStore = defineStore('Common', {
  state: () => {
    return {
      faceDetect: false,
      landmark: false,
      faceRec: false,
      isGray: false,
      imgEnhance: false,
    }
  },
  actions: {
    updateShowQrCode(show: boolean) {
      this.showQrCode = show
    },
  }
})