
import { ModelInfo, ObjTrackMsg, ProcessorCMD } from '../shared'
import { ObjectTracker } from './common/model/ObjectTracker'

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