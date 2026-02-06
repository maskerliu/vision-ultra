import * as fabric from 'fabric'
import { v4 as uuidv4 } from 'uuid'
import { showNotify, showToast } from 'vant'
import { ref, Ref } from 'vue'
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
  private _label: Ref<CVLabel> = ref()
  get label() { return this._label }

  private _activeObj: Ref<string> = ref(null)
  get activeObject() { return this._activeObj }

  private _objNum: Ref<number> = ref(0)
  get objNum() { return this._objNum }

  private defCtrl = fabric.controlsUtils.createObjectDefaultControls()
  private labelText: fabric.FabricText

  private gridGroup: fabric.Group
  private mouseFrom: { x: number, y: number } = { x: 0, y: 0 }
  private onDrawing = false

  private drawingObj: fabric.Object | null = null
  private onPolyDrawing = false
  private polyTmpPts: Array<fabric.XY> = []
  private polyTmpObjs: Array<fabric.FabricObject> = []

  private static CommonObjectOptions = {
    strokeWidth: 1,
    strokeUniform: true,
    objectCaching: false,
    cornerSize: 10,
    hasBorders: true,
    borderScaleFactor: 1.5
  } as fabric.FabricObjectProps

  init(canvas: HTMLCanvasElement, width: number, height: number) {
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
    this.clear()
  }

  add(object: fabric.FabricObject) {
    this._canvas.add(object)
    this._canvas.setActiveObject(object)
    this._canvas.discardActiveObject()
  }

  updateObjectStatus(object: fabric.FabricObject, status: string, type?: string) {
    let val = object.get(status) == null ? false : object.get(status)
    let params = {}
    params[status] = !val
    object.set(params)
    val = object.get(status)
    switch (status) {
      case 'selected':
        this._canvas.setActiveObject(object)
        break
      case 'pin':
        object.set({
          evented: true,
          lockMovementX: val,
          lockMovementY: val,
          lockRotation: val,
          hasRotatingPoint: !val,
        })
        break
      case 'lock':
        object.set({ evented: val })
        break
      case 'visible':
        object.set({ visible: val })
        break
      case 'delete':
        let objs = this._canvas.getObjects()
        let idx = objs.findIndex(it => it.get('uuid') == object.get('uuid'))
        this._canvas.remove(objs[idx])
        this._objNum.value++
        break
    }
    this._canvas.requestRenderAll()
  }

  showGrid(visible: boolean) {
    this.gridGroup.set({ visible })
    this._canvas.requestRenderAll()
  }

  getObjects(type: DrawType) { return this._canvas.getObjects(type as string) }

  clear() {
    // [DrawType.circle, DrawType.rect, DrawType.polygon, DrawType.multiLine, DrawType.line].forEach(it => {
    //   let objects = this._canvas.getObjects(it)
    //   this._canvas.remove(...objects)
    // })
    let objects = this._canvas.getObjects()
    this._canvas.remove(...objects)
    this._canvas.remove(this.labelText)

    this.addGrid()
    this._canvas.add(this.labelText)
    this._canvas.requestRenderAll()
  }


  requestRenderAll() {
    this._canvas.requestRenderAll()
  }

  changeDrawType(type: DrawType) {
    // this._canvas.requestRenderAll()
    let objects = this._canvas.getObjects()
    objects.forEach(obj => {
      obj.set({ evented: type == DrawType.select, selectable: type == DrawType.select, })
    })

    if (type == DrawType.select || this._drawType != type) {
      this.drawingObj = null
      this.onDrawing = false
      this._canvas.remove(...this.polyTmpObjs)
      this._canvas.remove(this.drawingObj)
      this.polyTmpObjs = []
      this.polyTmpPts = []
      this.drawingObj = null
    }

    this._drawType = type
    this._canvas.defaultCursor = type == DrawType.select ? 'default' : 'crosshair'

    this.labelText.set({ evented: false, selectable: false, })
    this.gridGroup.set({ evented: false, selectable: false, })
    // this._canvas.discardActiveObject()
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
      this._activeObj.value = e.selected?.[0].get('uuid') || null

      this.updateLabelText()
    })

    this._canvas.on('selection:updated', e => {
      this._activeObj.value = e.selected?.[0].get('uuid') || null

      this._canvas.bringObjectToFront(e.selected?.[0])
      this.updateLabelText()
    })

    this._canvas.on('selection:cleared', e => {
      this._canvas.discardActiveObject()
      this.labelText.visible = false
      this._activeObj.value = null
    })
  }

  private updateLabelText() {
    let obj = this._canvas.getObjects().filter(it => it.get('uuid') == this._activeObj.value)[0]
    this.labelText.set('text', `${obj?.get('label')} ${obj?.get('score')}% \n${obj?.get('uuid')?.substr(0, 8)}`)
    this.labelText.left = Math.round(obj?.left + obj?.width * obj?.scaleX + 10)

    if (this.labelText.left > this._canvas.width - this.labelText.width) {
      this.labelText.left = Math.round(this.labelText.left - 20 - this.labelText.width)
    }

    this.labelText.top = Math.round(obj?.top)
    this.labelText.visible = true

    this._canvas.bringObjectToFront(this.labelText)
  }

  private onMouseDblClick(options: fabric.TPointerEventInfo<fabric.TPointerEvent>) {

    if (this._drawType == DrawType.multiLine || this._drawType == DrawType.polygon) {
      if (this.polyTmpPts.length < 3) {
        showNotify({ type: 'danger', message: '至少绘制3个点', duration: 1000 })
        return
      }

      if (this._label.value == null) {
        showToast({ message: '请先选择类别', duration: 500 })
        return
      }

      this.drawingObj = this.genPoly(this.polyTmpPts, this._drawType)
      this.drawingObj.set(AnnotationManager.genLabelOption(this._label.value))
      this.drawingObj.set({ score: '100.0', uuid: uuidv4() })
      this.drawingObj.set({ evented: false, selectable: false })
      if (this._drawType == DrawType.multiLine) this.drawingObj.set({ fill: 'transparent' })
      this._canvas.add(this.drawingObj)
      this._canvas.remove(...this.polyTmpObjs)
      this._objNum.value++
      // this._markerGroup.get(this._drawType).push(this.drawingObject)
      this.polyTmpPts = []
      this.polyTmpObjs = []
      this.onPolyDrawing = false
      this.drawingObj = null
      this.mouseFrom.x = 0
      this.mouseFrom.y = 0
      this.onDrawing = false
    }
  }

  private onMouseDown(options: fabric.TPointerEventInfo<fabric.TPointerEvent>) {
    const pointer = this._canvas.getScenePoint(options.e)
    const vp = this._canvas.getViewportPoint(options.e)
    this._lstPos.x = vp.x
    this._lstPos.y = vp.y
    this._isDragging = this._activeObj.value == null && this._drawType == DrawType.select

    if (this._drawType == DrawType.select || this._isDragging) return

    this.mouseFrom.x = pointer.x
    this.mouseFrom.y = pointer.y
    this.onDrawing = true

    if (this._label.value == null) {
      showToast({ message: '请先选择类别', duration: 500 })
      return
    }

    if (this._drawType == DrawType.multiLine || this._drawType == DrawType.polygon) {
      this.onPolyDrawing = true

      let circle = this.genCircle(pointer.x - 6, pointer.y - 6, 12)
      circle.set(AnnotationManager.genLabelOption({ id: -1, name: 'tmp', color: '#bdc3c7' }))
      circle.set({ strokeWidth: 1, selectable: false, evented: false })
      if (this.polyTmpPts.length == 0) circle.set({ fill: '#f39c12', strokeWidth: 2 })
      this._canvas.add(circle)
      this.polyTmpObjs.push(circle)

      this.drawingObj = this.genLine(pointer.x, pointer.y, pointer.x, pointer.y)
      this.drawingObj.set(AnnotationManager.genLabelOption({ id: -1, name: 'tmp', color: '#bdc3c7' }))
      this.drawingObj.set({ strokeWidth: 2, selectable: false, evented: false })
      this._canvas.add(this.drawingObj)
      this.polyTmpObjs.push(this.drawingObj)
      this.polyTmpPts.push({ x: pointer.x, y: pointer.y })

      return
    }

    this._canvas.discardActiveObject()
    this._canvas.requestRenderAll()

    switch (this._drawType) {
      case DrawType.rect:
        this.drawingObj = this.genRect(pointer.x, pointer.y, 0, 0)
        break
      case DrawType.circle:
        this.onDrawing = true
        this.drawingObj = this.genCircle(pointer.x, pointer.y, 0)
        break
      case DrawType.line:
        this.onDrawing = true
        this.drawingObj = this.genLine(pointer.x, pointer.y, pointer.x, pointer.y)
        break
    }

    this.drawingObj.set(AnnotationManager.genLabelOption(this._label.value))
    this.drawingObj.set({ score: '100.0', uuid: uuidv4() })
    this.drawingObj.set({ evented: false, selectable: false })
    this._canvas.add(this.drawingObj)
    this._canvas.bringObjectToFront(this.drawingObj)
    this._canvas.requestRenderAll()
  }

  private onMouseMove(options: fabric.TPointerEventInfo<fabric.TPointerEvent>) {
    const pointer = this._canvas.getScenePoint(options.e)
    const vp = this._canvas.getViewportPoint(options.e)
    if (this._isDragging && this._drawType == DrawType.select) {
      let vpt = this._canvas.viewportTransform
      vpt[4] += vp.x - this._lstPos.x
      vpt[5] += vp.y - this._lstPos.y
      this._canvas.requestRenderAll()
      this._lstPos.x = vp.x
      this._lstPos.y = vp.y
    }

    if (!this.onDrawing || this._drawType == DrawType.select || this._isDragging) return
    switch (this._drawType) {
      case DrawType.rect:
        const width = pointer.x - this.mouseFrom.x
        const height = pointer.y - this.mouseFrom.y
        this.drawingObj.set({
          left: width > 0 ? this.mouseFrom.x : pointer.x,
          top: height > 0 ? this.mouseFrom.y : pointer.y,
          width: Math.abs(width),
          height: Math.abs(height),
        })
        this._canvas.requestRenderAll()
        break
      case DrawType.circle:
        this.drawingObj.set({
          radius: Math.abs(Math.min(pointer.x - this.mouseFrom.x, pointer.y - this.mouseFrom.y)) / 2,
        })
        this._canvas.requestRenderAll()
        break
      case DrawType.line:
        this.drawingObj.set({
          x2: pointer.x,
          y2: pointer.y,
        })
        this._canvas.requestRenderAll()
        break
      case DrawType.polygon:
      case DrawType.multiLine:
        if (this.onPolyDrawing) {
          this.drawingObj.set({ x2: pointer.x, y2: pointer.y })
          this._canvas.requestRenderAll()
        }
        break
    }

  }

  private onMouseUp(options: fabric.TPointerEventInfo<fabric.TPointerEvent>) {
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
        if (this.drawingObj.width < 20 || this.drawingObj.height < 20) {
          this._canvas.remove(this.drawingObj)
          showToast({ message: 'The object is too small', duration: 500 })
        } else {
          this._canvas.setActiveObject(this.drawingObj)
          this._canvas.discardActiveObject()
          this.drawingObj = null
          this.mouseFrom.x = 0
          this.mouseFrom.y = 0
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

  genRect(left: number, top: number, width: number, height: number) {

    const rect = new fabric.Rect(AnnotationManager.CommonObjectOptions)
    rect.set({ left, top, width, height, })

    rect.on('mouseover', (e) => {
      if (this._drawType != DrawType.select) return
      this._canvas.setActiveObject(rect)
      this._canvas.requestRenderAll()
    })

    return rect
  }

  genCircle(left: number, top: number, radius: number) {

    const circle = new fabric.Circle(AnnotationManager.CommonObjectOptions)
    circle.set({ left, top, radius })
    //: Math.min(x2 - x1, y2 - y1) / 2,

    circle.on('mouseover', () => {
      if (this._drawType != DrawType.select) return
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
      if (this._drawType != DrawType.select) return
      this._canvas.setActiveObject(poly)
      this._canvas.renderAll()
    })

    return poly
  }

  addGrid() {
    if (!this._canvas) return

    const gridSize = 20
    const gridColor = 'rgba(200, 200, 200, 0.7)'

    this.gridGroup = new fabric.Group([], { visible: false, selectable: false, evented: false, })
    for (let x = 0.5; x <= this._canvas.width; x += gridSize) {
      const line = new fabric.Line([x, 0, x, this._canvas.height], {
        stroke: gridColor,
        strokeWidth: 0.5,
        selectable: false,
        evented: false,
      })
      this.gridGroup.add(line)
    }

    for (let y = 0.5; y <= this._canvas.height; y += gridSize) {
      const line = new fabric.Line([0, y, this._canvas.width, y], {
        stroke: gridColor,
        strokeWidth: 0.5,
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
    let poly = this.genPoly(points, DrawType.polygon)
    poly.set(AnnotationManager.genLabelOption({ id: 0, name: 'person', color: '#e74c3c' }))
    poly.set('score', '90.4')
    poly.set('uuid', uuidv4())
    this.add(poly)

    let rect = this.genRect(120, 200, 100, 80)
    rect.set(AnnotationManager.genLabelOption({ id: 0, name: 'bus', color: '#EAB543' }))
    rect.set('score', '90.4')
    rect.set('uuid', uuidv4())
    this.add(rect)

    rect = this.genRect(240, 250, 80, 90)
    rect.set(AnnotationManager.genLabelOption({ id: 0, name: 'bus', color: '#EAB543' }))
    rect.set('score', '90.4')
    rect.set('uuid', uuidv4())
    this.add(rect)

    this._canvas.requestRenderAll()
  }

  static genLabelOption(label: CVLabel) {
    return {
      label: label?.name,
      stroke: label?.color,
      fill: MarkColors.hexToRgba(label?.color, 0.2),
      cornerColor: MarkColors.reverseColor(label?.color, 1),
      // cornerStrokeColor: MarkColors.reverseColor(label.color, 0.8),
      borderColor: MarkColors.reverseColor(label?.color),
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