<template>
  <van-row class="marker-layer" justify="center" style="align-items: center">
    <van-col class="left-bar" justify="start">
      <van-button square block @click="showRightBar = !showRightBar">
        <van-icon class-prefix="iconfont" name="marker" style="font-size: 1.2rem" />
      </van-button>

      <van-button square block plain :type="curDrawType == type ? 'primary' : 'default'"
        v-for="(type, idx) in DrawTypes" :key="idx" @click="onDrawSelect(type)">
        <van-icon class-prefix="iconfont" :name="'mark-' + type.toLocaleLowerCase()" style="font-size: 1.2rem" />
      </van-button>

      <van-popover v-model:show="showMagic" placement="right-start">
        <template #reference>
          <van-button square block style="width: 2.5rem">
            <van-icon class-prefix="iconfont" name="mark-magic" style="font-size: 1.2rem" />
          </van-button>
        </template>
        <van-row style="width: 260px; padding: 5px">
          <van-field label="label" input-align="right"> </van-field>
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

    <van-field class="active-label" v-model="searchKeyword" @click="showLabelSearch = true">
      <template #left-icon>
        <div class="color-block" :style="{ backgroundColor: activeLabel?.color }" @click="">
          <van-icon class-prefix="iconfont" name="random" />
        </div>
      </template>
    </van-field>
    <van-popup class="label-search-panel" size="normal" trigger="manual" :overlay="true" :lazy-render="false"
      teleport="#app" v-model:show="showLabelSearch">
      <van-list style="min-width: 14rem; max-height: 200px; overflow: hidden scroll;">
        <van-empty image-size="80" :description="$t('anno.noMatch')"
          v-if="searchLabels == null || searchLabels.length == 0" />
        <van-cell :title="label.name" center clickable v-for="label in searchLabels" @click="changeLabel(label)">
          <template #right-icon>
            <van-icon class-prefix="iconfont" name="success" v-if="label.id == activeLabel?.id" />
          </template>
        </van-cell>
      </van-list>
    </van-popup>
    <canvas ref="annotationCanvas" style="display: block"></canvas>

    <van-popup :show="showRightBar" position="right" :overlay="false" class="right-bar">
      <van-tabs v-model:active="activeTab" sticky>
        <marker-group-tab v-model:marker-group="markerGroup" v-model:active-markers="activeMarkers as any"
          :search-labels="markerSearchLabels" @searchLabels="onMarkerLabelSearch" />
        <label-group-tab ref="labeTab" v-model:active-label="activeLabel" />
      </van-tabs>
    </van-popup>
  </van-row>
</template>
<script lang="ts" setup>

import * as fabric from "fabric"
import { v4 as uuidv4 } from "uuid"
import { onMounted, ref, useTemplateRef, watch } from "vue"
import { CVLabel, AnnotationPanel, DrawType } from "../../common/Annotations"
import MarkerGroupTab from "./MarkerGroupTab.vue"
import LabelGroupTab from "./LabelGroupTab.vue"

const showRightBar = ref(true)
const activeTab = ref(0)
const labeTab = useTemplateRef<typeof LabelGroupTab>('labeTab')
const annotationCanvas = useTemplateRef<HTMLCanvasElement>('annotationCanvas')
const showMagic = ref(false)
const curDrawType = ref(DrawType.Select)
const markerGroup = ref<Map<DrawType, Array<fabric.FabricObject>>>(new Map())
const activeMarkers = ref<Array<fabric.FabricObject>>([])
const activeLabel = ref<CVLabel>(null)
const showLabelSearch = ref(false)
const searchKeyword = ref('')
const searchLabels = ref([])
const markerSearchLabels = ref([])

const DrawTypes: Array<DrawType> = [
  DrawType.Select, DrawType.Rect, DrawType.Circle, DrawType.Polygon, DrawType.Line, DrawType.MultiLine
]

let annotationPanel: AnnotationPanel

const { canvasSize = [640, 480] } = defineProps<{
  canvasSize: [number, number]
}>()

defineExpose({ drawAnnotations })

watch(() => canvasSize, (val, _) => {
  annotationPanel.resize(val[0], val[1])
  annotationPanel.showGrid(true)
})

watch(() => markerGroup.value, () => {
  console.log(markerGroup.value)
})

watch(() => searchKeyword.value, () => {
  searchLabels.value = labeTab.value.searchLabel(searchKeyword.value)
})

onMounted(() => {
  annotationPanel = new AnnotationPanel(annotationCanvas.value!, canvasSize[0], canvasSize[1])
  annotationPanel.markerGroup = markerGroup.value as any
  annotationPanel.activeObjects = activeMarkers.value as any

  activeLabel.value = labeTab.value.getLabel(1)
  annotationPanel.label = activeLabel.value
  searchKeyword.value = activeLabel.value.name

  for (let i = 1; i < DrawTypes.length; ++i) {
    markerGroup.value.set(DrawTypes[i], [])
  }

  // annotationPanel.mock()
  annotationPanel.showGrid(true)
})

function changeLabel(label: CVLabel) {
  activeLabel.value = label
  searchKeyword.value = label.name
  annotationPanel.label = label
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
  annotationPanel.changeDrawType(type)
}

function drawAnnotations(boxes: Float16Array, scores: Float16Array, classes: Uint8Array,
  objNum: number, scale: [number, number]) {

  if (objNum == 0) return
  let score = "0.0", x1 = 0, y1 = 0, x2 = 0, y2 = 0

  for (let i = 0; i < objNum; ++i) {
    score = (scores[i] * 100).toFixed(1)
    // if (scores[i] * 100 < 30) continue

    let label = labeTab.value.getLabel(classes[i])
    y1 = boxes[i * 4] * scale[1]
    x1 = boxes[i * 4 + 1] * scale[0]
    y2 = boxes[i * 4 + 2] * scale[1]
    x2 = boxes[i * 4 + 3] * scale[0]
    let rect = annotationPanel.genRect(x1, y1, x2, y2)
    rect.set(AnnotationPanel.genLabelOption(label))
    rect.set({ score, uuid: uuidv4() })
    annotationPanel.add(rect)
  }
  annotationPanel.requestRenderAll()

  for (let i = 1; i < DrawTypes.length; ++i) {
    markerGroup.value.set(DrawTypes[i], annotationPanel.getObjects(DrawTypes[i]))
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

.active-label {
  position: absolute;
  top: 5px;
  left: 3rem;
  width: 228px;
  z-index: 500;
}

.label-search-panel {
  position: absolute;
  top: 145px;
  left: 3rem;
  right: auto;
  width: 228px;
  height: 200px;
  overflow: hidden;
  padding: 0;
}

.right-bar {
  height: calc(100vh - 90px);
  margin-top: 40px;
  overflow-y: hidden;
  border-radius: 0 0 10px 0;
}

.color-block {
  color: white;
  border: 2px solid;
  padding: 1px 10px;
  margin-right: 10px;
  border-radius: 5px;
}
</style>
