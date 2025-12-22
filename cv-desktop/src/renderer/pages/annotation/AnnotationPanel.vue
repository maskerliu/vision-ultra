<template>
  <van-row class="marker-layer" justify="center" style="align-items: center;">
    <van-col class="left-bar" justify="start">
      <van-button square block @click="showRightBar = !showRightBar">
        <van-icon :class="`iconfont icon-marker`" style="font-size: 1.2rem;" />
      </van-button>

      <van-button square block plain :type="curDrawType == idx ? 'primary' : 'default'"
        v-for="(type, idx) in MarkerTypes" :key="idx" @click="onDrawSelect(idx)">
        <van-icon :class="`iconfont icon-mark-${type.toLocaleLowerCase()}`" style="font-size: 1.2rem;" />
      </van-button>

      <van-popover v-model:show="showMagic" placement="right-start">
        <template #reference>
          <van-button square block style="width: 2.5rem;">
            <van-icon class="iconfont icon-mark-magic" style="font-size: 1.2rem;" />
          </van-button>
        </template>
        <van-row style="width: 260px; padding: 5px;">
          <van-field label="label" input-align="right">

          </van-field>
          <van-cell center title="covert masks to polygon">
            <template #right-icon>
              <van-switch />
            </template>
          </van-cell>
          <van-cell center title="start with bounding box">
            <template #right-icon>
              <van-switch />
            </template>
          </van-cell>
        </van-row>
      </van-popover>

    </van-col>


    <van-field class="active-label" :value="activeLabel.name" @click="showLabelSearch = true">
      <template #left-icon>
        <div class="color-block" :style="{ backgroundColor: activeLabel.color }" @click="">
          <van-icon class="iconfont icon-random" style="font-size: 1.2rem; color: white;" />
        </div>
      </template>
    </van-field>
    <van-popup class="label-search-panel" size="normal" trigger="manual" :overlay="true" :lazy-render="false"
      v-model:show="showLabelSearch">
      <van-list style="min-width: 14rem; height: 100px;">
        <van-empty :description="$t('anno.noMatch')" v-if="searchLabels == null || searchLabels.length == 0" />
        <van-cell :title="label.name" center clickable v-for="label in searchLabels" @click="showLabelSearch = false">
          <template #right-icon>
            <van-icon v-if="label.id == activeLabel?.id" name="success" />
          </template>
        </van-cell>
      </van-list>
    </van-popup>
    <!-- <test-panel /> -->
    <canvas ref="annotationCanvas" style="display: block;"></canvas>

    <van-popup :show="showRightBar" position="right" :overlay="false" class="right-bar">

      <van-tabs v-model:active="activeTab" sticky>
        <marker-group-tab v-model:marker-group="markerGroup" />
        <label-group-tab ref="labeTab" v-model:active-label="activeLabel" />
      </van-tabs>

      <!-- <right-panel ref="rightBar" v-model:marker-group="markerGroup" @marker-selected="updateActiveMarker"
        @update-marker="updateMarker" /> -->
    </van-popup>

  </van-row>

</template>
<script lang="ts" setup>

import * as fabric from 'fabric'
import { v4 as uuidv4 } from 'uuid'
import { onMounted, ref, useTemplateRef, watch } from 'vue'
import { CVLabel, DrawType, MarkerTypes } from '../../common/Annotations'
import { MarkColors } from '../../common/DrawUtils'
import TestPanel from '../vision/TestPanel.vue'
import { showNotify } from 'vant'
import MarkerGroupTab from './MarkerGroupTab.vue'
import LabelGroupTab from './LabelGroupTab.vue'

const showRightBar = ref(true)
const labeTab = useTemplateRef<typeof LabelGroupTab>('labeTab')
const annotationCanvas = useTemplateRef<HTMLCanvasElement>('annotationCanvas')
const showMagic = ref(false)
const curDrawType = ref(0)
const markerGroup = ref<Map<number, fabric.FabricObject[]>>(new Map())
const activeLabel = ref<CVLabel>({ id: 0, name: 'person', color: '#EAB543' })
const showLabelSearch = ref(false)
const searchLabels = ref([])

const activeTab = ref(0)
// const searchLabels = ref<Array<any>>([
//   { id: 0, name: 'person' },
//   { id: 2, name: 'car' },
//   { id: 5, name: 'bus' }
// ])

let fabricCanvas: fabric.Canvas
let gridGroup: fabric.Group
let selectedObject: fabric.Object
let defCtrl = fabric.controlsUtils.createObjectDefaultControls()
let labelText: fabric.FabricText

let mouseFrom: { x: number, y: number } = { x: 0, y: 0 }
let mouseTo: { x: number, y: number } = { x: 0, y: 0 }
let onDrawing = false

let drawingObject: fabric.Object | null = null
let pointArr: Array<fabric.XY> = []
let polyClosed: boolean = false
let tmpPolyObjects: Array<fabric.FabricObject> = []

const {
  canvasSize = [640, 480],
} = defineProps<{
  canvasSize: [number, number],
}>()

defineExpose({ drawAnnotations })

watch(() => canvasSize, (val, _) => {
  fabricCanvas.setDimensions({ width: val[0], height: val[1] })
  fabricCanvas.clear()
  // addGrid()
  fabricCanvas.requestRenderAll()
})

onMounted(() => {

  fabricCanvas = new fabric.Canvas(annotationCanvas.value!, {
    width: canvasSize[0],
    height: canvasSize[1],
    backgroundColor: '#55555520',
    selection: true,
    interactive: true
  })

  addGrid()

  registeCanvasEvent()

  markerGroup.value.set(1, [])
  markerGroup.value.set(2, [])
  markerGroup.value.set(3, [])
  markerGroup.value.set(4, [])

  const points = [

    {
      x: 3,
      y: 4,
    },
    {
      x: 16,
      y: 3,
    },
    {
      x: 30,
      y: 5,
    },
    {
      x: 25,
      y: 55,
    },
    {
      x: 19,
      y: 44,
    },
    {
      x: 15,
      y: 30,
    },
    {
      x: 15,
      y: 55,
    },
    {
      x: 9,
      y: 55,
    },
    {
      x: 6,
      y: 53,
    },
    {
      x: -2,
      y: 55,
    },
    {
      x: -4,
      y: 40,
    },
    {
      x: 0,
      y: 20,
    },
  ]

  let rect = genRect(120, 200, 220, 280, '#EAB543')
  rect.set('label', 'person')
  rect.set('score', '90.4')
  rect.set('uuid', uuidv4())
  rect.set('color', '#EAB543')
  fabricCanvas.add(rect)

  rect = genRect(240, 250, 320, 380, '#EAB543')
  rect.set('label', 'person')
  rect.set('score', '90.4')
  rect.set('uuid', uuidv4())
  rect.set('color', '#EAB543')
  fabricCanvas.add(rect)

  rect = genRect(240, 250, 320, 380, '#EAB543')
  rect.set('label', 'bus')
  rect.set('score', '90.4')
  rect.set('uuid', uuidv4())
  rect.set('color', '#EAB543')
  fabricCanvas.add(rect)

  let poly = genPoly(points, '#e74c3c')
  poly.set('label', 'person')
  poly.set('score', '90.4')
  poly.set('uuid', uuidv4())
  poly.set('color', '#EAB543')
  fabricCanvas.add(poly)

  poly = genPoly(points, '#d35400')
  poly.set('label', 'person')
  poly.set('score', '90.4')
  poly.set('uuid', uuidv4())
  poly.set('color', '#EAB543')
  fabricCanvas.add(poly)

  labelText = new fabric.FabricText(`person 90.4%`, {
    fontSize: 12,
    fontFamily: 'Comic Sans',
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
  fabricCanvas.add(labelText)

  syncObject2RightBar()
})

function onDrawSelect(type: number) {
  curDrawType.value = type
  fabricCanvas.defaultCursor = type == DrawType.Select ? 'default' : 'crosshair'
  if (type == DrawType.Select) {
    drawingObject = null
    onDrawing = false
    fabricCanvas.remove(...tmpPolyObjects)
    fabricCanvas.remove(drawingObject)
    drawingObject = null
    fabricCanvas.getObjects().forEach((obj) => {
      obj.set({ selectable: true })
    })
    gridGroup.set({ selectable: false, evented: false, })
    fabricCanvas.requestRenderAll()
  }

  fabricCanvas.discardActiveObject()
  fabricCanvas.getObjects().forEach((obj) => {
    obj.set({ evented: type == DrawType.Select })
  })
  fabricCanvas.requestRenderAll()
}

function updateActiveMarker(shape: fabric.Object) {
  if (!shape.visible) return
  fabricCanvas.setActiveObject(shape)
  fabricCanvas.requestRenderAll()
}

function pinObject(shape: fabric.Object, pined: boolean) {
  shape.set({
    evented: true,
    lockMovementX: pined,
    lockMovementY: pined,
    lockRotation: pined,
    hasRotatingPoint: !pined,
  })
}

function updateMarker(obj: fabric.Object, status: string) {

  let val = obj.get(status) == null ? false : obj.get(status)
  obj.set({ status: !val })
  switch (status) {
    case 'pined':
      pinObject(obj, obj.get(status))
      break
    case 'locked':
      obj.set({ evented: !val })
      break
  }

  if (!obj.visible && obj == fabricCanvas.getActiveObject()) {
    console.log('clear')
    obj.onDeselect()
    fabricCanvas.discardActiveObject()
  }
  fabricCanvas.requestRenderAll()
}

function syncObject2RightBar() {
  for (let i = 1; i < MarkerTypes.length; ++i) {
    markerGroup.value.set(i, fabricCanvas.getObjects(MarkerTypes[i]))
  }
}

function updateLabelText() {
  labelText.set('text', `${selectedObject?.get('label')} ${selectedObject?.get('score')}% \n${selectedObject?.get('uuid')}`)
  labelText.left = selectedObject.left + selectedObject.width * selectedObject.scaleX + 10
  labelText.top = selectedObject.top
  labelText.visible = true

  fabricCanvas.bringObjectToFront(labelText)
}

function registeCanvasEvent() {

  fabricCanvas.on('mouse:move', onMouseMove)
  fabricCanvas.on('mouse:down', onMouseDown)
  fabricCanvas.on('mouse:up', onMouseUp)


  fabricCanvas.on('object:moving', (e) => {
    updateLabelText()
  })

  fabricCanvas.on('object:scaling', (e) => {
    updateLabelText()
  })

  fabricCanvas.on('selection:created', (e) => {
    selectedObject = e.selected?.[0] || null

    updateLabelText()
  })

  fabricCanvas.on('selection:updated', (e) => {
    selectedObject = e.selected?.[0] || null

    fabricCanvas.bringObjectToFront(selectedObject)
    updateLabelText()
  })

  fabricCanvas.on('selection:cleared', () => {
    fabricCanvas.discardActiveObject()
    labelText.visible = false
    selectedObject = null
  })
}

function drawAnnotations(boxes: Float16Array, scores: Float16Array, classes: Uint8Array,
  objNum: number, scale: [number, number]) {
  fabricCanvas.add(labelText)
  if (objNum == 0) return
  let score = '0.0', x1 = 0, y1 = 0, x2 = 0, y2 = 0

  for (let i = 0; i < objNum; ++i) {
    score = (scores[i] * 100).toFixed(1)
    // if (scores[i] * 100 < 30) continue

    let label = labeTab.value.getLabel(classes[i])
    y1 = boxes[i * 4] * scale[1]
    x1 = boxes[i * 4 + 1] * scale[0]
    y2 = boxes[i * 4 + 2] * scale[1]
    x2 = boxes[i * 4 + 3] * scale[0]
    let rect = genRect(x1, y1, x2, y2, label.color)
    rect.set('label', label.name)
    rect.set('score', score)
    rect.set('uuid', uuidv4())
    rect.set('color', label.color)
    markerGroup.value.clear()
    fabricCanvas.add(rect)
  }
  fabricCanvas.requestRenderAll()
  syncObject2RightBar()
}

function genRect(x1: number, y1: number, x2: number, y2: number, color: string) {

  const rect = new fabric.Rect(genCommonOption(color))
  rect.set({
    left: x1,
    top: y1,
    width: x2 - x1,
    height: y2 - y1,
  })

  rect.on('mouseover', () => {
    fabricCanvas.setActiveObject(rect)
    fabricCanvas.requestRenderAll()
  })

  return rect
}

function genCircle(x1: number, y1: number, x2: number, y2: number, color: string) {

  const circle = new fabric.Circle(genCommonOption(color))
  circle.set({
    left: x1,
    top: y1,
    radius: Math.min(x2 - x1, y2 - y1) / 2,
  })

  circle.on('mouseover', () => {
    fabricCanvas.setActiveObject(circle)
    fabricCanvas.requestRenderAll()
  })

  return circle
}

function genLine(x1: number, y1: number, x2: number, y2: number, color: string) {
  const line = new fabric.Line([x1, y1, x2, y2], genCommonOption(color))
  return line
}

function genEllipse(x1: number, y1: number, x2: number, y2: number, color: string) {
  let ellipse = new fabric.Ellipse(genCommonOption(color))
  ellipse.set({
    left: x1,
    top: y1,
    rx: 100,
    ry: 50,
  })

  return ellipse
}

function genPoly(points: fabric.XY[], color: string) {

  const poly = new fabric.Polygon(points, genCommonOption(color))

  let editing = false
  let polyCtrl = fabric.controlsUtils.createPolyControls(poly)
  poly.on('mousedblclick', () => {
    editing = !editing
    if (editing) {
      poly.cornerStyle = 'circle'
      poly.hasBorders = false
      poly.controls = polyCtrl
    } else {
      poly.cornerStyle = 'rect'
      poly.hasBorders = true
      poly.controls = defCtrl
    }
    fabricCanvas.requestRenderAll()
  })

  poly.on('mouseover', () => {
    fabricCanvas.setActiveObject(poly)
    fabricCanvas.renderAll()
  })

  return poly
}

function genCommonOption(color: string) {
  return {
    fill: MarkColors.hexToRgba(color, 0.2),
    strokeWidth: 1,
    strokeUniform: true,
    stroke: color,
    objectCaching: false,
    cornerSize: 10,
    cornerColor: MarkColors.hexToRgba(color, 0.8),
    cornerStrokeColor: MarkColors.hexToRgba(color, 0.8),
    hasBorders: true,
    borderColor: color,
    borderScaleFactor: 1.5
  } as fabric.FabricObjectProps
}

function onMouseDown(e) {
  const pointer = fabricCanvas.getViewportPoint(e.e)
  mouseFrom = pointer
  switch (curDrawType.value) {
    case DrawType.Rect:
      onDrawing = true
      drawingObject = genRect(pointer.x, pointer.y, pointer.x, pointer.y, '#EAB543')
      drawingObject.set('label', 'person')
      drawingObject.set('score', '100.0')
      drawingObject.set('uuid', uuidv4())
      drawingObject.set('color', '#EAB543')
      fabricCanvas.add(drawingObject)
      fabricCanvas.requestRenderAll()
      break
    case DrawType.Circle:
      onDrawing = true
      drawingObject = genCircle(pointer.x, pointer.y, pointer.x, pointer.y, '#27ae60')
      drawingObject.set('label', 'bus')
      drawingObject.set('score', '100.0')
      drawingObject.set('uuid', uuidv4())
      drawingObject.set('color', '#27ae60')
      fabricCanvas.add(drawingObject)
      fabricCanvas.requestRenderAll()
      break
    case DrawType.Polygon:
      if (pointArr.length > 2) {
        let dist = Math.sqrt(Math.pow(pointArr[0].x - pointer.x, 2) + Math.pow(pointArr[0].y - pointer.y, 2))
        if (dist <= 10) {
          polyClosed = true
          let poly = genPoly(pointArr, '#8e44ad')
          poly.set('label', 'dog')
          poly.set('score', '100.0')
          poly.set('uuid', uuidv4())
          poly.set('color', '#8e44ad')
          fabricCanvas.remove(...tmpPolyObjects)
          fabricCanvas.add(poly)
          fabricCanvas.requestRenderAll()
          pointArr = []
          drawingObject = null
          mouseFrom = null
          onDrawing = false
          return
        }
      }

      onDrawing = true
      polyClosed = false
      let circle = genCircle(pointer.x - 6, pointer.y - 6, pointer.x + 6, pointer.y + 6, '#bdc3c7')
      circle.set({ strokeWidth: 1, selectable: false, evented: false })
      if (pointArr.length == 0) {
        circle.set({ fill: '#f39c12', strokeWidth: 2 })
      }
      fabricCanvas.add(circle)
      tmpPolyObjects.push(circle)

      drawingObject = genLine(pointer.x, pointer.y, pointer.x, pointer.y, '#bdc3c7')
      drawingObject.set({ strokeWidth: 2, selectable: false, evented: false })
      fabricCanvas.add(drawingObject)
      tmpPolyObjects.push(drawingObject)
      pointArr.push({ x: pointer.x, y: pointer.y })
      fabricCanvas.requestRenderAll()
      break
    case DrawType.Line:
      onDrawing = true
      drawingObject = genLine(pointer.x, pointer.y, pointer.x, pointer.y, '#d35400')
      fabricCanvas.add(drawingObject)
      fabricCanvas.requestRenderAll()
      break
  }
}

function onMouseMove(e) {
  if (!onDrawing) return
  const pointer = fabricCanvas.getViewportPoint(e.e)
  switch (curDrawType.value) {
    case DrawType.Rect:
      const width = pointer.x - mouseFrom.x
      const height = pointer.y - mouseFrom.y
      drawingObject.set({
        left: width > 0 ? mouseFrom.x : pointer.x,
        top: height > 0 ? mouseFrom.y : pointer.y,
        width: Math.abs(width),
        height: Math.abs(height),
      })
      fabricCanvas.requestRenderAll()
      break
    case DrawType.Circle:
      drawingObject.set({
        radius: Math.abs(Math.min(pointer.x - mouseFrom.x, pointer.y - mouseFrom.y)) / 2,
      })
      fabricCanvas.requestRenderAll()
      break
    case DrawType.Line:
      drawingObject.set({
        x2: pointer.x,
        y2: pointer.y,
      })
      fabricCanvas.requestRenderAll()
      break
    case DrawType.Polygon:
      if (!polyClosed) {
        drawingObject.set({ x2: pointer.x, y2: pointer.y })
        fabricCanvas.requestRenderAll()
      }
      break
  }

}

function onMouseUp(e) {
  if (!onDrawing) return
  switch (curDrawType.value) {
    case DrawType.Rect:
      if (drawingObject.width < 10 || drawingObject.height < 10) {
        fabricCanvas.remove(drawingObject)
        showNotify({ message: 'The object is too small', type: 'danger', duration: 500 })
      }
      drawingObject = null
      mouseFrom = null
      onDrawing = false
      fabricCanvas.requestRenderAll()
      syncObject2RightBar()
      break
    case DrawType.Circle:
      if (drawingObject.width < 10 || drawingObject.height < 10) {
        fabricCanvas.remove(drawingObject)
        showNotify({ message: 'The object is too small', type: 'danger', duration: 500 })
      }
      drawingObject = null
      mouseFrom = null
      onDrawing = false
      fabricCanvas.requestRenderAll()
      syncObject2RightBar()
      break
    case DrawType.Line:
      if (drawingObject.width < 10 || drawingObject.height < 10) {
        fabricCanvas.remove(drawingObject)
        showNotify({ message: 'The object is too small', type: 'danger', duration: 500 })
      }
      drawingObject = null
      mouseFrom = null
      onDrawing = false
      fabricCanvas.requestRenderAll()
      syncObject2RightBar()
      break
  }
}

function addGrid() {
  if (!fabricCanvas) return

  const gridSize = 40
  const gridColor = 'rgba(200, 200, 200, 0.5)'

  gridGroup = new fabric.Group([], { selectable: false, evented: false, })
  // 垂直网格线
  for (let x = 0; x <= canvasSize[0]; x += gridSize) {
    const line = new fabric.Line([x, 0, x, canvasSize[1]], {
      stroke: gridColor,
      strokeWidth: 1,
      selectable: false,
      evented: false,
    })
    gridGroup.add(line)
  }

  // 水平网格线
  for (let y = 0; y <= canvasSize[1]; y += gridSize) {
    const line = new fabric.Line([0, y, canvasSize[0], y], {
      stroke: gridColor,
      strokeWidth: 1,
      selectable: false,
      evented: false,
    })
    gridGroup.add(line)
  }
  fabricCanvas.add(gridGroup)
}

</script>

<style lang="css" scoped>
.marker-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 500;
}

.left-bar {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 2.5rem;
  height: 100%;
  border-radius: 0 0 0 8px;
  background-color: #44444488;
}

.active-label {
  position: absolute;
  top: 5px;
  left: 3rem;
  width: 228px;
  z-index: 500;
}

.label-search-panel {
  position: absolute;
  top: 90px;
  left: 3rem;
  right: auto;
  width: 228px;
}

.right-bar {
  height: calc(100vh - 90px);
  margin-top: 40px;
  overflow-y: hidden;
  border-radius: 0 0 10px 0;
}

.color-block {
  width: 1.5rem;
  height: 1.5rem;
  border: 2px solid;
  margin-right: 10px;
  border-radius: 5px;
}
</style>