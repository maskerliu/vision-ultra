
import { FilesetResolver } from "@mediapipe/tasks-vision"
import { baseDomain } from "../common"
import { WorkerCMD } from "./common"
import { FaceDetector } from "./common/FaceDetector"
import { ObjectTracker } from "./common/ObjectTracker"
import { ModelInfo, ModelType } from "./common/TFModel"

const ctx: Worker = self as any
let fileset: any = null
let objTracker: ObjectTracker = new ObjectTracker()
let faceDetector: FaceDetector = new FaceDetector()

async function init() {
  fileset = await FilesetResolver.forVisionTasks(
    __DEV__ ? 'node_modules/@mediapipe/tasks-vision/wasm' : baseDomain() + '/static/tasks-vision/wasm')
}

ctx.addEventListener('message', async (event: MessageEvent<{
  cmd: WorkerCMD | WorkerCMD[],
  modelTypes?: ModelType[],
  model?: string,
  image?: ImageData
}>) => {

  let cmds = Array.isArray(event.data.cmd) ? event.data.cmd : [event.data.cmd]
  for (let cmd of cmds) {
    let data = { loading: false }
    try {
      switch (cmd) {
        case WorkerCMD.initObjTracker:
          await objTracker.init(JSON.parse(event.data.model) as ModelInfo)
          break
        case WorkerCMD.initFaceDetector:
          await faceDetector.init()
          break
        case WorkerCMD.dispose:
          if (ModelType.Face in event.data.modelTypes) faceDetector.dispose()
          if (ModelType.Detect in event.data.modelTypes ||
            ModelType.Segment in event.data.modelTypes)
            objTracker.dispose()
          break
        case WorkerCMD.objRec:
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
        case WorkerCMD.faceDetect:
          await faceDetector.detect(event.data.image)
          data = Object.assign(data, {
            type: 'face',
            face: faceDetector.face,
            tface: faceDetector.tface,
          })
          break
        case WorkerCMD.faceCapture:
          // await faceDetector.facCapture(event.data.image)
          break
      }
    } catch (error) {
      console.error(error)
      data = Object.assign(data, { error: error })
    } finally {
      ctx.postMessage(data)
    }
  }
})

init()