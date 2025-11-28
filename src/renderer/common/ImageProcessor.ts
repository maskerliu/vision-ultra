import { showNotify } from "vant"
import { imgProcess } from "./CVApi"


export class ImageProcessor {
  public imgEnhance: boolean = false
  public imgProcessMode: '1' | '2' | '3' = '1'
  public imgProcessParams: any = {}

  process(image: ImageData) {
    if (!this.imgEnhance) return
    if (this.imgProcessMode != '1' && window.isWeb) {
      showNotify({ type: 'danger', message: '当前环境不支持' })
      return
    }
    switch (this.imgProcessMode) {
      case '1': {
        try {
          imgProcess(image, image.width, image.height, this.imgProcessParams)
        } catch (err) {
          console.error(err)
        }
        break
      }
      case '2': {
        let data = window.cvWasmApi?.imgProcess(image, image.width, image.height, this.imgProcessParams)
        if (data) image.data.set(data)
        break
      }
      case '3': {
        let data = window.cvNativeApi?.imgProcess(image, image.width, image.height, this.imgProcessParams)
        if (data) image.data.set(data)
        break
      }
    }
  }
}