<template>
  <van-row class="marker-layer" justify="center" style="align-items: center;">
    <van-col class="marker-panel" justify="start">
      <van-button square block @click="showLabels = !showLabels; labelModel = 0;">
        <van-icon :class="`iconfont icon-marker`" style="font-size: 1.2rem;" />
      </van-button>
      <van-button square block @click="showMarkers = !showMarkers">
        <van-icon class="iconfont" :class="`icon-expand-${showMarkers ? 'left' : 'right'}`"
          style="font-size: 1.2rem;" />
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
    <v-stage ref="stage" :config="{ width: canvasW, height: canvasH }" @dragstart="handleDragstart"
      @dragend="handleDragend" style="background-color: #5555;">

      <v-layer ref="layer">
        <v-rect :config="{
          x: 20,
          y: 50,
          width: 100,
          height: 100,
          fill: 'red',
          shadowBlur: 10
        }" />
        <v-rect v-for="item in list" :key="item.id" :config="{
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
          rotation: item.rotation,
          id: item.id,
          numPoints: 5,
          innerRadius: 30,
          outerRadius: 50,
          fill: '#89b717',
          opacity: 0.8,
          draggable: true,
          shadowColor: 'black',
          shadowBlur: 10,
          shadowOpacity: 0.6
        }" />
      </v-layer>
    </v-stage>

    <canvas ref="annotation-canvas"></canvas>

    <van-popup v-model:show="showMarkers" position="right" :overlay="false"
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
import Konva from 'konva'
import { onMounted, ref, useTemplateRef, watch } from 'vue'
import { MARK_COLORS, Object_Labels } from '../../common/DrawUtils'

const handleDragstart = (e) => {
  // save drag element:
  dragItemId.value = e.target.id()
  // move current element to the top:
  const item = list.value.find(i => i.id === dragItemId.value)
  const index = list.value.indexOf(item)
  list.value.splice(index, 1)
  list.value.push(item)
}

const handleDragend = () => {
  dragItemId.value = null
}

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
  label: number,
  points: number[], // [x, y]
}

const labels = ref<CVLabel[]>([])

const groupedMarkers = ref<Map<number, CVMarker[]>>(new Map())

const curLabel = ref(-1)
const curMarker = ref<CVMarker>(null)

const fabricCanvas = ref<fabric.Canvas>(null)

defineExpose({ fabricCanvas, labels })

let {
  canvasW = 640,
  canvasH = 480,
} = defineProps<{
  canvasW: number,
  canvasH: number,
}>()

// const emit = defineEmits<{
//   resize: [w: number, h: number]
// }>()

watch(() => canvasW, (val, old) => {
  fabricCanvas.value.setDimensions({ width: val, height: canvasH })
})

watch(() => canvasH, (val, old) => {
  fabricCanvas.value.setDimensions({ width: canvasW, height: val })
})

const list = ref([])
const dragItemId = ref(null)

onMounted(() => {

  for (let n = 0; n < 30; n++) {
    list.value.push({
      id: Math.round(Math.random() * 10000).toString(),
      x: Math.random() * canvasW,
      y: Math.random() * canvasH,
      width: Math.random() * 100,
      height: Math.random() * 200,
      rotation: Math.random() * 180,
      scale: Math.random()
    })
  }

  fabricCanvas.value = new fabric.Canvas(annotationCanvas.value, {
    width: canvasW,
    height: canvasH,
    selection: false,
    backgroundColor: '#55555520'
  })

  fabricCanvas.value.viewportTransform = [1, 0, 0, 1, 0, 50]
  const rect = new fabric.Rect({
    left: 100,
    top: 0,
    width: 100,
    height: 200,
    scaleX: 1,
    scaleY: 1,
    fill: 'green',
    strokeWidth: 2,
    stroke: 'white',
    objectCaching: false,
    ornerStyle: 'round',
    cornerStrokeColor: 'blue',
    cornerColor: 'lightblue',
    cornerStyle: 'circle',
    transparentCorners: false,
    cornerDashArray: [2, 2],
    borderColor: 'orange',
    borderDashArray: [3, 1, 3],
    borderScaleFactor: 2,
  })

  rect.on('mouseover', () => {
    rect.set({ strokeWidth: 0, editing: true })
    fabricCanvas.value.setActiveObject(rect)
    fabricCanvas.value.renderAll()
  })
  rect.on('mousedblclick', () => {
    rect.controls = rect.controls == null ? fabric.InteractiveFabricObject.ownDefaults.controls : null
  })
  rect.on('mouseout', () => {
    rect.set({ strokeWidth: 1.5, editing: false })
    fabricCanvas.value.discardActiveObject()
    fabricCanvas.value.renderAll()
  })

  fabricCanvas.value.add(rect)



  // fabric.InteractiveFabricObject.createControls = () => {
  //   return {}
  // }
  const controls = fabric.controlsUtils.createObjectDefaultControls()
  const resizeCtrl = fabric.controlsUtils.createResizeControls()

  fabric.InteractiveFabricObject.ownDefaults.controls = {
    ...controls,
    ...resizeCtrl,
    mySpecialControl: new fabric.Control({
      x: -0.5,
      y: 0.25,
    }),
  }

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
  const poly = new fabric.Polygon(points, {
    left: 200,
    top: 50,
    fill: '#EAB54355',
    strokeWidth: 1,
    stroke: 'white',
    scaleX: 1,
    scaleY: 1,
    objectCaching: false,
    transparentCorners: false,
    cornerColor: '#EAB543',
    cornerSize: 8,
    cornerStrokeColor: '#EAB543',
  })
  fabricCanvas.value.viewportTransform = [0.7, 0, 0, 0.7, -50, 50]
  fabricCanvas.value.add(poly)

  let editing = false
  poly.on('mousedblclick', () => {
    editing = !editing
    if (editing) {
      poly.cornerStyle = 'circle'
      poly.cornerStrokeColor = 'white'
      poly.cornerSize = 8
      poly.cornerColor = 'rgba(255,255,255,0.5)'
      poly.hasBorders = true
      poly.controls = fabric.controlsUtils.createPolyControls(poly)
    } else {
      poly.cornerColor = 'blue'
      poly.cornerStyle = 'rect'
      poly.hasBorders = true
      poly.controls = fabric.controlsUtils.createObjectDefaultControls()
    }
    poly.setCoords()
    fabricCanvas.value.requestRenderAll()
  })

  Object_Labels.forEach((object, idx) => {
    labels.value.push({ id: idx, name: object, color: MARK_COLORS.get(idx) })
  })

  groupedMarkers.value.set(0, [
    { label: 0, points: [0, 0] },
    { label: 1, points: [0, 0] },
    { label: 2, points: [0, 0] },
    { label: 3, points: [0, 0] },
    { label: 2, points: [0, 0] },
    { label: 1, points: [0, 0] },
    { label: 1, points: [0, 0] },
    { label: 0, points: [0, 0] },
    { label: 1, points: [0, 0] },
    { label: 2, points: [0, 0] },
    { label: 3, points: [0, 0] },
    { label: 2, points: [0, 0] },
    { label: 1, points: [0, 0] },
    { label: 1, points: [0, 0] },
    { label: 3, points: [0, 0] },
    { label: 2, points: [0, 0] },
  ])
  groupedMarkers.value.set(1, [
    { label: 0, points: [0, 0] },
    { label: 1, points: [0, 0] },
    { label: 2, points: [0, 0] },
    { label: 3, points: [0, 0] },
    { label: 2, points: [0, 0] },
    { label: 1, points: [0, 0] },
    { label: 5, points: [0, 0] },
  ])
  groupedMarkers.value.set(2, [])
  groupedMarkers.value.set(3, [])
  groupedMarkers.value.set(4, [])
})

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