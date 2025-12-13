
import { ObjectTracker } from "./common/ObjectTracker"

const ctx: Worker = self as any


let tracker: ObjectTracker = new ObjectTracker()
// Respond to message from parent thread
ctx.addEventListener('message', async (event: MessageEvent<{
  type: string,
  modelName?: string,
  image?: ImageData
}>) => {
  switch (event.data.type) {
    case 'init':
      await tracker.init(event.data.modelName)
      console.log('init', tracker)
      break
    case 'initAndDetect':
      await tracker.init(event.data.modelName)
      console.log('initAndDetect', tracker)
      await tracker.detect(event.data.image)
      ctx.postMessage({
        boxes: tracker.boxes,
        scores: tracker.scores,
        classes: tracker.classes,
        objNum: tracker.objNum,
        scaleX: tracker.scaleX,
        scaleY: tracker.scaleY
      })
      break
    case 'dispose':
      tracker.dispose()
      break
    case 'detect':
      console.log('detect', tracker)
      await tracker.detect(event.data.image)
      ctx.postMessage({
        boxes: tracker.boxes,
        scores: tracker.scores,
        classes: tracker.classes,
        objNum: tracker.objNum,
        scaleX: tracker.scaleX,
        scaleY: tracker.scaleY
      })
      break
  }

})

