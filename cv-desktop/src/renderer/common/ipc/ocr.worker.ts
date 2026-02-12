
import { OCRMsg, ProcessorCMD } from '../../../shared'
import { OcrScanner } from '../model/OcrScanner'

const ctx: Worker = self as any
let orcScanner = new OcrScanner()

ctx.addEventListener('message', async (event: MessageEvent<OCRMsg>) => {
  if (event.data == null) {
    ctx.postMessage({ loading: false, error: 'data invalid' })
    return
  }
  let data = { loading: false }
  try {
    switch (event.data.cmd) {
      case ProcessorCMD.init:
        await orcScanner.init(JSON.parse(event.data.model))
        break
      case ProcessorCMD.dispose:
        await orcScanner.dispose()
        break
      case ProcessorCMD.process:
        const result = await orcScanner.scan(event.data.image)
        // if (result != null) {
        //   const [image, width, height] = result
        //   data = Object.assign(
        //     data,
        //     { type: 'generated', image, width, height },
        //     [(image as any).buffer]
        //   )
        // }
        break
    }
  } catch (error) {
    console.error(error)
    data = Object.assign(data, { error: (error as Error).message })
  } finally {
    ctx.postMessage(data)
  }
})