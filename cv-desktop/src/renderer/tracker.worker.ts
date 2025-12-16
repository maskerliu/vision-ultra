
import { FaceDetector } from "./common/FaceDetector"
import { ObjectTracker } from "./common/ObjectTracker"

const ctx: Worker = self as any
let objTracker: ObjectTracker = new ObjectTracker()
let faceDetector: FaceDetector = new FaceDetector()

ctx.addEventListener('message', async (event: MessageEvent<{
  type: string,
  modelName?: string,
  image?: ImageData
}>) => {
  try {
    switch (event.data.type) {
      case 'initObjTracker':
        await objTracker.init(event.data.modelName)
        ctx.postMessage({ loading: false })
        break
      case 'initFaceDetector':
        await faceDetector.init()
        ctx.postMessage({ loading: false })
        break
      case 'objDispose':
        objTracker.dispose()
        break
      case 'faceDispose':
        faceDetector.dispose()
        break
      case 'objDetect':
        await objTracker.detect(event.data.image)
        ctx.postMessage({
          type: 'obj',
          boxes: objTracker.boxes,
          scores: objTracker.scores,
          classes: objTracker.classes,
          objNum: objTracker.objNum,
          scale: [objTracker.scaleX, objTracker.scaleY],
          expire: objTracker.expire
        })
        break
      case 'faceDetect':
        await faceDetector.detect(event.data.image)
        ctx.postMessage({
          type: 'face',
          face: faceDetector.face,
        })
        break

      case 'faceCapture':
        // await faceDetector.facCapture(event.data.image)
        break
    }
  } catch (error) {
    ctx.postMessage({ error: error })
  }

})