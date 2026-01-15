
import { ObjectTracker } from "./common/ObjectTracker"
import { ModelInfo, ModelType, WorkerCMD } from "./common/misc"

const ctx: Worker = self as any
let objTracker: ObjectTracker = new ObjectTracker()

ctx.addEventListener('message', async (event: MessageEvent<{
  cmd: WorkerCMD,
  modelTypes?: ModelType[],
  model?: string,
  image?: ImageData
}>) => {
  if (event.data == null) {
    ctx.postMessage({ loading: false, error: 'data invalid' })
    return
  }
  let data = { loading: false }
  try {
    switch (event.data.cmd) {
      case WorkerCMD.init:
        await objTracker.init(JSON.parse(event.data.model) as ModelInfo)
        break
      case WorkerCMD.dispose:
        objTracker.dispose()
        break
      case WorkerCMD.process:
        let result = await objTracker.detect(event.data.image)
        data = Object.assign(data, {
          type: 'mask',
          boxes: objTracker.boxes,
          scores: objTracker.scores,
          classes: objTracker.classes,
          objNum: objTracker.objNum,
          expire: objTracker.expire,
          overlay: result?.overlay,
          scale: objTracker.scale,
          masks: objTracker.masks,
          segSize: objTracker.segSize,
          segScale: objTracker.segScale
        })
        break
    }
  } catch (error) {
    console.error(error)
    data = Object.assign(data, { error: (error as Error).message })
  } finally {
    ctx.postMessage(data)
  }
})