<template>
  <van-row class="marker-layer" justify="center" style="align-items: center">
    <van-col class="left-bar" justify="start">
      <van-button square block hairline plain :type="showRightBar ? 'primary' : 'default'"
        @click="showRightBar = !showRightBar">
        <van-icon class-prefix="iconfont" name="marker" />
      </van-button>

      <van-button square block hairline :type="curDrawType == type ? 'primary' : 'default'"
        v-for="(type, idx) in DrawTypes" :key="idx" @click="onDrawSelect(type)">
        <van-icon class-prefix="iconfont" :name="'mark-' + type" />
      </van-button>

      <van-button square block hairline type="default" @click="annoMgr?.resetScaleAndMove()">
        <van-icon class-prefix="iconfont" :name="'mark-fit'" />
      </van-button>

      <van-button square block hairline type="default" @click="updateMarkerGroup">
        <van-icon class-prefix="iconfont" :name="'collect'" />
      </van-button>

      <van-popover v-model:show="showMagic" placement="right-start">
        <template #reference>
          <van-button square block hairline style="width: 2.5rem">
            <van-icon class-prefix="iconfont" name="mark-Magic" />
          </van-button>
        </template>
        <van-row style="width: 220px; padding: 5px">
          <van-cell center :title="$t('anno.cvtMaskContour')">
            <template #right-icon>
              <van-switch v-model="visionStore.genContour" />
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

    <van-field class="active-label" v-model="searchKeyword" :style="{ borderColor: activeLabel?.color }"
      @click="showLabelSearch = true">
    </van-field>

    <van-popup class="label-search-panel" size="normal" trigger="manual" :overlay="true" :lazy-render="false"
      v-model:show="showLabelSearch">
      <van-list style="max-width: 10rem; max-height: 200px; overflow: hidden scroll;">
        <van-empty image-size="80" :description="$t('anno.noMatch')"
          v-if="searchLabels == null || searchLabels.length == 0" />
        <van-cell :title="label.name" center clickable v-for="label in searchLabels" @click="changeLabel(label)">
          <template #right-icon>
            <van-icon class-prefix="iconfont" name="success" v-if="label.id == activeLabel?.id" />
          </template>
        </van-cell>
      </van-list>
    </van-popup>

    <van-field label="points" label-align="right" type="number" label-width="4rem"
      v-if="activeMarker?.type == fabric.Polygon.type"
      style="position: absolute; top: 8px; left:auto; right: auto; width: 15rem; z-index: 2003;">
      <template #input>
        <van-slider bar-height="4px" button-size="1.2rem" min="0" max="3" step="0.1" v-model="polyTolerance">
          <template #button>
            <van-button plain size="small"> {{ polyTolerance }}</van-button>
          </template>
        </van-slider>
      </template>
    </van-field>
    <canvas ref="annotationCanvas" style="display: block"></canvas>

    <van-popup :show="showRightBar" position="right" :overlay="false" class="right-bar">
      <van-tabs v-model:active="activeTab" sticky>
        <marker-group-tab v-model:marker-group="markerGroup" v-model:active-marker="activeMarker"
          :search-labels="markerSearchLabels" @searchLabels="onMarkerLabelSearch" />
        <label-group-tab ref="labeTab" v-model:active-label="activeLabel" />
      </van-tabs>
    </van-popup>
  </van-row>
</template>
<script lang="ts" setup>

import * as fabric from 'fabric'
import { v4 as uuidv4 } from 'uuid'
import { onMounted, provide, ref, useTemplateRef, watch } from 'vue'
import { AnnotationManager, CVLabel, DrawType } from '../../common'
import { VisionStore } from '../../store'
import LabelGroupTab from './LabelGroupTab.vue'
import MarkerGroupTab from './MarkerGroupTab.vue'

const visionStore = VisionStore()
const showRightBar = ref(false)
const activeTab = ref(0)
const labeTab = useTemplateRef<typeof LabelGroupTab>('labeTab')
const annotationCanvas = useTemplateRef<HTMLCanvasElement>('annotationCanvas')
const showMagic = ref(false)
const curDrawType = ref(DrawType.select)
const markerGroup = ref<Map<DrawType, Array<fabric.FabricObject>>>(new Map())
let activeMarker = ref<fabric.FabricObject>(null)
const activeLabel = ref<CVLabel>(null)
const showLabelSearch = ref(false)
const searchKeyword = ref('')
const searchLabels = ref([])
const markerSearchLabels = ref([])
const showPolyTolerance = ref(false)
const polyTolerance = ref(1)
const annoMgr = ref<AnnotationManager>()
const objNum = ref(0)

const DrawTypes: Array<DrawType> = [
  DrawType.select,
  DrawType.rect, DrawType.circle, DrawType.polygon, DrawType.line, DrawType.multiLine
]

const { canvasSize = [640, 360] } = defineProps<{
  canvasSize: [number, number]
}>()


provide('annoMgr', annoMgr)

defineExpose({ resize, drawImage, drawAnnotations, getLabel })

onMounted(() => {

  annoMgr.value = new AnnotationManager(annotationCanvas.value!, canvasSize[0], canvasSize[1])
  annoMgr.value.activeObject = activeMarker
  annoMgr.value.objNum = objNum
  annoMgr.value.label = activeLabel
  searchKeyword.value = activeLabel.value?.name
  annoMgr.value.mock()
  annoMgr.value.showGrid(true)

  updateMarkerGroup()
})

function resize(width: number, height: number) {
  if (canvasSize[0] == width && canvasSize[1] == height) return
  annotationCanvas.value.style.width = canvasSize[0] + 'px'
  annotationCanvas.value.style.height = canvasSize[1] + 'px'
  annoMgr.value.resize(width, height)
  annoMgr.value.showGrid(true)
}

function changeLabel(label: CVLabel) {
  activeLabel.value = label
  searchKeyword.value = label.name
  showLabelSearch.value = false
}

function onMarkerLabelSearch(keyword: string) {
  markerSearchLabels.value = labeTab.value.searchLabel(keyword)
}

function onMagic() {
  showMagic.value = !showMagic.value
}

function onDrawSelect(type: DrawType) {
  curDrawType.value = type
  annoMgr.value.changeDrawType(type)
}

function getLabel(id: number) {
  return labeTab.value?.getLabel(id)
}

function drawImage(offscreen: HTMLCanvasElement) {
  annoMgr.value.genImage(offscreen)
}

function updateMarkerGroup() {
  for (let i = 1; i < DrawTypes.length; ++i) {
    markerGroup.value.set(DrawTypes[i], annoMgr.value.getObjects(DrawTypes[i]))
  }
}

function drawAnnotations(boxes: Float16Array, scores: Float16Array, classes: Uint8Array,
  objNum: number, scale: [number, number], contours?: Array<[number, number]>) {

  if (objNum == 0 || labeTab.value == null) return

  annoMgr.value.clear()

  let score = "0.0", x1 = 0, y1 = 0, x2 = 0, y2 = 0
  const dpr = window.devicePixelRatio || 1

  // annoMgr.value.drawAnnotations(boxes, scores, classes, objNum, scale, contours, window.devicePixelRatio || 1)

  for (let i = 0; i < objNum; ++i) {
    score = (scores[i] * 100).toFixed(1)
    // if (scores[i] * 100 < 30) continue

    let label = getLabel(classes[i])

    if (contours && contours[i] && contours[i].length > 8) {
      let points = contours[i].map(it => { return { x: it[0] / dpr, y: it[1] / dpr } })
      let poly = annoMgr.value.genPoly(points, DrawType.polygon)
      poly.set(AnnotationManager.genLabelOption(label))
      poly.set({ score, uuid: uuidv4() })
      annoMgr.value.add(poly)
      continue
    }

    y1 = boxes[i * 4] * scale[1] / dpr
    x1 = boxes[i * 4 + 1] * scale[0] / dpr
    y2 = boxes[i * 4 + 2] * scale[1] / dpr
    x2 = boxes[i * 4 + 3] * scale[0] / dpr
    let rect = annoMgr.value.genRect(x1, y1, x2, y2)
    rect.set(AnnotationManager.genLabelOption(label))
    rect.set({ score, uuid: uuidv4() })
    annoMgr.value.add(rect)
  }
  annoMgr.value.requestRenderAll()

  updateMarkerGroup()
}

watch(() => searchKeyword.value, () => {
  searchLabels.value = labeTab.value?.searchLabel(searchKeyword.value)
})

watch(() => activeLabel.value, () => {
  searchKeyword.value = activeLabel.value?.name
})

watch(() => objNum.value, () => {
  updateMarkerGroup()
})

watch(() => activeMarker?.value, () => {
  showPolyTolerance.value = activeMarker?.value?.type == fabric.Polygon.type
})

watch(() => visionStore.genContour, (val, _) => {
  if (val) visionStore.enableCVProcess = true
})

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
  background-color: #44444488;
  z-index: 2002;
}

.active-label {
  position: absolute;
  top: 3px;
  left: 3rem;
  width: 10rem;
  padding: 5px;
  border: 2px solid;
  border-radius: 5px;
  z-index: 500;
}

.label-search-panel {
  position: absolute;
  top: 145px;
  left: 3rem;
  right: auto;
  width: 10rem;
  height: 200px;
  overflow: hidden;
  padding: 0;
}

.right-bar {
  height: calc(100vh - 48px);
  margin-top: 16px;
  overflow-y: hidden;
}

.color-block {
  color: white;
  border: 2px solid;
  padding: 1px 10px;
  margin-right: 10px;
  border-radius: 5px;
}
</style>
