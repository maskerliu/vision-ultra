
import { CVLabel, MarkColors, } from '.'
import CVProcessWorker from '../cvProcess.worker?worker'
import FaceDetectWorker from '../faceDetect.worker?worker'
import ObjDetectWorker from '../objDetect.worker?worker'
import { FaceDetectResult, ModelType, ObjectDetectResult, WorkerCMD } from './misc'

export enum WorkerType { faceDetect, objDetect, cvProcess }
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

  private workers: Map<WorkerType, Worker> = new Map()

  private _workerStatus: WorkerStatus = {
    showLoading: false,
    showProcess: false,
    error: null
  }
  set workerStatus(val: WorkerStatus) { this._workerStatus = val }

  private _drawMode: WorkerDrawMode = WorkerDrawMode.image
  set drawMode(val: WorkerDrawMode) { this._drawMode = val }

  private _enableObjDetect = false
  set enableObjDetect(val: boolean) { this._enableObjDetect = val }

  private _enableFaceDetect = false
  set enableFaceDetect(val: boolean) { this._enableFaceDetect = val }

  private _enableCVProcess = false
  set enableCVProcess(val: boolean) { this._enableCVProcess = val }
  get enableCVProcess() { return this._enableCVProcess }

  private _drawFaceMesh = false
  set drawFaceMesh(val: boolean) { this._drawFaceMesh = val }

  private _drawEigen = false
  set drawEigen(val: boolean) { this._drawEigen = val }

  private _objects: ObjectDetectResult
  get objects(): ObjectDetectResult { return this._enableObjDetect ? this._objects : null }

  private _face: FaceDetectResult
  get face(): FaceDetectResult { return this._enableFaceDetect ? this._face : null }

  private _frame: ImageData
  get frame() { return this._frame }

  private _annotationPanel: any
  set annotationPanel(val: any) { this._annotationPanel = val }

  private _frames = 0

  constructor(previewCtx: CanvasRenderingContext2D,
    captureCtx: CanvasRenderingContext2D,
    maskCtx: CanvasRenderingContext2D) {
    this.previewCtx = previewCtx
    this.captureCtx = captureCtx
    this.maskCtx = maskCtx
  }

  public register(target: WorkerType, data?: any) {
    if (this.workers.has(target)) return

    let worker: Worker
    switch (target) {
      case WorkerType.cvProcess: {
        worker = new CVProcessWorker()
        worker.addEventListener('message', this.handleCVProcessMessage.bind(this))
        break
      }
      case WorkerType.faceDetect: {
        worker = new FaceDetectWorker()
        worker.addEventListener('message', this.handleFaceDetectMessage.bind(this))
        break
      }
      case WorkerType.objDetect: {
        worker = new ObjDetectWorker()
        worker.addEventListener('message', this.handleObjDetectMessage.bind(this))
        break
      }
    }
    this.workers.set(target, worker)

    if (data != null) this.postMessage(target, data)
  }

  private worker(type: WorkerType) {
    return this.workers.get(type)
  }
  public terminate(target: WorkerType) {
    this.worker(target)?.terminate()
    this.workers.delete(target)
  }

  public postMessage(
    target: WorkerType,
    data: Partial<{
      cmd: WorkerCMD,
      modelTypes?: ModelType[],
      model?: string,
      image?: ImageData,
      options?: any
    }>,
    transfer?: Transferable[]) {
    // console.log(`[main] ${target} post`, data)
    if (!this._enableCVProcess && target == WorkerType.cvProcess) return
    if (!this._enableFaceDetect && target == WorkerType.faceDetect) return
    if (!this._enableObjDetect && target == WorkerType.objDetect) return

    this.worker(target)?.postMessage(data, transfer)
  }

  public handleMessage(event: MessageEvent) {

  }

  private handleCVProcessMessage(event: MessageEvent) {
    // console.log('[main] cvProcess', event.data)
    this._workerStatus.showLoading = false
    this._workerStatus.showProcess = false

    switch (event.data.type) {
      case 'processed':
        this._frame = event.data.result
        if (this._drawMode == WorkerDrawMode.video) {
          if (this._frames == 6) {
            this.postMessage(WorkerType.objDetect,
              { cmd: WorkerCMD.process, image: this._frame },)
            this.postMessage(WorkerType.faceDetect,
              { cmd: WorkerCMD.process, image: this._frame },)
            this._frames = 0
          } else if (this._frames == 3) {
            this.postMessage(WorkerType.faceDetect,
              { cmd: WorkerCMD.process, image: this._frame },)
          } else {
            this._frames++
          }
        } else {
          this.postMessage(WorkerType.objDetect, { cmd: WorkerCMD.process, image: this._frame },)
          this.postMessage(WorkerType.faceDetect, { cmd: WorkerCMD.process, image: this._frame },)
        }

        console.log(this._frame.data.length)
        this.previewCtx.clearRect(0, 0, this._frame.width, this._frame.height)
        this.previewCtx.putImageData(this._frame, 0, 0)
        break
      case 'contours':
        console.log(event.data.contours)
        break
    }
  }

  private handleFaceDetectMessage(event: MessageEvent<any>) {
    // console.log('[main] faceDetect', event.data)
    this._workerStatus.showLoading = false
    this._workerStatus.showProcess = false

    switch (event.data.type) {
      case 'face':
        this._face = event.data.face
        // if (this._drawMode == WorkerDrawMode.image) {
        //   drawTFFaceResult(this.previewCtx, this._face, 'none', this._drawEigen, true)
        //   if (this._drawFaceMesh) {
        //     this.captureCtx.clearRect(0, 0, this.captureCtx.canvas.width, this.captureCtx.canvas.height)
        //     drawTFFaceResult(this.captureCtx, this._face, 'mesh', false, false, this.captureCtx.canvas.height)
        //   }
        // }

        // live2dPanel.value?.animateLive2DModel(event.data.tface)
        break
    }
  }

  private handleObjDetectMessage(event: MessageEvent) {
    console.log('[main] objDetect', event.data)
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
    }
  }

  private drawMask(boxes: Float16Array, classes: Uint8Array, masks: Array<Uint8Array>,
    objNum: number, width: number, height: number) {
    let ratio = 640 / 160
    let length = 0
    let offset = 0

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
    }

    // this.cvProcessWorker?.postMessage({ cmd: WorkerCMD.findContours, masks, rects })

    this.maskCtx.canvas.width = width
    this.maskCtx.canvas.height = height
    this.maskCtx.clearRect(0, 0, this.maskCtx.canvas.width, this.maskCtx.canvas.height)
    this.maskCtx.putImageData(imageData, 0, 0)

    let sacle = Math.max(this.previewCtx.canvas.width, this.previewCtx.canvas.height) / Math.max(width, height)
    this.previewCtx.save()
    this.previewCtx.scale(sacle, sacle)
    this.previewCtx.drawImage(this.maskCtx.canvas, 0, 0)
    this.previewCtx.restore()

    let contours = []
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