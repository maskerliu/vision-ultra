
import { ImgGenMsg, ProcessorCMD } from '../shared'
import { ImageGenerator } from './common/model/ImageGenerator'

const ctx: Worker = self as any
let imageGenerator: ImageGenerator = new ImageGenerator()

ctx.addEventListener('message', async (event: MessageEvent<ImgGenMsg>) => {
  if (event.data == null) {
    ctx.postMessage({ loading: false, error: 'data invalid' })
    return
  }
  let data = { loading: false }
  try {
    switch (event.data.cmd) {
      case ProcessorCMD.init:
        await imageGenerator.init(JSON.parse(event.data.model))
        break
      case ProcessorCMD.dispose:
        await imageGenerator.dispose()
        break
      case ProcessorCMD.process:
        const result = await imageGenerator.generate(event.data.image)
        if (result != null) {
          const [image, width, height] = result
          console.log(result)
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