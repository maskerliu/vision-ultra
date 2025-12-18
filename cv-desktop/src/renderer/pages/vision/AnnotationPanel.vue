<template>
  <van-row class="marker-layer" justify="center" style="align-items: center;">
    <van-col class="marker-panel" justify="start">
      <van-button square block @click="showMarkers = !showMarkers">
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



      <van-button :plain="activeMarker == idx" square block v-for="(type, idx) in MarkerTypes" :key="idx"
        @click="onMarkerSelected(idx)">
        <van-icon :class="`iconfont icon-mark-${type}`" style="font-size: 1.2rem;" />
      </van-button>
    </van-col>

    <!-- <annotation-canvas :canvas-size="canvasSize"></annotation-canvas> -->
    <canvas ref="annotation-canvas" style="display: block;"></canvas>

    <van-popup :show="showMarkers" position="right" :overlay="false"
      style="height: calc(100vh - 90px); margin-top: 40px; overflow-y: hidden; border-radius: 0 0 10px 0;">
      <van-tabs v-model:active="activeTab" sticky>
        <van-tab title="物体">
          <van-collapse v-model="activeResult" accordion style="width: 15rem; overflow: hidden scroll;">
            <van-collapse-item :name="key" :title="MarkerTypes[key]" v-for="key of groupedMarkers.keys()">
              <van-list style="max-height: calc(100vh - 250px); overflow: hidden scroll;">
                <van-popover v-for="marker in groupedMarkers.get(key)" size="normal" v-model="showLabelPopover"
                  style="box-shadow: outset 0 10px 20px 14px 0 rgba(125, 125, 125, 0.5);" placement="bottom-start">
                  <template #reference>
                    <van-field center v-if="marker != null && labels[marker.label] != null"
                      v-model="labels[marker.label].name" @focus="curMarker = marker">
                      <template #left-icon>
                        <div style="width: 2rem; height: 1rem; border: 2px solid;"
                          :style="{ borderColor: labels[marker.label]?.color }"></div>
                      </template>
                      <template #right-icon>
                        <van-button square plain size="mini" style="margin-left: 10px;">
                          <van-icon class="iconfont icon-eye-close" style="font-size: 1rem;" />
                        </van-button>
                        <van-button square plain type="danger" size="mini" style="margin-left: 10px;">
                          <van-icon class="iconfont icon-delete" style="font-size: 0.8rem;" />
                        </van-button>
                      </template>
                    </van-field>
                  </template>
                  <van-empty description="未找到该标签" v-if="searchLabels == null || searchLabels.length == 0" />
                  <van-list v-else style="min-width: 10rem; height: 100px;">
                    <van-cell :title="label.name" center clickable v-for="label in searchLabels">
                      <template #right-icon>
                        <van-icon v-if="label.id == curMarker.label" name="success" />
                      </template>
                    </van-cell>

                  </van-list>
                </van-popover>
              </van-list>
            </van-collapse-item>
          </van-collapse>
        </van-tab>
        <van-tab title="标签">
          <van-list style="width: 15rem; height: calc(100vh - 174px); overflow-y: scroll;">
            <van-field placeholder="输入标签名" center v-model="label.name" :readonly="labelModel == 1"
              :clickable="labelModel == 1" v-for="(label, idx) in labels" @click="onLabelChanged(idx)">
              <template #left-icon>
                <div class="color-block" :style="{ backgroundColor: label.color }" @click="randomColor(idx)">
                  <van-icon class="iconfont icon-random" style="font-size: 1.2rem; color: white;" />
                </div>
              </template>
              <template #right-icon>
                <van-button square plain type="danger" size="mini" v-if="labelModel == 0">
                  <van-icon class="iconfont icon-delete" style="font-size: 1rem;" />
                </van-button>
                <van-icon name="success" style="font-size: 1rem;" v-if="labelModel == 1 && curLabel == idx" />
              </template>
            </van-field>
          </van-list>

          <van-field placeholder="输入标签名" v-model="labelName" center style="width: 15rem;">
            <template #left-icon>
              <div class="color-block" :style="{ backgroundColor: labelColor }">
                <van-icon class="iconfont icon-random" style="font-size: 1.2rem; color: white;" />
              </div>
            </template>
            <template #right-icon>
              <van-button square plain type="primary" size="mini" @click="onLabelAdd">
                <van-icon class="iconfont icon-add" style="font-size: 1rem;" />
              </van-button>
            </template>
          </van-field>
        </van-tab>
      </van-tabs>
    </van-popup>
  </van-row>

</template>
<script lang="ts" setup>
import * as fabric from 'fabric'
import { v4 as uuidv4 } from 'uuid'
import { onMounted, ref, useTemplateRef, watch } from 'vue'
import { MARK_COLORS, MarkColors, Object_Labels } from '../../common/DrawUtils'

const MarkerTypes = [
  'rect', 'circle', 'polygon', 'line', 'multi-line'
]

const activeTab = ref(0)
const showLabelPopover = ref(false)

const activeMarker = ref(1)
const activeResult = ref(1)
const showLabels = ref(false)
const labelModel = ref(0) // 0: edit 1: select
const searchLabels = ref<Array<any>>([{ id: 0, name: 'person' }, { id: 2, name: 'car' }, { id: 5, name: 'bus' }])

const showMarkers = ref(false)
const labelName = ref('')
const labelColor = ref('#ff0000')
const annotationCanvas = useTemplateRef<HTMLCanvasElement>('annotation-canvas')

const showMagic = ref(false)

const searchText = ref<string>(null)

type CVLabel = {
  id: number,
  name: string,
  color: string,
}

type CVMarker = {
  id: string,
  label: number,
  points: number[], // [x, y]
}

const labels = ref<CVLabel[]>([])

const groupedMarkers = ref<Map<number, CVMarker[]>>(new Map())

const curLabel = ref(-1)
const curMarker = ref<CVMarker>(null)

let fabricCanvas: fabric.Canvas
const selectedObject = ref<fabric.Object | null>(null)
let defCtrl = fabric.controlsUtils.createObjectDefaultControls()

defineExpose({ labels, drawAnnotations })

const {
  canvasSize = [640, 480],
} = defineProps<{
  canvasSize: [number, number],
}>()

// const emit = defineEmits<{
//   resize: [w: number, h: number]
// }>()

watch(() => canvasSize, (val, _) => {
  fabricCanvas.setDimensions({ width: val[0], height: val[1] })
  fabricCanvas.clear()
  addGrid()
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

  fabricCanvas.on('selection:created', (e) => {
    selectedObject.value = e.selected?.[0] || null
  })

  fabricCanvas.on('selection:updated', (e) => {
    selectedObject.value = e.selected?.[0] || null
  })

  fabricCanvas.on('selection:cleared', () => {
    selectedObject.value = null
  })

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

  Object_Labels.forEach((object, idx) => {
    labels.value.push({ id: idx, name: object, color: MARK_COLORS.get(idx) })
  })

  groupedMarkers.value.set(0, [
    { id: uuidv4(), label: 0, points: [0, 0] },
    { id: uuidv4(), label: 1, points: [0, 0] },
    { id: uuidv4(), label: 2, points: [0, 0] },
    { id: uuidv4(), label: 3, points: [0, 0] },
    { id: uuidv4(), label: 2, points: [0, 0] },
    { id: uuidv4(), label: 1, points: [0, 0] },
    { id: uuidv4(), label: 1, points: [0, 0] },
    { id: uuidv4(), label: 0, points: [0, 0] },
    { id: uuidv4(), label: 1, points: [0, 0] },
    { id: uuidv4(), label: 2, points: [0, 0] },
    { id: uuidv4(), label: 3, points: [0, 0] },
    { id: uuidv4(), label: 2, points: [0, 0] },
    { id: uuidv4(), label: 1, points: [0, 0] },
    { id: uuidv4(), label: 1, points: [0, 0] },
    { id: uuidv4(), label: 3, points: [0, 0] },
    { id: uuidv4(), label: 2, points: [0, 0] },
  ])
  groupedMarkers.value.set(1, [
    { id: uuidv4(), label: 0, points: [0, 0] },
    { id: uuidv4(), label: 1, points: [0, 0] },
    { id: uuidv4(), label: 2, points: [0, 0] },
    { id: uuidv4(), label: 3, points: [0, 0] },
    { id: uuidv4(), label: 2, points: [0, 0] },
    { id: uuidv4(), label: 1, points: [0, 0] },
    { id: uuidv4(), label: 5, points: [0, 0] },
  ])
  groupedMarkers.value.set(2, [])
  groupedMarkers.value.set(3, [])
  groupedMarkers.value.set(4, [])
})

function drawAnnotations(boxes: Float16Array, scores: Float16Array, classes: Uint8Array,
  objNum: number, scale: [number, number]) {
  groupedMarkers.value.clear()

  if (objNum == 0) return
  let score = '0.0', x1 = 0, y1 = 0, x2 = 0, y2 = 0, width = 0, height = 0, color = '', klass = ''

  for (let i = 0; i < objNum; ++i) {

    let markers = groupedMarkers.value.get(classes[i])
    markers = markers || []
    markers.push({ id: '', label: classes[i], points: [boxes[i * 4], boxes[i * 4 + 1], boxes[i * 4 + 2], boxes[i * 4 + 3]] })
    score = (scores[i] * 100).toFixed(1)
    // if (scores[i] * 100 < 30) continue

    klass = Object_Labels[classes[i]]
    color = MARK_COLORS.get(classes[i])
    y1 = boxes[i * 4] * scale[1]
    x1 = boxes[i * 4 + 1] * scale[0]
    y2 = boxes[i * 4 + 2] * scale[1]
    x2 = boxes[i * 4 + 3] * scale[0]
    addRect(x1, y1, x2, y2, color)
  }
  fabricCanvas.requestRenderAll()
}

function addRect(x1: number, y1: number, x2: number, y2: number, color: string) {
  const rect = new fabric.Rect({
    left: x1,
    top: y1,
    width: x2 - x1,
    height: y2 - y1,
    fill: MarkColors.hexToRgba(color, 0.2),
    strokeWidth: 2,
    stroke: color,
    objectCaching: false,
    cornerSize: 10,
    cornerColor: MarkColors.hexToRgba(color, 0.6),
    cornerStrokeColor: MarkColors.hexToRgba(color, 0.8),
    hasBorders: false,
    borderColor: color,
    borderScaleFactor: 2
  })
  rect.setCoords()
  rect.on('mouseover', () => {
    rect.set({ hasBorders: true, })
    fabricCanvas.setActiveObject(rect)
    fabricCanvas.requestRenderAll()
  })

  rect.on('mouseout', () => {
    rect.set({ hasBorders: true, })
    // fabricCanvas.discardActiveObject()
    fabricCanvas.requestRenderAll()
  })
  fabricCanvas.add(rect)
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

function onMarkerSelected(idx: number) {
  activeMarker.value = idx
}

function onLabelChanged(idx: number) {
  curLabel.value = -1
  // markers.value[activeResult.value][curMarker.value].label = idx
}

function onLabelAdd() {
  labels.value.push({ id: labels.value.length, name: labelName.value, color: labelColor.value })
  labelName.value = ''
}

function randomColor(idx: number) {
  labels.value[idx].color = '#' + Math.floor(Math.random() * 16777215).toString(16)
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

.marker-panel {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 2.5rem;
  height: 100%;
  border-radius: 0 0 0 8px;
  background-color: #44444488;
}

.result-panel {
  position: relative;
  width: 20rem;
  height: calc(100vh - 90px);
  /* background-color: #44444488; */
  overflow-y: scroll;
  overflow-x: hidden;
}

.color-block {
  width: 1.5rem;
  height: 1.5rem;
  margin-right: 10px;
  border-radius: 5px;
}
</style>