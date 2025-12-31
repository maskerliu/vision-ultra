
import { FilesetResolver } from "@mediapipe/tasks-vision"
import { baseDomain } from "../common"
import { WorkerCMD } from "./common"
import { FaceDetector } from "./common/FaceDetector"
import { ObjectTracker } from "./common/ObjectTracker"
import { ModelType } from "./common/TFModel"

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
  detectModel?: string,
  segmentModel?: string,
  modelTypes?: ModelType[],
  image?: ImageData
}>) => {

  let cmds = Array.isArray(event.data.cmd) ? event.data.cmd : [event.data.cmd]
  for (let cmd of cmds) {
    let data = { loading: false }
    try {
      switch (cmd) {
        case WorkerCMD.initObjTracker:
          await objTracker.init(event.data.detectModel, event.data.segmentModel)
          break
        case WorkerCMD.initFaceDetector:
          await faceDetector.init()
          break
        case WorkerCMD.dispose:
          objTracker.dispose(event.data.modelTypes)
          break
        case WorkerCMD.faceDispose:
          faceDetector.dispose()
          break
        case WorkerCMD.objSegment:
          let result = await objTracker.segment(event.data.image)
          data = Object.assign(data, result)
          data['type'] = 'mask'
          break
        case WorkerCMD.objDetect:
          await objTracker.detect(event.data.image)
          data = Object.assign(data, {
            type: 'object',
            boxes: objTracker.boxes,
            scores: objTracker.scores,
            classes: objTracker.classes,
            objNum: objTracker.objNum,
            scale: objTracker.scale,
            expire: objTracker.expire
          })
          break
        case WorkerCMD.faceDetect:
          await faceDetector.detect(event.data.image)
          data = Object.assign(data, {
            type: 'face',
            face: faceDetector.face,
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