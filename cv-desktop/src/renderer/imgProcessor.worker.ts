import { ImageProcessor, IntergrateMode, WorkerCMD } from "./common"

const ctx: Worker = self as any

const processor = new ImageProcessor()

ctx.onmessage = async (event: MessageEvent<{
  cmd: WorkerCMD | WorkerCMD[],
  image?: ImageData,
  width?: number,
  height?: number,
  masks?: Uint8Array[],
  rects?: Array<[number, number, number, number]>,
  mode?: IntergrateMode,
  options?: any
}>) => {
  let data = { loading: false }
  try {
    console.log('[worker] onMessage', event.data)
    switch (event.data.cmd) {
      case WorkerCMD.initImageProcessor:
        processor?.init(event.data.mode, event.data.options ? JSON.parse(event.data.options) : null)
        break
      case WorkerCMD.updateOptions:
        if (!processor.isInited) {
          data = Object.assign(data, { error: 'processor not inited' })
        } else {
          processor.options = JSON.parse(event.data.options)
        }
        break
      case WorkerCMD.imageProcess:
        console.log('[processor]', processor.isInited)
        if (!processor.isInited) {
          data = Object.assign(data, { error: 'processor not inited' })
        } else {
          if (event.data.options) processor.options = JSON.parse(event.data.options)
          let result = await processor.process(event.data.image)
          ctx.postMessage({ type: 'processed', result }, [result.data.buffer])
        }
        break
      case WorkerCMD.findContours:
        if (!processor.isInited) {
          data = Object.assign(data, { error: 'processor not inited' })
        } else {
          if (event.data.options) processor.options = JSON.parse(event.data.options)
          let i = 0
          let contours = []
          while (i < event.data.masks.length) {
            let result = processor.findContours(event.data.masks[i], event.data.rects[i][2], event.data.rects[i][3])
            result.forEach(p => {
              p[0] += event.data.rects[i][0]
              p[1] += event.data.rects[i][1]
            })
            contours.push(result)
            // ctx.postMessage
            i++
          }

          ctx.postMessage({ type: 'contours', contours })
        }
    }
  } catch (err) {
    console.warn(err)
    data = Object.assign(data, { error: err })
  } finally {
    ctx.postMessage(data)
  }

}