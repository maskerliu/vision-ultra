
import {
  CVMsg, FaceDetectMsg, FaceDetectResult, FaceRec,
  ImgGenMsg, IProcessor, ObjectDetectResult, ObjTrackMsg,
  OCRMsg, ProcessorCMD, StyleTransMsg
} from '@shared/index'
import { showNotify } from 'vant'
import { CVLabel, MarkColors, } from '..'
import { drawTFFaceResult, FACE_DIMS, getFaceContour } from '../DrawUtils'
import { extractEigenFeatures } from '..'

/** 识别结果缓存类型 */
export type RecognizeResult = {
  id: string
  name: string
  similarity: number // 相似度 0~100
  timestamp: string
  recognizedAt: number // 本次识别时刻（Date.now()）
}


export enum DrawMode { video, image }
export enum ProcessorType {
  unknown = -1,
  cvProcess = 'CV',
  objTrack = 'ObjTrack',
  faceDetect = 'FaceDetect',
  animeGen = 'AnimeGen',
  ocr = 'Ocr',
  styleTrans = 'StyleTrans'
}
export type ProcessorStatus = {
  showLoading: boolean,
  showProcess: boolean,
  error?: string
}

/** 识别节流间隔（ms）：视频模式下每隔此时间执行一次识别 */
const RECOGNIZE_INTERVAL_MS = 1500
/** 最低相似度阈值：低于此值不显示识别结果（人脸特征点比对，适当放宽） */
const RECOGNIZE_THRESHOLD = 35

const dpr = window.devicePixelRatio || 1

// abstract Processor Manager which can be web worker or ipc object
export abstract class ProcessorManager {
  protected previewCtx: CanvasRenderingContext2D
  protected offscreenCtx: OffscreenCanvasRenderingContext2D
  protected eigenCtx: CanvasRenderingContext2D
  protected masklayerCtx: OffscreenCanvasRenderingContext2D
  protected maskCtx: CanvasRenderingContext2D

  protected processors: Map<ProcessorType, Worker | IProcessor> = new Map()

  protected _drawMode: DrawMode = DrawMode.image
  set drawMode(val: DrawMode) { this._drawMode = val }

  protected _processorStatus: ProcessorStatus = {
    showLoading: false,
    showProcess: false,
    error: null
  }
  set workerStatus(val: ProcessorStatus) { this._processorStatus = val }

  // protected _enableCV = false
  // get enableCV() { return this._enableCV }
  // protected _enableObjTrack = false
  // protected _enableFaceDetect = false
  // protected _enableImgGen = false
  // protected _enableOcr = false
  // protected _enableStyleTrans = false

  protected _drawFaceMesh = false
  set drawFaceMesh(val: boolean) { this._drawFaceMesh = val }

  protected _drawEigen = false
  set drawEigen(val: boolean) { this._drawEigen = val }

  protected _objects: ObjectDetectResult
  get objects(): ObjectDetectResult { return this[ProcessorType.objTrack] ? this._objects : null }

  protected _face: FaceDetectResult
  get face(): FaceDetectResult { return this[ProcessorType.faceDetect] ? this._face : null }
  get faceMesh(): FaceDetectResult { return this._drawEigen ? this._face : null }

  protected _processed: ImageData
  protected _origin: ImageData
  get origin() { return this._origin }

  protected _style: ImageData
  set style(val: ImageData) { this._style = val }

  protected _annotationPanel: any
  set annotationPanel(val: any) { this._annotationPanel = val }

  protected _live2dPanel: any
  set live2dPanel(val: any) { this._live2dPanel = val }

  protected _frames = 1

  /** 上一次识别请求的时间戳（节流控制）*/
  protected _lastRecognizeAt = 0
  /** 是否正在识别中（防止重复并发请求）*/
  protected _isRecognizing = false
  /** 上一次成功识别的结果 */
  protected _recognizeResult: RecognizeResult | null = null
  /** 识别结果回调（供 Vue 组件监听）*/
  onRecognizeResult: ((result: RecognizeResult | null) => void) | null = null
  /** 是否启用实时识别（由 UI 控制）*/
  protected _enableRecognize = false
  set enableRecognize(val: boolean) {
    this._enableRecognize = val
    if (!val) {
      this._recognizeResult = null
      this.onRecognizeResult?.(null)
    }
  }
  get enableRecognize() { return this._enableRecognize }

  constructor(previewCtx: CanvasRenderingContext2D,
    offscreenCtx: OffscreenCanvasRenderingContext2D,
    captureCtx: CanvasRenderingContext2D,
    maskCtx: CanvasRenderingContext2D) {
    this.previewCtx = previewCtx
    this.offscreenCtx = offscreenCtx
    this.eigenCtx = captureCtx
    let masklayer = new OffscreenCanvas(captureCtx.canvas.width, captureCtx.canvas.height)
    this.masklayerCtx = masklayer.getContext('2d')
    this.maskCtx = maskCtx

    this[ProcessorType.cvProcess] = false
    this[ProcessorType.objTrack] = false
    this[ProcessorType.faceDetect] = false
    this[ProcessorType.animeGen] = false
    this[ProcessorType.ocr] = false
    this[ProcessorType.styleTrans] = false
  }

  protected abstract register(target: ProcessorType, data?: any): Promise<void>

  abstract postMessage(
    target: ProcessorType,
    data: CVMsg | ObjTrackMsg | FaceDetectMsg | ImgGenMsg | OCRMsg | StyleTransMsg,
    transfer?: Transferable[]): Promise<void>

  abstract onDraw(data?: HTMLImageElement | HTMLVideoElement): Promise<void>

  protected processor(target: ProcessorType) {
    return this.processors.get(target)
  }

  protected terminate(target: ProcessorType) {
    this.processor(target)?.terminate()
    this.processors.delete(target)
  }

  terminateAll() {
    for (let key of this.processors.keys()) {
      this.terminate(key)
    }
  }

  async setParam(type: ProcessorType, val: boolean, metadata?: any, force: boolean = false) {

    if (this[type] == val && !force) return
    this[type] = val

    if (val) {
      this._processorStatus.showLoading = true
      if (force) { this.terminate(type) }
      await this.register(type, Object.assign({ cmd: ProcessorCMD.init }, metadata))
    } else {
      this.terminate(type)
    }
  }

  updateSize(width: number, height: number) {

    if (this.previewCtx.canvas.width == width * dpr && this.previewCtx.canvas.height == height * dpr) return

    this.previewCtx.canvas.style.width = width + 'px'
    this.previewCtx.canvas.style.height = height + 'px'

    this.offscreenCtx.canvas.width = this.previewCtx.canvas.width = this.maskCtx.canvas.width = width * dpr
    this.offscreenCtx.canvas.height = this.previewCtx.canvas.height = this.maskCtx.canvas.height = height * dpr

    this._annotationPanel.resize(width, height)
  }

  flip(val: boolean) {
    if (val) {
      this.offscreenCtx.scale(-1, 1)
      this.offscreenCtx.translate(-this.offscreenCtx.canvas.width, 0)
    }
  }

  drawFace() {
    if (this.face == null) return

    drawTFFaceResult(this.previewCtx, this.face, 'none', this._drawEigen, true)

    let ratio = Math.min(220 / this.face.box.width, 280 / this.face.box.height)
    let finalW = Math.ceil(this.face.box.width * ratio)
    let finalH = Math.ceil(this.face.box.height * ratio)
    this.eigenCtx.canvas.width = finalW
    this.eigenCtx.canvas.height = finalH
    this.eigenCtx.clearRect(0, 0, finalW, finalH)
    this.masklayerCtx.clearRect(0, 0, finalW, finalH)
    if (this._drawFaceMesh) {
      drawTFFaceResult(this.eigenCtx, this.face, 'mesh', false, false, [finalW, finalH])
    }
  }

  drawObjects() {

    if (this.objects == null || this.objects.objNum == 0) return

    this.previewCtx.font = `16px Arial`
    this.previewCtx.textBaseline = "top"
    let score = '0.0', x1 = 0, y1 = 0, x2 = 0, y2 = 0, width = 0, height = 0
    for (let i = 0; i < this.objects.objNum; ++i) {
      score = (this.objects.scores[i] * 100).toFixed(1)

      let label: CVLabel = this._annotationPanel?.getLabel(this.objects.classes[i])
      y1 = this.objects.boxes[i * 4] * this.objects.scale[1]
      x1 = this.objects.boxes[i * 4 + 1] * this.objects.scale[0]
      y2 = this.objects.boxes[i * 4 + 2] * this.objects.scale[1]
      x2 = this.objects.boxes[i * 4 + 3] * this.objects.scale[0]
      width = x2 - x1
      height = y2 - y1

      this.previewCtx.fillStyle = MarkColors.hexToRgba(label.color, 0.2)
      this.previewCtx.fillRect(x1, y1, width, height)

      this.previewCtx.strokeStyle = MarkColors.hexToRgba(label.color, 1)
      this.previewCtx.lineWidth = 2
      this.previewCtx.strokeRect(x1, y1, width, height)

      this.previewCtx.fillStyle = MarkColors.hexToRgba(label.color, 0.8)
      this.previewCtx.fillRect(x1 + width / 2 - 20, y1 + height / 2 - 7, 40, 10)

      this.previewCtx.fillStyle = MarkColors.WHITE
      this.previewCtx.fillText(`${score}%`, x1 + width / 2 - 18, y1 + height / 2 - 5)
    }
  }

  protected async drawMask(): Promise<Array<[number, number, number, number]>> {
    if (this.objects == null || this.objects.objNum == 0 || this.objects.segSize == null ||
      this.objects.segSize[0] <= 0 || this.objects.segSize[1] <= 0 ||
      this.objects.masks == null) return

    let offscreen = new OffscreenCanvas(this.objects.segSize[0], this.objects.segSize[1])
    let offscreenCtx = offscreen.getContext('2d')
    this.maskCtx.canvas.width = this.objects.segSize[0]
    this.maskCtx.canvas.height = this.objects.segSize[1]
    let rects = []
    let i = 0, x1 = 0, y1 = 0, x2 = 0, y2 = 0
    for (i = 0; i < this.objects.objNum; ++i) {
      let label: CVLabel = this._annotationPanel?.getLabel(this.objects.classes[i])
      if (label == null) continue
      let [r, g, b] = MarkColors.hexToRgb(label.color)
      let i4 = i * 4
      // const y1 = Math.round(this.objects.boxes[i4] / this.objects.segScale[1])
      // const x1 = Math.round(this.objects.boxes[i4 + 1] / this.objects.segScale[0])
      // const y2 = Math.round(this.objects.boxes[i4 + 2] / this.objects.segScale[1])
      // const x2 = Math.round(this.objects.boxes[i4 + 3] / this.objects.segScale[0])

      y1 = Math.ceil(this.objects.boxes[i4] / this.objects.segScale[1])
      x1 = Math.ceil(this.objects.boxes[i4 + 1] / this.objects.segScale[0])
      y2 = Math.ceil(this.objects.boxes[i4 + 2] / this.objects.segScale[1])
      x2 = Math.ceil(this.objects.boxes[i4 + 3] / this.objects.segScale[0])
      x1 = x1 < 0 ? 0 : x1
      y1 = y1 < 0 ? 0 : y1
      x2 = x2 > this.objects.segSize[1] ? this.objects.segSize[1] : x2
      y2 = y2 > this.objects.segSize[0] ? this.objects.segSize[0] : y2
      let mask = new ImageData(x2 - x1, y2 - y1)
      for (let col = 0; col < mask.height; ++col) {
        for (let row = 0; row < mask.width; ++row) {
          let id = col * mask.width + row
          if (this.objects.masks[i][id] != 0) {
            mask.data[id * 4] = 255 - r
            mask.data[id * 4 + 1] = 255 - g
            mask.data[id * 4 + 2] = 255 - b
            mask.data[id * 4 + 3] = 200
          }
        }
      }
      offscreenCtx.clearRect(0, 0, offscreen.width, offscreen.height)
      offscreenCtx.putImageData(mask, x1, y1)
      this.maskCtx.drawImage(offscreen, 0, 0)
      rects.push([x1, y1, x2 - x1, y2 - y1])
    }

    this.previewCtx.save()
    this.previewCtx.scale(this.objects.scale[0] * this.objects.segScale[0],
      this.objects.scale[1] * this.objects.segScale[1])
    this.previewCtx.drawImage(this.maskCtx.canvas, 0, 0)
    this.previewCtx.restore()

    return rects
  }

  protected drawContours(contours: Array<[number, number]>) {
    for (let i = 0; i < contours.length; ++i) {
      let points = contours[i]
      let label: CVLabel = this._annotationPanel?.getLabel(this.objects.classes[i])
      let [r, g, b] = MarkColors.hexToRgb(label.color)
      this.previewCtx.beginPath()
      this.previewCtx.moveTo(points[0][0], points[0][1])
      for (let j = 1; j < points.length; ++j) {
        this.previewCtx.lineTo(points[j][0], points[j][1])
      }
      this.previewCtx.closePath()
      this.previewCtx.lineWidth = 1.5
      this.previewCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.8)`
      this.previewCtx.stroke()
    }
  }

  protected drawOverlay() {
    if (this.objects.overlay == null) return
    let labels = new Map()
    let width = Math.round(this.previewCtx.canvas.width / this.objects.scale[0])
    let height = Math.round(this.previewCtx.canvas.height / this.objects.scale[1])
    let imageData = new ImageData(width, height)
    for (let row = 0; row < width; ++row) {
      for (let col = 0; col < height; ++col) {
        let idx = row * height + col
        let id = this.objects.overlay[idx]
        if (id == undefined) {
          // console.log('undefined', row, col, idx)
          continue
        }
        if (!labels.has(id)) {
          let label: CVLabel = this._annotationPanel?.getLabel(id)
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

    this.maskCtx.canvas.width = Math.round(this.previewCtx.canvas.width * this.objects.scale[0])
    this.maskCtx.canvas.height = Math.round(this.previewCtx.canvas.height * this.objects.scale[1])
    this.maskCtx.putImageData(imageData, 0, 0)

    this.previewCtx.save()
    this.previewCtx.scale(this.objects.scale[0], this.objects.scale[1])
    this.previewCtx.drawImage(this.maskCtx.canvas, 0, 0)
    this.previewCtx.restore()
  }

  /** 人脸采集：提取当前帧几何特征向量，截取头像后注册到 LanceDB */
  async faceCapture(name: string) {
    if (this.face == null || !this.face.valid || this.face.landmarks == null || this.face.landmarks.length == 0) {
      showNotify({ type: 'warning', message: '未检测到有效人脸...', duration: 500 })
      return
    }

    this.eigenCtx.clearRect(0, 0, this.eigenCtx.canvas.width, this.eigenCtx.canvas.height)
    this.masklayerCtx.clearRect(0, 0, this.eigenCtx.canvas.width, this.eigenCtx.canvas.height)

    let ratio = Math.min(this.eigenCtx.canvas.width / this.face.box.width,
      this.eigenCtx.canvas.height / this.face.box.height)

    let finalW = Math.round(this.face.box.width * ratio)
    let finalH = Math.round(this.face.box.height * ratio)

    this.masklayerCtx.canvas.width = this.eigenCtx.canvas.width = finalW
    this.masklayerCtx.canvas.height = this.eigenCtx.canvas.height = finalH
    this.eigenCtx.drawImage(this.previewCtx.canvas,
      this.face.box.xMin, this.face.box.yMin, this.face.box.width, this.face.box.height, 0, 0, finalW, finalH)
    let imageData = this.eigenCtx.getImageData(0, 0, finalW, finalH)
    let faceOval = getFaceContour(this.face, [finalW, finalH])
    let region = new Path2D()
    region.moveTo(faceOval[0], faceOval[1])
    this.masklayerCtx.moveTo(faceOval[0], faceOval[1])
    for (let i = FACE_DIMS; i < faceOval.length; i += FACE_DIMS) {
      region.lineTo(faceOval[i], faceOval[i + 1])
    }
    region.closePath()
    this.masklayerCtx.fillStyle = '#ff000088'
    this.masklayerCtx.fill(region)
    let maskImgData = this.masklayerCtx.getImageData(0, 0, finalW, finalH)
    for (let i = 0; i < maskImgData.data.length; i += 4) {
      if (maskImgData.data[i + 3] != 136) {
        maskImgData.data[i + 3] = 0
        imageData.data[i + 3] = 0
      }
    }

    this.masklayerCtx.putImageData(maskImgData, 0, 0)
    this.eigenCtx.putImageData(imageData, 0, 0)

    // 将 canvas 转为 blob 并上传注册人脸
    const blob = await new Promise<Blob>((resolve) => this.eigenCtx.canvas.toBlob(resolve, 'image/png'))
    if (!blob) {
      showNotify({ type: 'warning', message: '图片生成失败', duration: 500 })
      return
    }

    try {
      // 提取几何距离特征向量（100维），替代原始1404+维原始坐标
      const eigenVector = extractEigenFeatures(this.face.landmarks)
      console.log('[faceCapture] eigen features length:', eigenVector.length, 'sample:', eigenVector.slice(0, 8))
      await FaceRec.registe(name, eigenVector, new File([blob], 'avatar.png', { type: 'image/png' }))
      showNotify({ type: 'success', message: '人脸采集成功', duration: 500 })
    } catch (err) {
      console.error(err)
      showNotify({ type: 'warning', message: '保存失败', duration: 500 })
    }
  }

  /**
   * 人脸识别：提取当前帧人脸特征向量，与 LanceDB 数据库进行相似度搜索
   * 支持节流控制，视频流下每 RECOGNIZE_INTERVAL_MS 毫秒最多触发一次
   */
  async faceRecognize() {
    if (!this._enableRecognize || this.face == null || !this.face.valid || this.face.landmarks == null || this.face.landmarks.length == 0) {
      return
    }

    const now = Date.now()
    if (this._isRecognizing || now - this._lastRecognizeAt < RECOGNIZE_INTERVAL_MS) {
      return
    }

    this._isRecognizing = true
    this._lastRecognizeAt = now

    try {
      // 提取几何距离特征向量（100维），替代原始1404+维原始坐标
      const eigenVector = extractEigenFeatures(this.face.landmarks)
      console.log('[faceRecognize] eigen features length:', eigenVector.length, 'sample:', eigenVector.slice(0, 8))
      const result = await FaceRec.recognize(eigenVector)
      // 如果识别过程中被关闭了，丢弃结果
      if (!this._enableRecognize) {
        this._isRecognizing = false
        return
      }
      console.log('[faceRecognize] result:', result)
      if (result && result.similarity >= RECOGNIZE_THRESHOLD) {
        this._recognizeResult = { ...result, recognizedAt: now }
        this.onRecognizeResult?.(this._recognizeResult)
      } else {
        // 相似度过低，视为未识别到
        console.log('[faceRecognize] similarity too low or null:', result)
        this._recognizeResult = null
        this.onRecognizeResult?.(null)
      }
    } catch (err) {
      // 如果识别过程中被关闭了，忽略错误
      if (!this._enableRecognize) {
        this._isRecognizing = false
        return
      }
      console.log('[faceRecognize] error:', err)
      // 'no match' 或其他错误：清空识别结果
      this._recognizeResult = null
      this.onRecognizeResult?.(null)
    } finally {
      this._isRecognizing = false
    }
  }

  /** 清空识别结果缓存（切换模式/无人脸时调用） */
  clearRecognizeResult() {
    this._recognizeResult = null
    this._lastRecognizeAt = 0
    this.onRecognizeResult?.(null)
  }

}