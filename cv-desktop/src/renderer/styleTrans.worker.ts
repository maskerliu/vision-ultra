
import { ProcessorCMD } from '../shared'
import { StyleTransfer } from './common/model/StyleTransfer'

const ctx: Worker = self as any
let styleTransfer: StyleTransfer = new StyleTransfer()

ctx.addEventListener('message', async (event: MessageEvent<{
  cmd: ProcessorCMD,
  styleModel?: string,
  transModel?: string,
  image?: ImageData,
  style?: ImageData,
  params?: [number, number, number],
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
      case ProcessorCMD.init:
        await styleTransfer.init(JSON.parse(event.data.styleModel), JSON.parse(event.data.transModel))
        break
      case ProcessorCMD.dispose:
        await styleTransfer.dispose()
        break
      case ProcessorCMD.process:
        const result = await styleTransfer.transfer(event.data.image, event.data.style, event.data.params)
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