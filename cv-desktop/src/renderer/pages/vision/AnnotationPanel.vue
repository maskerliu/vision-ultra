<template>
  <van-row class="marker-layer" justify="center" style="align-items: center;">
    <van-col class="left-bar" justify="start">
      <van-button square block @click="showRightBar = !showRightBar">
        <van-icon :class="`iconfont icon-marker`" style="font-size: 1.2rem;" />
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

      <van-button square block v-for="(type, idx) in MarkerTypes" :key="idx">
        <van-icon :class="`iconfont icon-mark-${type}`" style="font-size: 1.2rem;" />
      </van-button>
    </van-col>

    <canvas ref="annotationCanvas" style="display: block;"></canvas>
    <annotation-right-panel ref="rightBar" :show="showRightBar" @marker-selected="updateActiveMarker"
      @update-marker="updateMarker" />
  </van-row>

</template>
<script lang="ts" setup>
import * as fabric from 'fabric'
import { v4 as uuidv4 } from 'uuid'
import { onMounted, ref, useTemplateRef, watch } from 'vue'
import { MarkerTypes } from '../../common/Annotations'
import { MARK_COLORS, MarkColors, Object_Labels } from '../../common/DrawUtils'
import AnnotationRightPanel from './AnnotationRightPanel.vue'
import TestPanel from './TestPanel.vue'

const showRightBar = ref(true)
const rightBar = useTemplateRef<typeof AnnotationRightPanel>('rightBar')
const testPanel = ref('test-panel')
const annotationCanvas = useTemplateRef<HTMLCanvasElement>('annotationCanvas')
const showMagic = ref(false)

let fabricCanvas: fabric.Canvas
let selectedObject: fabric.Object
let defCtrl = fabric.controlsUtils.createObjectDefaultControls()
let labelText: fabric.FabricText

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

function updateActiveMarker(shape: fabric.Object) {
  fabricCanvas.setActiveObject(shape)
}

function updateMarker(shape: fabric.Object) {
  fabricCanvas.requestRenderAll()
}

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

  addRect(0, 0, 100, 100, '#EAB543')
  addPoly(points, '#EAB543')

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
})

function updateLabelText() {
  labelText.set('text', `${selectedObject?.get('label')} ${selectedObject?.get('score')}% \n${selectedObject?.get('uuid')}`)
  labelText.left = selectedObject.left + selectedObject.width * selectedObject.scaleX + 10
  labelText.top = selectedObject.top
  labelText.visible = true

  fabricCanvas.bringObjectToFront(labelText)
}

function registeCanvasEvent() {
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
  rightBar.value?.clearMarkers()
  fabricCanvas.add(labelText)
  if (objNum == 0) return
  let score = '0.0', x1 = 0, y1 = 0, x2 = 0, y2 = 0, width = 0, height = 0, color = '', klass = ''

  for (let i = 0; i < objNum; ++i) {
    score = (scores[i] * 100).toFixed(1)
    // if (scores[i] * 100 < 30) continue

    klass = Object_Labels[classes[i]]
    color = MARK_COLORS.get(classes[i])
    y1 = boxes[i * 4] * scale[1]
    x1 = boxes[i * 4 + 1] * scale[0]
    y2 = boxes[i * 4 + 2] * scale[1]
    x2 = boxes[i * 4 + 3] * scale[0]
    let rect = addRect(x1, y1, x2, y2, color)
    rect.set('label', klass)
    rect.set('score', score)
    rect.set('uuid', uuidv4())
    rect.set('color', color)
  }
  rightBar.value?.addMarkers(0, fabricCanvas.getObjects(fabric.Rect.type))
  fabricCanvas.requestRenderAll()
}

function addRect(x1: number, y1: number, x2: number, y2: number, color: string) {
  const rect = new fabric.Rect({
    left: x1,
    top: y1,
    width: x2 - x1,
    height: y2 - y1,
    fill: MarkColors.hexToRgba(color, 0.2),
    strokeWidth: 1.5,
    stroke: color,
    objectCaching: false,
    cornerSize: 10,
    cornerColor: MarkColors.hexToRgba(color, 0.6),
    cornerStrokeColor: MarkColors.hexToRgba(color, 0.8),
    hasBorders: false,
    borderColor: color,
    borderScaleFactor: 1.5
  })

  rect.on('mouseover', () => {
    rect.set({ hasBorders: true, })
    fabricCanvas.setActiveObject(rect)
    fabricCanvas.requestRenderAll()
  })

  fabricCanvas.add(rect)
  return rect
}

function addPoly(points: fabric.XY[], color: string) {
  const poly = new fabric.Polygon(points,
    {
      fill: MarkColors.hexToRgba(color, 0.2),
      strokeWidth: 1,
      stroke: 'white',
      scaleX: 1,
      scaleY: 1,
      objectCaching: false,
      transparentCorners: false,
      cornerColor: MarkColors.hexToRgba(color, 0.8),
      cornerSize: 8,
      cornerStrokeColor: color,
    })
  fabricCanvas.add(poly)

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
    poly.setCoords()
    fabricCanvas.requestRenderAll()
  })

  poly.on('mouseover', () => {
    poly.set({ strokeWidth: 2.5, cornerStrokeColor: color })
    fabricCanvas.setActiveObject(poly)
    fabricCanvas.renderAll()
  })

}

function addGrid() {
  if (!fabricCanvas) return

  const gridSize = 40
  const gridColor = 'rgba(200, 200, 200, 0.5)'

  // 垂直网格线
  for (let x = 0; x <= canvasSize[0]; x += gridSize) {
    const line = new fabric.Line([x, 0, x, canvasSize[1]], {
      stroke: gridColor,
      strokeWidth: 1,
      selectable: false,
      evented: false,
    })
    fabricCanvas.add(line)
  }

  // 水平网格线
  for (let y = 0; y <= canvasSize[1]; y += gridSize) {
    const line = new fabric.Line([0, y, canvasSize[0], y], {
      stroke: gridColor,
      strokeWidth: 1,
      selectable: false,
      evented: false,
    })
    fabricCanvas.add(line)
  }
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
</style>