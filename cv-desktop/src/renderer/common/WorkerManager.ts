
import { CVLabel, FaceDetectResult, MarkColors, ObjectDetectResult, WorkerCMD } from '.'
import ImageProcessorWorker from '../imgProcessor.worker?worker'
import TrackerWorker from '../tracker.worker?worker'
import { drawTFFaceResult } from './DrawUtils'

export enum WorkerType { tracker, imageProcessor }
export enum WorkerDrawMode { video, image }

export type WorkerStatus = {
  showLoading: boolean,
  showProcess: boolean,
  error?: string
}

export class WorkerManager {
  private previewCtx: CanvasRenderingContext2D
  private captureCtx: CanvasRenderingContext2D
  private maskCtx: CanvasRenderingContext2D

  private trackerWorker: Worker
  private imgProcessorWorker: Worker

  private _workerStatus: WorkerStatus = {
    showLoading: false,
    showProcess: false,
    error: null
  }
  set workerStatus(val: WorkerStatus) { this._workerStatus = val }

  private _drawMode: WorkerDrawMode = WorkerDrawMode.image
  set drawMode(val: WorkerDrawMode) { this._drawMode = val }

  private _enableFaceDetect = false
  set enableFaceDetect(val: boolean) { this._enableFaceDetect = val }

  private _drawFaceMesh = false
  set drawFaceMesh(val: boolean) { this._drawFaceMesh = val }

  private _drawEigen = false
  set drawEigen(val: boolean) { this._drawEigen = val }

  private _enableObjRec = false
  set enableObjRec(val: boolean) { this._enableObjRec = val }

  private _objects: ObjectDetectResult
  get objects(): ObjectDetectResult { return this._objects }

  private _face: FaceDetectResult
  get face(): FaceDetectResult { return this._face }

  private _annotationPanel: any
  set annotationPanel(val: any) {
    this._annotationPanel = val
  }


  constructor(previewCtx: CanvasRenderingContext2D,
    captureCtx: CanvasRenderingContext2D,
    maskCtx: CanvasRenderingContext2D) {
    this.previewCtx = previewCtx
    this.captureCtx = captureCtx
    this.maskCtx = maskCtx
  }

  public register(targets: Array<WorkerType>) {

    for (let target of targets) {

      if (target == WorkerType.tracker) {
        if (this.trackerWorker == null) {
          this.trackerWorker = new TrackerWorker()
          this.trackerWorker.addEventListener('message', this.handleTrackerMessage.bind(this))
        }
      }

      if (target == WorkerType.imageProcessor) {
        if (this.imgProcessorWorker == null) {
          this.imgProcessorWorker = new ImageProcessorWorker()
          this.imgProcessorWorker.addEventListener('message', this.handleImageProcessorMessage.bind(this))
        }
      }
    }
  }

  public terminate(target: WorkerType) {
    if (target == WorkerType.tracker) {
      this.trackerWorker?.removeEventListener('message', this.handleTrackerMessage.bind(this))
      this.trackerWorker?.terminate()
      this.trackerWorker = null
    }

    if (target == WorkerType.imageProcessor) {
      this.imgProcessorWorker?.removeEventListener('message', this.handleImageProcessorMessage.bind(this))
      this.imgProcessorWorker?.terminate()
      this.imgProcessorWorker = null
    }
  }

  public postMessage(target: WorkerType, data: any, transfer?: Transferable[]) {
    console.log('[main] post', target, data)
    if (target == WorkerType.tracker) {
      this.trackerWorker?.postMessage(data, transfer)
    }

    if (target == WorkerType.imageProcessor) {
      this.imgProcessorWorker?.postMessage(data, transfer)
    }
  }

  private handleImageProcessorMessage(event: MessageEvent) {
    console.log('[main] handle', event.data)
    this._workerStatus.showLoading = false
    this._workerStatus.showProcess = false

    switch (event.data.type) {
      case 'processed':
        let data = event.data.result

        this.previewCtx.clearRect(0, 0, data.width, data.height)
        this.previewCtx.putImageData(data, 0, 0)

        let cmds = []
        if (this._enableFaceDetect) cmds.push(WorkerCMD.faceDetect)
        if (this._enableObjRec) cmds.push(WorkerCMD.objRec)
        if (cmds.length > 0) this.trackerWorker.postMessage({ cmd: cmds, image: data })
        break
      case 'contours':
        console.log(event.data.contours)
        break
    }
  }

  private handleTrackerMessage(event: MessageEvent) {
    this._workerStatus.showLoading = false
    this._workerStatus.showProcess = false
    this._workerStatus.error = event.data.error ? event.data.error : null

    switch (event.data.type) {
      case 'object':
        if (this._drawMode == WorkerDrawMode.image) {
          this._annotationPanel?.drawAnnotations(event.data.boxes,
            event.data.scores, event.data.classes,
            event.data.objNum, event.data.scale)
        } else {
          // drawObjectDetectResult(previewCtx,
          //   event.data.boxes, event.data.scores, event.data.classes,
          //   event.data.objNum, event.data.scale)
        }
        break
      case 'mask':
        this._annotationPanel?.drawAnnotations(event.data.boxes,
          event.data.scores, event.data.classes,
          event.data.objNum, event.data.scale)

        this.drawOverlay(event.data.overlay, event.data.width, event.data.height, event.data.scale)

        this.drawMask(event.data.boxes, event.data.classes, event.data.masks,
          event.data.objNum, event.data.width, event.data.height)
        break
      case 'face':
        if (this._drawMode == WorkerDrawMode.image) {
          drawTFFaceResult(this.previewCtx, event.data.face, 'none', this._drawEigen, true)
        } else {

        }

        // live2dPanel.value?.animateLive2DModel(event.data.tface)
        this.captureCtx.clearRect(0, 0, this.captureCtx.canvas.width, this.captureCtx.canvas.height)
        if (this._drawFaceMesh) {
          drawTFFaceResult(this.captureCtx, event.data.face, 'mesh', false, false, this.captureCtx.canvas.height)
        }
        break
    }
  }

  private drawMask(boxes: Float16Array, classes: Uint8Array, masks: Array<Uint8Array>,
    objNum: number, width: number, height: number) {
    let ratio = 640 / 160
    let length = 0
    let offset = 0
    let contours = []
    if (width == null || width == 0 || height == null || height == 0) return
    const imageData = new ImageData(width, height)
    let rects = []
    for (let i = 0; i < objNum; ++i) {
      let label: CVLabel = this._annotationPanel?.getLabel(classes[i])
      let [r, g, b] = MarkColors.hexToRgb(label.color)
      let i4 = i * 4
      const y1 = Math.round(boxes[i4] / ratio)
      const x1 = Math.round(boxes[i4 + 1] / ratio)
      const y2 = Math.round(boxes[i4 + 2] / ratio)
      const x2 = Math.round(boxes[i4 + 3] / ratio)
      length = (y2 - y1) * (x2 - x1)
      offset += length
      for (let row = x1; row < x2; ++row) {
        for (let col = y1; col < y2; ++col) {
          let id = col * width + row
          let absId = (col - y1) * (x2 - x1) + row - x1
          imageData.data[id * 4] = 255 - r
          imageData.data[id * 4 + 1] = 255 - g
          imageData.data[id * 4 + 2] = 155 - b
          imageData.data[id * 4 + 3] += masks[i][absId] == 0 ? 0 : 200
        }
      }

      rects.push([x1, y1, x2 - x1, y2 - y1])
      this.imgProcessorWorker?.postMessage({ cmd: WorkerCMD.findContours, masks, rects })
    }

    this.maskCtx.canvas.width = width
    this.maskCtx.canvas.height = height
    this.maskCtx.clearRect(0, 0, this.maskCtx.canvas.width, this.maskCtx.canvas.height)
    this.maskCtx.putImageData(imageData, 0, 0)

    let sacle = Math.max(this.previewCtx.canvas.width, this.previewCtx.canvas.height) / Math.max(width, height)
    this.previewCtx.save()
    this.previewCtx.scale(sacle, sacle)
    this.previewCtx.drawImage(this.maskCtx.canvas, 0, 0)
    this.previewCtx.restore()

    contours.forEach(points => {
      points.forEach(p => {
        p[0] *= sacle
        p[1] *= sacle
      })
    })

    for (let i = 0; i < contours.length; ++i) {
      let points = contours[i]
      let label: CVLabel = this._annotationPanel?.getLabel(classes[i])
      let [r, g, b] = MarkColors.hexToRgb(label.color)
      this.previewCtx.beginPath()
      this.previewCtx.moveTo(points[0][0], points[0][1])
      for (let j = 1; j < points.length; ++j) {
        this.previewCtx.lineTo(points[j][0], points[j][1])
      }
      this.previewCtx.closePath()
      this.previewCtx.lineWidth = 2
      this.previewCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.8)`
      this.previewCtx.stroke()
    }
  }

  private drawOverlay(overlay: Uint8Array, width: number, height: number, scale: [number, number]) {
    if (overlay == null) return

    let labels = new Map()
    let imageData = new ImageData(width, height)
    for (let row = 0; row < imageData.width; ++row) {
      for (let col = 0; col < imageData.height; ++col) {
        let idx = row * imageData.height + col
        let id = overlay[idx]
        if (id == undefined) {
          // console.log('undefined', row, col, idx)
          continue
        }
        if (!labels.has(id)) {
          let label: CVLabel = this._annotationPanel.getLabel(id)
          if (label == null) {
            // console.log(id, 'not found')
            label = { id: id, name: 'unknown', color: '#0000FF' }
          }
          labels.set(label.id, label)
        }

        let l = labels.get(id)
        let [r, g, b] = MarkColors.hexToRgb(l.color)
        imageData.data[idx * 4] = r
        imageData.data[idx * 4 + 1] = g
        imageData.data[idx * 4 + 2] = b
        imageData.data[idx * 4 + 3] = 200
      }
    }

    this.maskCtx.canvas.width = width
    this.maskCtx.canvas.height = height
    this.maskCtx.clearRect(0, 0, this.maskCtx.canvas.width, this.maskCtx.canvas.height)
    this.maskCtx.putImageData(imageData, 0, 0)

    this.previewCtx.save()
    this.previewCtx.scale(scale[0], scale[1])
    this.previewCtx.drawImage(this.maskCtx.canvas, 0, 0)
    this.previewCtx.restore()
  }

}