import { IntergrateMode, ProcessorCMD } from '../common/ipc.api'
import { CVProcessor } from './common/CVProcessor'

const ctx: Worker = self as any

const processor = new CVProcessor()

ctx.onmessage = async (event: MessageEvent<{
  cmd: ProcessorCMD,
  image?: ImageData,
  width?: number,
  height?: number,
  masks?: Uint8Array[],
  rects?: Array<[number, number, number, number]>,
  mode?: IntergrateMode,
  options?: any
}>) => {
  if (event.data == null) {
    ctx.postMessage({ loading: false, error: 'data invalid' })
    return
  }
  let data = { loading: false }
  try {
    // console.log('[worker] cvPorcess', processor.isInited, event.data)
    switch (event.data.cmd) {
      case ProcessorCMD.init:
        await processor?.init(event.data.mode, event.data.options ? JSON.parse(event.data.options) : null)
        data = Object.assign(data, { message: 'image processor inited' })
        ctx.postMessage(data)
        break
      case ProcessorCMD.updateOptions:
        if (!processor.isInited) {
          data = Object.assign(data, { error: 'processor not inited' })
          ctx.postMessage(data)
          break
        }

        processor.options = JSON.parse(event.data.options)
        data = Object.assign(data, { message: 'image processor options updated' })
        ctx.postMessage(data)
        break
      case ProcessorCMD.process:
        if (!processor.isInited) {
          data = Object.assign(data, { error: 'processor not inited' })
          ctx.postMessage(data)
          break
        }

        if (event.data.options) processor.options = JSON.parse(event.data.options)
        let result = await processor.process(event.data.image)
        ctx.postMessage({ type: 'processed', result }, [result.data.buffer])
        break
      case ProcessorCMD.findContours:
        if (!processor.isInited) {
          data = Object.assign(data, { error: 'processor not inited' })
          break
        }

        if (event.data.options) processor.options = JSON.parse(event.data.options)
        let i = 0
        let contours = []
        while (i < event.data.rects.length) {
          let mask = event.data.masks[i]
          let rect = event.data.rects[i]
          let result = processor.findContours(mask, rect[2], rect[3])
          result.forEach(p => {
            p[0] += rect[0]
            p[1] += rect[1]
          })
          contours.push(result)
          i++
        }

        data = Object.assign(data, { type: 'contours', contours })
        ctx.postMessage(data)
        break
    }
  } catch (err) {
    console.warn(err)
    data = Object.assign(data, { error: err })
    ctx.postMessage(data)
  }
}