
import { ModelInfo, ObjTrackMsg, ProcessorCMD } from '../../../shared'
import { ObjectTracker } from '../model/ObjectTracker'

const ctx: Worker = self as any
let objTracker: ObjectTracker = new ObjectTracker()

ctx.addEventListener('message', async (event: MessageEvent<ObjTrackMsg>) => {
  if (event.data == null) {
    ctx.postMessage({ loading: false, error: 'data invalid' })
    return
  }
  let data = { loading: false }
  try {
    switch (event.data.cmd) {
      case ProcessorCMD.init:
        await objTracker.init(JSON.parse(event.data.model) as ModelInfo)
        break
      case ProcessorCMD.dispose:
        await objTracker.dispose()
        break
      case ProcessorCMD.process:
        let result = await objTracker.detect(event.data.image)
        data = Object.assign(data, {
          type: 'segment',
          boxes: objTracker.objNum == 0 ? null : objTracker.boxes,
          scores: objTracker.objNum == 0 ? null : objTracker.scores,
          classes: objTracker.objNum == 0 ? null : objTracker.classes,
          objNum: objTracker.objNum,
          expire: objTracker.expire,
          overlay: result?.overlay,
          scale: objTracker.scale,
          masks: objTracker.objNum == 0 ? null : objTracker.masks,
          segSize: objTracker.objNum == 0 ? null : objTracker.segSize,
          segScale: objTracker.objNum == 0 ? null : objTracker.segScale
        })
        // console.log('[worker]', data)
        break
    }
  } catch (error) {
    console.error(error)
    data = Object.assign(data, { error: (error as Error).message })
  } finally {
    ctx.postMessage(data)
  }
})