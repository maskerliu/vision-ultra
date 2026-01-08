import { ImageProcessor, IntergrateMode, WorkerCMD } from "./common"

const ctx: Worker = self as any

const processor = new ImageProcessor()

ctx.onmessage = async (event: MessageEvent<{
  cmd: WorkerCMD | WorkerCMD[],
  image?: ImageData,
  mode?: IntergrateMode,
  options?: any
}>) => {
  let data = { loading: false }
  try {
    switch (event.data.cmd) {
      case WorkerCMD.initImageProcessor:
        processor?.init(event.data.mode)
        break
      case WorkerCMD.updateOptions:
        processor.imgProcessParams = JSON.parse(event.data.options)
        break
      case WorkerCMD.imageProcess:
        if (event.data.options) processor.imgProcessParams = JSON.parse(event.data.options)
        console.log(event.data.image)
        await processor.process(event.data.image)
        break
    }
  } catch (err) {
    console.warn(err)
    data = Object.assign(data, { error: err })
  } finally {
    ctx.postMessage(data)
  }

}