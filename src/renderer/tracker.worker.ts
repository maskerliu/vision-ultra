
import { FaceDetector } from "./common/FaceDetector"
import { ObjectTracker } from "./common/ObjectTracker"

const ctx: Worker = self as any
let objTracker: ObjectTracker = new ObjectTracker()
let faceDetector: FaceDetector = new FaceDetector()
// Respond to message from parent thread
ctx.addEventListener('message', async (event: MessageEvent<{
  type: string,
  modelName?: string,
  image?: ImageData
}>) => {
  switch (event.data.type) {
    case 'initObjTracker':
      await objTracker.init(event.data.modelName)
      ctx.postMessage({ loading: false })
      break
    case 'initFaceDetector':
      console.log('initFaceDetector')
      await faceDetector.init()
      ctx.postMessage({ loading: false })
      break
    case 'initAndDetect':
      await objTracker.init(event.data.modelName)
      await objTracker.detect(event.data.image)
      ctx.postMessage({
        type: 'obj',
        boxes: objTracker.boxes,
        scores: objTracker.scores,
        classes: objTracker.classes,
        objNum: objTracker.objNum,
        scaleX: objTracker.scaleX,
        scaleY: objTracker.scaleY
      })
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
        scaleX: objTracker.scaleX,
        scaleY: objTracker.scaleY,
        expire: objTracker.expire
      })
      break
    case 'faceDetect':
      await faceDetector.detect(event.data.image)
      ctx.postMessage({
        type: 'face',
        face: faceDetector.face,
        expire: faceDetector.expire,
      })
      break

    case 'faceCapture':
      // await faceDetector.facCapture(event.data.image)
      break
  }

})