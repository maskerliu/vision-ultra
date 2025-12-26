import * as fabric from 'fabric'
import { v4 as uuidv4 } from 'uuid'
import { showNotify } from 'vant'
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
  Select = 'Select',
  Rect = 'Rect',
  Circle = 'Circle',
  Polygon = 'Polygon',
  Line = 'Line',
  MultiLine = 'Polyline',
}


export class AnnotationPanel {
  private _canvas: fabric.Canvas
  private _drawType: DrawType = DrawType.Select
  private _label: CVLabel
  set label(label: CVLabel) {
    this._label = label
  }

  private _markerGroup: Map<DrawType, Array<fabric.FabricObject>>
  set markerGroup(markerGroup: Map<DrawType, Array<fabric.FabricObject>>) {
    this._markerGroup = markerGroup
  }

  private _activeObjects: fabric.FabricObject[] = []
  set activeObjects(data: fabric.FabricObject[]) {
    this._activeObjects = data
  }
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
      selection: false
    })

    this.labelText = new fabric.FabricText(`-- 0.0%`, {
      fontSize: 12,
      fontFamily: 'sans-serif',
      stroke: '#ecf0f1',
      shadow: new fabric.Shadow({
        color: 'rgb(0,0,0)',
        blur: 2,
        offsetX: 4,
        offsetY: 4,
        affectStroke: true,
        includeDefaultValues: true,
        nonScaling: false
      }),
      lineHeight: 1.2,
      strokeWidth: 1,
      selectable: false,
      visible: false
    })
    this._canvas.add(this.labelText)

    this.addGrid()
    this.registeCanvasEvent()
  }

  resize(width: number, height: number) {
    this._canvas.setDimensions({ width, height })
    this.clear()
  }

  add(object: fabric.FabricObject) {
    this._canvas.add(object)
  }

  showGrid(visible: boolean) {
    this.gridGroup.set({ visible })
    this._canvas.requestRenderAll()
  }

  getObjects(type: DrawType) {
    return this._canvas.getObjects(type as string)
  }

  clear() {
    for (let key of this._markerGroup.keys()) {
      this._markerGroup.set(key, [])
    }
    this._canvas.clear()
    this.addGrid()
    this._canvas.requestRenderAll()
  }

  requestRenderAll() {
    this._canvas.requestRenderAll()
  }

  changeDrawType(type: DrawType) {
    this._drawType = type
    this._canvas.defaultCursor = type == DrawType.Select ? 'default' : 'crosshair'
    if (type == DrawType.Select) {
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

  private registeCanvasEvent() {

    this._canvas.on('mouse:move', e => this.onMouseMove(e))
    this._canvas.on('mouse:down', e => this.onMouseDown(e))
    this._canvas.on('mouse:up', e => this.onMouseUp(e))
    this._canvas.on('mouse:dblclick', e => this.onMouseDblClick(e))


    this._canvas.on('object:moving', e => {
      this.updateLabelText()
    })

    this._canvas.on('object:scaling', e => {
      this.updateLabelText()
    })

    this._canvas.on('selection:created', e => {
      this._activeObjects[0] = e.selected?.[0] || null

      this.updateLabelText()
    })

    this._canvas.on('selection:updated', e => {
      this._activeObjects[0] = e.selected?.[0] || null

      this._canvas.bringObjectToFront(this._activeObjects[0])
      this.updateLabelText()
    })

    this._canvas.on('selection:cleared', e => {
      this._canvas.discardActiveObject()
      this.labelText.visible = false
      this._activeObjects[0] = null
    })
  }

  private updateLabelText() {
    this.labelText.set('text', `${this._activeObjects[0]?.get('label')} ${this._activeObjects[0]?.get('score')}% \n${this._activeObjects[0]?.get('uuid')}`)
    this.labelText.left = this._activeObjects[0].left + this._activeObjects[0].width * this._activeObjects[0].scaleX + 10
    this.labelText.top = this._activeObjects[0].top
    this.labelText.visible = true

    this._canvas.bringObjectToFront(this.labelText)
  }

  private onMouseDblClick(e: fabric.TPointerEventInfo<fabric.TPointerEvent>) {

    if (this._drawType == DrawType.MultiLine || this._drawType == DrawType.Polygon) {
      if (this.polyTmpPoints.length < 3) {
        showNotify({ type: 'danger', message: '至少绘制3个点', duration: 1000 })
        return
      }

      this.drawingObject = this.genPoly(this.polyTmpPoints, this._drawType)
      this.drawingObject.set(AnnotationPanel.genLabelOption(this._label))
      this.drawingObject.set({ score: '100.0', uuid: uuidv4() })
      this.drawingObject.set({ evented: false, selectable: false })
      if (this._drawType == DrawType.MultiLine) this.drawingObject.set({ fill: 'transparent' })
      this._canvas.add(this.drawingObject)
      this._canvas.remove(...this.polyTmpObjects)

      this._markerGroup.get(this._drawType).push(this.drawingObject)
      this.polyTmpPoints = []
      this.polyTmpObjects = []
      this.onPolyDrawing = false
      this.drawingObject = null
      this.mouseFrom = null
      this.onDrawing = false
    }
  }

  private onMouseDown(e: fabric.TPointerEventInfo<fabric.TPointerEvent>) {
    if (this._drawType == DrawType.Select) return

    const pointer = this._canvas.getViewportPoint(e.e)
    this.mouseFrom = pointer
    this.onDrawing = true

    if (this._drawType == DrawType.MultiLine || this._drawType == DrawType.Polygon) {
      this.onPolyDrawing = true

      let circle = this.genCircle(pointer.x - 6, pointer.y - 6, pointer.x + 6, pointer.y + 6)
      circle.set(AnnotationPanel.genLabelOption({ id: -1, name: 'tmp', color: '#bdc3c7' }))
      circle.set({ strokeWidth: 1, selectable: false, evented: false })
      if (this.polyTmpPoints.length == 0) circle.set({ fill: '#f39c12', strokeWidth: 2 })
      this._canvas.add(circle)
      this.polyTmpObjects.push(circle)

      this.drawingObject = this.genLine(pointer.x, pointer.y, pointer.x, pointer.y)
      this.drawingObject.set(AnnotationPanel.genLabelOption({ id: -1, name: 'tmp', color: '#bdc3c7' }))
      this.drawingObject.set({ strokeWidth: 2, selectable: false, evented: false })
      this._canvas.add(this.drawingObject)
      this.polyTmpObjects.push(this.drawingObject)
      this.polyTmpPoints.push({ x: pointer.x, y: pointer.y })

      return
    }

    switch (this._drawType) {
      case DrawType.Rect:
        this.drawingObject = this.genRect(pointer.x, pointer.y, pointer.x, pointer.y)
        break
      case DrawType.Circle:
        this.onDrawing = true
        this.drawingObject = this.genCircle(pointer.x, pointer.y, pointer.x, pointer.y)
        break
      case DrawType.Line:
        this.onDrawing = true
        this.drawingObject = this.genLine(pointer.x, pointer.y, pointer.x, pointer.y)
        break
    }

    this.drawingObject.set(AnnotationPanel.genLabelOption(this._label))
    this.drawingObject.set({ score: '100.0', uuid: uuidv4() })
    this.drawingObject.set({ evented: false, selectable: false })
    this._canvas.add(this.drawingObject)
    this._canvas.bringObjectToFront(this.drawingObject)
    this._canvas.requestRenderAll()
  }

  private onMouseMove(e: fabric.TPointerEventInfo<fabric.TPointerEvent>) {
    if (!this.onDrawing || this._drawType == DrawType.Select) return
    const pointer = this._canvas.getViewportPoint(e.e)
    switch (this._drawType) {
      case DrawType.Rect:
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
      case DrawType.Circle:
        this.drawingObject.set({
          radius: Math.abs(Math.min(pointer.x - this.mouseFrom.x, pointer.y - this.mouseFrom.y)) / 2,
        })
        this._canvas.requestRenderAll()
        break
      case DrawType.Line:
        this.drawingObject.set({
          x2: pointer.x,
          y2: pointer.y,
        })
        this._canvas.requestRenderAll()
        break
      case DrawType.Polygon:
      case DrawType.MultiLine:
        if (this.onPolyDrawing) {
          this.drawingObject.set({ x2: pointer.x, y2: pointer.y })
          this._canvas.requestRenderAll()
        }
        break
    }

  }

  private onMouseUp(e: fabric.TPointerEventInfo<fabric.TPointerEvent>) {

    if (!this.onDrawing || this._drawType == DrawType.Select) return

    switch (this._drawType) {
      case DrawType.Rect:
      case DrawType.Circle:
      case DrawType.Line:
        if (this.drawingObject.width < 10 || this.drawingObject.height < 10) {
          this._canvas.remove(this.drawingObject)
          showNotify({ message: 'The object is too small', type: 'danger', duration: 500 })
        } else {
          this._markerGroup.get(this._drawType).push(this.drawingObject)
          this._canvas.add(this.drawingObject)
          this._canvas.setActiveObject(this.drawingObject)

          this.drawingObject = null
          this.mouseFrom = null
          this.onDrawing = false
          this._canvas.requestRenderAll()
        }
        break
    }
  }


  genRect(x1: number, y1: number, x2: number, y2: number) {

    const rect = new fabric.Rect(AnnotationPanel.CommonObjectOptions)
    rect.set({
      left: x1,
      top: y1,
      width: x2 - x1,
      height: y2 - y1,
    })

    rect.on('mouseover', (e) => {
      this._canvas.setActiveObject(rect)
      this._canvas.requestRenderAll()
    })

    return rect
  }

  genCircle(x1: number, y1: number, x2: number, y2: number) {

    const circle = new fabric.Circle(AnnotationPanel.CommonObjectOptions)
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
    const line = new fabric.Line([x1, y1, x2, y2], AnnotationPanel.CommonObjectOptions)
    return line
  }

  genPoly(points: fabric.XY[], type: DrawType) {
    let poly: fabric.Polygon | fabric.Polyline
    if (type == DrawType.Polygon)
      poly = new fabric.Polygon(points, AnnotationPanel.genCommonOption())
    if (type == DrawType.MultiLine)
      poly = new fabric.Polyline(points, AnnotationPanel.genCommonOption())

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
    const gridColor = 'rgba(200, 200, 200, 0.5)'

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
    rect.set(AnnotationPanel.genLabelOption({ id: 0, name: 'bus', color: '#EAB543' }))
    rect.set('score', '90.4')
    rect.set('uuid', uuidv4())
    this._canvas.add(rect)

    rect = this.genRect(240, 250, 320, 380)
    rect.set(AnnotationPanel.genLabelOption({ id: 0, name: 'person', color: '#EAB543' }))
    rect.set('score', '90.4')
    rect.set('uuid', uuidv4())
    this._canvas.add(rect)

    rect = this.genRect(240, 250, 320, 380)
    rect.set(AnnotationPanel.genLabelOption({ id: 0, name: 'bus', color: '#EAB543' }))
    rect.set('score', '90.4')
    rect.set('uuid', uuidv4())
    this._canvas.add(rect)

    let poly = this.genPoly(points, DrawType.Polygon)
    poly.set(AnnotationPanel.genLabelOption({ id: 0, name: 'person', color: '#e74c3c' }))
    poly.set('score', '90.4')
    poly.set('uuid', uuidv4())
    this._canvas.add(poly)

    poly = this.genPoly(points, DrawType.Polygon)
    poly.set(AnnotationPanel.genLabelOption({ id: 0, name: 'person', color: '#d35400' }))
    poly.set('score', '90.4')
    poly.set('uuid', uuidv4())
    this._canvas.add(poly)

    let path = new fabric.Path('M 10 10 C 20 20, 40 20, 50 10 C 250,30 300,50 300,100 ', AnnotationPanel.genCommonOption())
    path.set({ fill: 'transparent', stroke: '#e74c3c', })
    path.set({ left: 100, top: 100 })
    this._canvas.add(path)

    let arr = []
    for (let i = 0; i < path.path.length; ++i) {
      switch (path.path[i][0]) {
        case 'M':
          arr.push({ x: path.path[i][1], y: path.path[i][2] })
          break
        case 'C':
          // arr.push({ x: path.path[i][1], y: path.path[i][2] })
          // arr.push({ x: path.path[i][3], y: path.path[i][4] })
          arr.push({ x: path.path[i][5], y: path.path[i][6] })
      }
    }

    let ctrlPoly = this.genPoly(arr, DrawType.MultiLine)
    ctrlPoly.set({ left: 100, top: 100 })
    ctrlPoly.set({ fill: 'transparent', stroke: '#e74c3c', })
    this._canvas.add(ctrlPoly)
    ctrlPoly.setCoords()

    let pathCtrls = ctrlPoly.controls
    for (let key in pathCtrls) {
      pathCtrls[key].mouseUpHandler = (eventData) => {
        // console.log(key, pathCtrls[key].x, pathCtrls[key].y)
      }
    }

    // pathCtrls.keys()((ctrl, key) => {
    //   ctrl.mouseUpHandler = (eventData) => {
    //     console.log(key, ctrl.x, ctrl.y)
    //   }
    // })
    path.set({ editing: true })
    path.on('mousedblclick', () => {
      if (poly.get('editing')) {
        // path.controls = fabric.controlsUtils.createPolyControls(ctrlPoly)
        path.set({ cornerStyle: 'circle', hasBorders: false, editing: false })
      } else {
        path.set({ cornerStyle: 'rect', hasBorders: true, controls: this.defCtrl, editing: true })
      }
      path.setCoords()
      this._canvas.requestRenderAll()
    })
    for (let key of this._markerGroup.keys()) {
      this._markerGroup.set(key, this._canvas.getObjects(key))
    }
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

function createPathControls(path: fabric.Path, options: Partial<fabric.Control> = {}) {
  const controls = {} as Record<string, fabric.Control>

  console.log(path.segmentsInfo)
  for (let i = 0; i < path.segmentsInfo.length; ++i) {
    controls[`p${i}`] = new fabric.Control({
      actionName: 'modifyPath',
      positionHandler: createPathPositionHandler(i),
      actionHandler: createPathActionHandler(i),
      ...options,
    })
  }
  return controls
}

function createPathPositionHandler(idx: number) {
  return function (dim: fabric.Point, finalMatrix: fabric.TMat2D, curveObject: fabric.Path) {
    const { segmentsInfo, pathOffset } = curveObject

    return new fabric.Point(segmentsInfo[idx])
      .subtract(pathOffset)
      .transform(
        fabric.util.multiplyTransformMatrices(
          curveObject.getViewportTransform(),
          curveObject.calcTransformMatrix(),
        ),
      )
  }
}

function createPathActionHandler(idx: number) {
  return fabric.controlsUtils.wrapWithFireEvent(
    'modifyPath',
    fabric.controlsUtils.factoryPolyActionHandler(idx, pathActionHandler),
  )
}

function pathActionHandler(
  eventData: fabric.TPointerEvent,
  transform: fabric.Transform & { pointIndex: number },
  x: number,
  y: number,
) {
  const { target, pointIndex } = transform
  const path = target as fabric.Path
  let point = new fabric.Point(x, y)
  const mouseLocalPosition = point.transform(fabric.util.calcPlaneChangeMatrix(undefined, path.calcOwnMatrix()))

  // path.points[pointIndex] = mouseLocalPosition.add(path.pathOffset)
  path.setDimensions()
  path.set('dirty', true)
  return true
}