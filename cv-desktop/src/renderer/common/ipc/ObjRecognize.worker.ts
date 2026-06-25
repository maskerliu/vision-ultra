
import { ModelInfo, ObjTrackMsg, ProcessorCMD } from '@shared/index'
import { ObjectRecognizer } from '../model/ObjectRecognizer'

const ctx: Worker = self as any
let objRecognizer: ObjectRecognizer = new ObjectRecognizer()

ctx.addEventListener('message', async (event: MessageEvent<ObjTrackMsg>) => {
  if (event.data == null) {
    ctx.postMessage({ loading: false, error: 'data invalid' })
    return
  }
  let data = { loading: false }
  try {
    switch (event.data.cmd) {
      case ProcessorCMD.init:
        await objRecognizer.init(JSON.parse(event.data.model) as ModelInfo)
        break
      case ProcessorCMD.dispose:
        await objRecognizer.dispose()
        break
      case ProcessorCMD.process:
        let result = await objRecognizer.detect(event.data.image)
        data = Object.assign(data, {
          type: 'segment',
          boxes: objRecognizer.objNum == 0 ? null : objRecognizer.boxes,
          scores: objRecognizer.objNum == 0 ? null : objRecognizer.scores,
          classes: objRecognizer.objNum == 0 ? null : objRecognizer.classes,
          objNum: objRecognizer.objNum,
          expire: objRecognizer.expire,
          overlay: result?.overlay,
          scale: objRecognizer.scale,
          masks: objRecognizer.objNum == 0 ? null : objRecognizer.masks,
          segSize: objRecognizer.objNum == 0 ? null : objRecognizer.segSize,
          segScale: objRecognizer.objNum == 0 ? null : objRecognizer.segScale
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