
import { ProcessorCMD } from '../../../shared'
import { StyleTransfer } from '../model/StyleTransfer'

const ctx: Worker = self as any
let styleTransfer: StyleTransfer = new StyleTransfer()

ctx.addEventListener('message', async (event: MessageEvent<{
  cmd: ProcessorCMD,
  styleModel?: string,
  transModel?: string,
  image?: ImageData,
  style?: ImageData,
  params?: string,
  width?: number,
  height?: number
}>) => {
  if (event.data == null) {
    ctx.postMessage({ loading: false, error: 'data invalid' })
    return
  }
  let data = { loading: false }
  try {
    switch (event.data.cmd) {
      case ProcessorCMD.init: {
        let params = event.data.params ? JSON.parse(event.data.params) : null
        await styleTransfer.init(JSON.parse(event.data.styleModel),
          JSON.parse(event.data.transModel),
          event.data.style, params)
        break
      }
      case ProcessorCMD.dispose:
        await styleTransfer.dispose()
        break
      case ProcessorCMD.updateOptions: {
        if (!styleTransfer.isInited) {
          data = Object.assign(data, { error: 'processor not inited' })
          ctx.postMessage(data)
          break
        }

        let params = JSON.parse(event.data.params)
        styleTransfer.updateParams(event.data.style, params)
        data = Object.assign(data, { message: 'image processor options updated' })
        ctx.postMessage(data)
        break
      }
      case ProcessorCMD.process:
        const result = await styleTransfer.transfer(event.data.image)
        if (result != null) {
          const [image, width, height] = result
          data = Object.assign(
            data,
            { type: 'generated', image, width, height },
            [(image as any).buffer]
          )
        }
        break
    }
  } catch (error) {
    console.error(error)
    data = Object.assign(data, { error: (error as Error).message })
  } finally {
    ctx.postMessage(data)
  }
})