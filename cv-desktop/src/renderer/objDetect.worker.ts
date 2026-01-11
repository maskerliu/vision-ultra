
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
          boxes: objTracker.boxes,
          scores: objTracker.scores,
          classes: objTracker.classes,
          objNum: objTracker.objNum,
          expire: objTracker.expire,
          overlay: result?.overlay,
          width: result?.width,
          height: result?.height,
          masks: objTracker.masks,
          scale: objTracker.modelScale,
        })
        data['type'] = 'mask'
        break
    }
  } catch (error) {
    console.error(error)
    data = Object.assign(data, { error: (error as Error).message })
  } finally {
    ctx.postMessage(data)
  }
})