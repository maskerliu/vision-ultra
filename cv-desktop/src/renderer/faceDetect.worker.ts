
import { FilesetResolver } from "@mediapipe/tasks-vision"
import { baseDomain } from "../common"
import { FaceDetector } from "./common/FaceDetector"
import { WorkerCMD } from "./common/misc"

const ctx: Worker = self as any
let fileset: any = null
let faceDetector: FaceDetector = new FaceDetector()

async function init() {
  fileset = await FilesetResolver.forVisionTasks(
    __DEV__ ? 'node_modules/@mediapipe/tasks-vision/wasm' : baseDomain() + '/static/tasks-vision/wasm')
}

ctx.addEventListener('message', async (event: MessageEvent<{
  cmd: WorkerCMD,
  image?: ImageData,
  frame?: SharedArrayBuffer,
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
      case WorkerCMD.init:
        await faceDetector.init()
        break
      case WorkerCMD.dispose:
        faceDetector.dispose()
        break
      case WorkerCMD.process:
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
    data = Object.assign(data, { error: (error as Error).message })
  } finally {
    ctx.postMessage(data)
  }
})

init()