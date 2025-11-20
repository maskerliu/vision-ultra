import { imgProcess } from "./CVApi"

import { showNotify } from "vant"


export class ImageProcessor {
  public imgEnhance: boolean = false
  public imgProcessMode: '1' | '2' | '3' = '1'
  public imgProcessParams: any = {}

  process(image: ImageData) {
    switch (this.imgProcessMode) {
      case '1': {
        imgProcess(image, image.width, image.height, this.imgProcessParams)
        break
      }
      case '2': {
        if (!__IS_WEB__) {
          let data = window.cvWasmApi?.imgProcess(image, image.width, image.height, this.imgProcessParams)
          image.data.set(data)
        } else {
          showNotify({ type: 'danger', message: '当前环境不支持' })
        }
        break
      }
      case '3': {
        if (!__IS_WEB__) {
          let data = window.cvNativeApi?.imgProcess(image, image.width, image.height, this.imgProcessParams)
          image.data.set(data)
        } else {
          showNotify({ type: 'danger', message: '当前环境不支持' })
        }
        break
      }
    }
  }
}