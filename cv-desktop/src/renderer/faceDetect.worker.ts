
import { FilesetResolver } from '@mediapipe/tasks-vision'
import { baseDomain } from '../common'
import { ProcessorCMD } from '../common/ipc.api'
import { FaceDetector } from './common/FaceDetector'

const ctx: Worker = self as any
let fileset: any = null
let faceDetector: FaceDetector = new FaceDetector()

async function init() {
  fileset = await FilesetResolver.forVisionTasks(
    __DEV__ ? 'node_modules/@mediapipe/tasks-vision/wasm' : baseDomain() + '/static/tasks-vision/wasm')
}

ctx.addEventListener('message', async (event: MessageEvent<{
  cmd: ProcessorCMD,
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
      case ProcessorCMD.init:
        await faceDetector.init()
        break
      case ProcessorCMD.dispose:
        faceDetector.dispose()
        break
      case ProcessorCMD.process:
        await faceDetector.detect(event.data.image)
        data = Object.assign(data, {
          type: 'face',
          face: faceDetector.face,
          tface: faceDetector.tface,
        })
        break
      case ProcessorCMD.faceCapture:
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