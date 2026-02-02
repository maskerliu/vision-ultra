import * as fabric from 'fabric'
import { v4 as uuidv4 } from 'uuid'
import { showNotify, showToast } from 'vant'
import { Ref } from 'vue'
import { MarkColors } from './CVColors'

export const Def_Object_Labels = [
  "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat", "traffic light",
  "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat", "dog", "horse", "sheep", "cow",
  "elephant", "bear", "zebra", "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee",
  "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove", "skateboard", "surfboard",
  "tennis racket", "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
  "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch",
  "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse", "remote", "keyboard", "cell phone",
  "microwave", "oven", "toaster", "sink", "refrigerator", "book", "clock", "vase", "scissors", "teddy bear",
  "hair drier", "toothbrush"
]

export type CVLabel = {
  id: number,
  name: string,
  color: string,
}

export type CVMarker = Partial<{
  id: string,
  label: number,
  shape: fabric.FabricObject,
}>

export enum DrawType {
  select = 'Select',
  rect = 'Rect',
  circle = 'Circle',
  polygon = 'Polygon',
  line = 'Line',
  multiLine = 'Polyline',
}

export class AnnotationManager {
  private _canvas: fabric.Canvas
  private _lstPos: fabric.XY = { x: 0, y: 0 }
  private _cursorPoint: fabric.Point = new fabric.Point(0, 0)
  private _isDragging = false
  private _drawType: DrawType = DrawType.select
  private _label: Ref<CVLabel>
  set label(label: Ref<CVLabel>) { this._label = label }

  private _activeObject: Ref<fabric.FabricObject>
  set activeObject(val: Ref) { this._activeObject = val }
  get activeObject() { return this._activeObject }

  private _objNum: Ref<number>
  get objNum() { return this._objNum }
  set objNum(val: Ref) { this._objNum = val }

  private defCtrl = fabric.controlsUtils.createObjectDefaultControls()
  private labelText: fabric.FabricText

  private gridGroup: fabric.Group
  private mouseFrom: { x: number, y: number } = { x: 0, y: 0 }
  private onDrawing = false

  private drawingObject: fabric.Object | null = null
  private onPolyDrawing = false
  private polyTmpPoints: Array<fabric.XY> = []
  private polyTmpObjects: Array<fabric.FabricObject> = []

  private static CommonObjectOptions = {
    strokeWidth: 1,
    strokeUniform: true,
    objectCaching: false,
    cornerSize: 10,
    hasBorders: true,
    borderScaleFactor: 1.5
  } as fabric.FabricObjectProps

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this._canvas = new fabric.Canvas(canvas, {
      width, height,
      backgroundColor: '#55555520',
      selection: false,
      allowTouchScrolling: true
    })

    this.labelText = new fabric.FabricText(`-- 0.0%`, {
      fontSize: 12,
      fontFamily: 'sans-serif',
      stroke: '#2C3A47',
      fill: '#ecf0f1',
      strokeWidth: 0,
      width: 50,
      shadow: new fabric.Shadow({
        color: 'rgb(49, 41, 41)',
        blur: 4,
        offsetX: 2,
        offsetY: 4,
        affectStroke: true,
        includeDefaultValues: true,
        nonScaling: false
      }),
      lineHeight: 1.2,
      selectable: false,
      visible: false
    })
    this._canvas.add(this.labelText)

    this.addGrid()
    this.registeCanvasEvent()
  }

  resize(width: number, height: number) {
    this._canvas.setDimensions({ width, height })
    this._canvas.clear()
  }

  add(object: fabric.FabricObject) {
    this._canvas.add(object)
  }

  showGrid(visible: boolean) {
    this.gridGroup.set({ visible })
    this._canvas.requestRenderAll()
  }

  getObjects(type: DrawType) { return this._canvas.getObjects(type as string) }

  clear() {
    [DrawType.circle, DrawType.rect, DrawType.polygon, DrawType.multiLine, DrawType.line].forEach(it => {
      let objects = this._canvas.getObjects(it)
      this._canvas.remove(...objects)
    })
    this._canvas.remove(this.labelText)

    this.addGrid()
    this._canvas.add(this.labelText)
    this._canvas.requestRenderAll()
  }

  remove(type: DrawType, object: fabric.FabricObject) {
    this._canvas.remove(object)
    // let objects = this._canvas.getObjects(type).filter(it => it.get('uuid') == object.get('uuid'))
    // let group = this._markerGroup.get(type)
    // let idx = group.findIndex((it) => it.get('uuid') == object.get('uuid'))
    // group.splice(idx, 1)
  }
  requestRenderAll() {
    this._canvas.requestRenderAll()
  }

  drawAnnotations(boxes: Float16Array, scores: Float16Array, classes: Uint8Array,
    objNum: number, scale: [number, number], contours?: Array<[number, number]>, dpr: number = 1) {

    this.clear()
    if (objNum == 0) return
    let score = "0.0", x1 = 0, y1 = 0, x2 = 0, y2 = 0
    for (let i = 0; i < objNum; ++i) {
      score = (scores[i] * 100).toFixed(1)
      // if (scores[i] * 100 < 30) continue

      if (contours && contours[i] && contours[i].length > 8) {
        let points = contours[i].map(it => { return { x: it[0] / dpr, y: it[1] / dpr } })
        let poly = this.genPoly(points, DrawType.polygon)
        poly.set(AnnotationManager.genLabelOption(this._label.value))
        poly.set({ score, uuid: uuidv4() })
        this.add(poly)
      } else {
        y1 = boxes[i * 4] * scale[1] / dpr
        x1 = boxes[i * 4 + 1] * scale[0] / dpr
        y2 = boxes[i * 4 + 2] * scale[1] / dpr
        x2 = boxes[i * 4 + 3] * scale[0] / dpr
        let rect = this.genRect(x1, y1, x2, y2)
        rect.set(AnnotationManager.genLabelOption(this._label.value))
        rect.set({ score, uuid: uuidv4() })
        this.add(rect)
      }
    }
    this.requestRenderAll()
  }

  changeDrawType(type: DrawType) {
    this._drawType = type
    this._canvas.defaultCursor = type == DrawType.select ? 'default' : 'crosshair'
    if (type == DrawType.select) {
      this.drawingObject = null
      this.onDrawing = false
      this._canvas.remove(...this.polyTmpObjects)
      this._canvas.remove(this.drawingObject)
      this.polyTmpObjects = []
      this.polyTmpPoints = []
      this.drawingObject = null
      this._canvas.getObjects().forEach((obj) => {
        obj.set({ evented: true, selectable: true, })
      })
    } else {
      this._canvas.getObjects().forEach((obj) => {
        obj.set({ evented: false, selectable: false, })
      })
    }

    this.gridGroup.set({ evented: false, selectable: false, })
    this._canvas.discardActiveObject()
    this._canvas.requestRenderAll()
  }

  resetScaleAndMove() {
    this._canvas.setZoom(1)
    this._canvas.viewportTransform = [1, 0, 0, 1, 0, 0]
  }

  private registeCanvasEvent() {

    this._canvas.on('mouse:wheel', opt => {
      let delta = opt.e.deltaY
      let zoom = this._canvas.getZoom()

      // 控制缩放范围在 0.01~20 的区间内
      zoom *= 0.999 ** delta
      if (zoom > 20) zoom = 20
      if (zoom < 0.01) zoom = 0.01

      this._cursorPoint.x = opt.e.offsetX
      this._cursorPoint.y = opt.e.offsetY
      this._canvas.zoomToPoint(this._cursorPoint, zoom)
    })

    this._canvas.on('mouse:move', this.onMouseMove.bind(this))
    this._canvas.on('mouse:down', this.onMouseDown.bind(this))
    this._canvas.on('mouse:up', this.onMouseUp.bind(this))
    this._canvas.on('mouse:dblclick', this.onMouseDblClick.bind(this))


    this._canvas.on('object:moving', e => {
      this.updateLabelText()
    })

    this._canvas.on('object:scaling', e => {
      this.updateLabelText()
    })

    this._canvas.on('selection:created', e => {
      this._activeObject.value = e.selected?.[0] || null

      this.updateLabelText()
    })

    this._canvas.on('selection:updated', e => {
      this._activeObject.value = e.selected?.[0] || null

      this._canvas.bringObjectToFront(this._activeObject.value)
      this.updateLabelText()
    })

    this._canvas.on('selection:cleared', e => {
      this._canvas.discardActiveObject()
      this.labelText.visible = false
      this._activeObject.value = null
    })
  }

  private updateLabelText() {
    let obj = this._activeObject.value
    this.labelText.set('text', `${obj?.get('label')} ${obj?.get('score')}% \n${obj?.get('uuid')?.substr(0, 8)}`)
    this.labelText.left = Math.round(obj?.left + obj?.width * obj?.scaleX + 10)

    if (this.labelText.left > this._canvas.width - this.labelText.width) {
      this.labelText.left = Math.round(this.labelText.left - 20 - this.labelText.width)
    }

    this.labelText.top = Math.round(obj?.top)
    this.labelText.visible = true

    this._canvas.bringObjectToFront(this.labelText)
  }

  private onMouseDblClick(e: fabric.TPointerEventInfo<fabric.TPointerEvent>) {

    if (this._drawType == DrawType.multiLine || this._drawType == DrawType.polygon) {
      if (this.polyTmpPoints.length < 3) {
        showNotify({ type: 'danger', message: '至少绘制3个点', duration: 1000 })
        return
      }

      this.drawingObject = this.genPoly(this.polyTmpPoints, this._drawType)
      this.drawingObject.set(AnnotationManager.genLabelOption(this._label.value))
      this.drawingObject.set({ score: '100.0', uuid: uuidv4() })
      this.drawingObject.set({ evented: false, selectable: false })
      if (this._drawType == DrawType.multiLine) this.drawingObject.set({ fill: 'transparent' })
      this._canvas.add(this.drawingObject)
      this._canvas.remove(...this.polyTmpObjects)
      this._objNum.value++
      // this._markerGroup.get(this._drawType).push(this.drawingObject)
      this.polyTmpPoints = []
      this.polyTmpObjects = []
      this.onPolyDrawing = false
      this.drawingObject = null
      this.mouseFrom = null
      this.onDrawing = false
    }
  }

  private onMouseDown(e: fabric.TPointerEventInfo<fabric.TPointerEvent>) {
    const pointer = this._canvas.getViewportPoint(e.e)
    this._lstPos.x = pointer.x
    this._lstPos.y = pointer.y
    this._isDragging = this._activeObject.value == null && this._drawType == DrawType.select

    if (this._drawType == DrawType.select || this._isDragging) return

    this.mouseFrom = pointer
    this.onDrawing = true

    if (this._drawType == DrawType.multiLine || this._drawType == DrawType.polygon) {
      this.onPolyDrawing = true

      let circle = this.genCircle(pointer.x - 6, pointer.y - 6, pointer.x + 6, pointer.y + 6)
      circle.set(AnnotationManager.genLabelOption({ id: -1, name: 'tmp', color: '#bdc3c7' }))
      circle.set({ strokeWidth: 1, selectable: false, evented: false })
      if (this.polyTmpPoints.length == 0) circle.set({ fill: '#f39c12', strokeWidth: 2 })
      this._canvas.add(circle)
      this.polyTmpObjects.push(circle)

      this.drawingObject = this.genLine(pointer.x, pointer.y, pointer.x, pointer.y)
      this.drawingObject.set(AnnotationManager.genLabelOption({ id: -1, name: 'tmp', color: '#bdc3c7' }))
      this.drawingObject.set({ strokeWidth: 2, selectable: false, evented: false })
      this._canvas.add(this.drawingObject)
      this.polyTmpObjects.push(this.drawingObject)
      this.polyTmpPoints.push({ x: pointer.x, y: pointer.y })

      return
    }

    switch (this._drawType) {
      case DrawType.rect:
        this.drawingObject = this.genRect(pointer.x, pointer.y, pointer.x, pointer.y)
        break
      case DrawType.circle:
        this.onDrawing = true
        this.drawingObject = this.genCircle(pointer.x, pointer.y, pointer.x, pointer.y)
        break
      case DrawType.line:
        this.onDrawing = true
        this.drawingObject = this.genLine(pointer.x, pointer.y, pointer.x, pointer.y)
        break
    }

    this.drawingObject.set(AnnotationManager.genLabelOption(this._label.value))
    this.drawingObject.set({ score: '100.0', uuid: uuidv4() })
    this.drawingObject.set({ evented: false, selectable: false })
    this._canvas.add(this.drawingObject)
    this._canvas.bringObjectToFront(this.drawingObject)
    this._canvas.requestRenderAll()
  }

  private onMouseMove(e: fabric.TPointerEventInfo<fabric.TPointerEvent>) {
    const pointer = this._canvas.getViewportPoint(e.e)
    if (this._isDragging && this._drawType == DrawType.select) {
      let vpt = this._canvas.viewportTransform
      vpt[4] += pointer.x - this._lstPos.x
      vpt[5] += pointer.y - this._lstPos.y
      this._canvas.requestRenderAll()
      this._lstPos.x = pointer.x
      this._lstPos.y = pointer.y
    }

    if (!this.onDrawing || this._drawType == DrawType.select || this._isDragging) return
    switch (this._drawType) {
      case DrawType.rect:
        const width = pointer.x - this.mouseFrom.x
        const height = pointer.y - this.mouseFrom.y
        this.drawingObject.set({
          left: width > 0 ? this.mouseFrom.x : pointer.x,
          top: height > 0 ? this.mouseFrom.y : pointer.y,
          width: Math.abs(width),
          height: Math.abs(height),
        })
        this._canvas.requestRenderAll()
        break
      case DrawType.circle:
        this.drawingObject.set({
          radius: Math.abs(Math.min(pointer.x - this.mouseFrom.x, pointer.y - this.mouseFrom.y)) / 2,
        })
        this._canvas.requestRenderAll()
        break
      case DrawType.line:
        this.drawingObject.set({
          x2: pointer.x,
          y2: pointer.y,
        })
        this._canvas.requestRenderAll()
        break
      case DrawType.polygon:
      case DrawType.multiLine:
        if (this.onPolyDrawing) {
          this.drawingObject.set({ x2: pointer.x, y2: pointer.y })
          this._canvas.requestRenderAll()
        }
        break
    }

  }

  private onMouseUp(e: fabric.TPointerEventInfo<fabric.TPointerEvent>) {
    if (this._isDragging) {
      this._canvas.setViewportTransform(this._canvas.viewportTransform)
      this._isDragging = false
      return
    }

    if (!this.onDrawing || this._drawType == DrawType.select) return

    switch (this._drawType) {
      case DrawType.rect:
      case DrawType.circle:
      case DrawType.line:
        if (this.drawingObject.width < 20 || this.drawingObject.height < 20) {
          this._canvas.remove(this.drawingObject)
          showToast({ message: 'The object is too small', duration: 500 })
        } else {
          // this._markerGroup.get(this._drawType).push(this.drawingObject)
          // this._canvas.add(this.drawingObject)
          this._canvas.setActiveObject(this.drawingObject)

          this.drawingObject = null
          this.mouseFrom = null
          this.onDrawing = false
          this._canvas.requestRenderAll()
          this._objNum.value++
        }
        break
    }
  }

  genImage(canvas: HTMLCanvasElement) {

    let img = new fabric.FabricImage(canvas, {
      scaleX: 0.5,
      scaleY: 0.5
    })
    this._canvas.backgroundImage = img
    this._canvas.requestRenderAll()
  }

  genRect(x1: number, y1: number, x2: number, y2: number) {

    const rect = new fabric.Rect(AnnotationManager.CommonObjectOptions)
    rect.set({
      left: x1,
      top: y1,
      width: x2 - x1,
      height: y2 - y1,
    })

    rect.on('mouseover', (e) => {
      this._canvas.setActiveObject(rect)
      this._canvas.requestRenderAll()

      console.log(rect)
    })

    return rect
  }

  genCircle(x1: number, y1: number, x2: number, y2: number) {

    const circle = new fabric.Circle(AnnotationManager.CommonObjectOptions)
    circle.set({
      left: x1,
      top: y1,
      radius: Math.min(x2 - x1, y2 - y1) / 2,
    })

    circle.on('mouseover', () => {
      this._canvas.setActiveObject(circle)
      this._canvas.requestRenderAll()
    })

    return circle
  }

  genLine(x1: number, y1: number, x2: number, y2: number) {
    const line = new fabric.Line([x1, y1, x2, y2], AnnotationManager.CommonObjectOptions)
    return line
  }

  genPoly(points: fabric.XY[], type: DrawType) {
    let poly: fabric.Polygon | fabric.Polyline
    if (type == DrawType.polygon)
      poly = new fabric.Polygon(points, AnnotationManager.genCommonOption())
    if (type == DrawType.multiLine)
      poly = new fabric.Polyline(points, AnnotationManager.genCommonOption())

    poly.set({ editing: true })
    poly.on('mousedblclick', () => {
      if (poly.get('editing')) {
        poly.set({ cornerStyle: 'circle', hasBorders: false, editing: false })
        poly.controls = fabric.controlsUtils.createPolyControls(poly)
        for (let key in poly.controls) {
          poly.controls[key].mouseUpHandler = (data, transform, x, y) => {
            // console.log(data, transform, x, y)
          }
        }
      } else {
        poly.set({ cornerStyle: 'rect', hasBorders: true, editing: true, controls: this.defCtrl })
      }
      poly.setCoords()
      this._canvas.requestRenderAll()
    })


    poly.on('mouseover', () => {
      this._canvas.setActiveObject(poly)
      this._canvas.renderAll()
    })

    return poly
  }

  addGrid() {
    if (!this._canvas) return

    const gridSize = 40
    const gridColor = 'rgba(200, 200, 200, 0.9)'

    this.gridGroup = new fabric.Group([], { visible: false, selectable: false, evented: false, })
    // 垂直网格线
    for (let x = 0; x <= this._canvas.width; x += gridSize) {
      const line = new fabric.Line([x, 0, x, this._canvas.height], {
        stroke: gridColor,
        strokeWidth: 1,
        selectable: false,
        evented: false,
      })
      this.gridGroup.add(line)
    }

    // 水平网格线
    for (let y = 0; y <= this._canvas.height; y += gridSize) {
      const line = new fabric.Line([0, y, this._canvas.width, y], {
        stroke: gridColor,
        strokeWidth: 1,
        selectable: false,
        evented: false,
      })
      this.gridGroup.add(line)
    }
    this._canvas.add(this.gridGroup)
  }

  mock() {

    const points = [
      { x: 3, y: 4, },
      { x: 16, y: 3, },
      { x: 30, y: 5, },
      { x: 25, y: 55, },
      { x: 19, y: 44, },
      { x: 15, y: 30, },
      { x: 15, y: 55, },
      { x: 9, y: 55, },
      { x: 6, y: 53, },
      { x: -2, y: 55, },
      { x: -4, y: 40, },
      { x: 0, y: 20, },
    ]

    let rect = this.genRect(120, 200, 220, 280)
    rect.set(AnnotationManager.genLabelOption({ id: 0, name: 'bus', color: '#EAB543' }))
    rect.set('score', '90.4')
    rect.set('uuid', uuidv4())
    this._canvas.add(rect)

    rect = this.genRect(240, 250, 320, 360)
    rect.set(AnnotationManager.genLabelOption({ id: 0, name: 'bus', color: '#EAB543' }))
    rect.set('score', '90.4')
    rect.set('uuid', uuidv4())
    this._canvas.add(rect)

    let poly = this.genPoly(points, DrawType.polygon)
    poly.set(AnnotationManager.genLabelOption({ id: 0, name: 'person', color: '#e74c3c' }))
    poly.set('score', '90.4')
    poly.set('uuid', uuidv4())
    this._canvas.add(poly)
  }

  static genLabelOption(label: CVLabel) {
    return {
      label: label.name,
      stroke: label.color,
      fill: MarkColors.hexToRgba(label.color, 0.2),
      cornerColor: MarkColors.reverseColor(label.color, 1),
      // cornerStrokeColor: MarkColors.reverseColor(label.color, 0.8),
      borderColor: MarkColors.reverseColor(label.color),
    }
  }

  static genCommonOption() {
    return {
      strokeWidth: 1,
      strokeUniform: true,
      objectCaching: false,
      cornerSize: 10,
      hasBorders: true,
      borderScaleFactor: 1.5
    } as fabric.FabricObjectProps
  }
}