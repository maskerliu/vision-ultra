<template>
  <van-tab :title="$t('anno.object')">
    <van-popup ref="labelSearchRef" class="label-search-panel" size="normal" trigger="manual" :overlay="false"
      :lazy-render="false" v-model:show="showLabelSearch">
      <van-list style="min-width: 14rem; height: 100px;">
        <van-empty image-size="35" v-if="searchLabels == null || searchLabels.length == 0" />
        <van-cell :title="label.name" center clickable v-for="label in searchLabels" @click="updateMarkerLabel(label)">
          <template #right-icon>
            <van-icon v-if="label.id == curMarker?.get('label')" name="success" />
          </template>
        </van-cell>
      </van-list>
    </van-popup>
    <van-collapse v-model="activeMarkerGroup" accordion style="width: 15rem;">
      <van-collapse-item :name="key" :title="key" :value="markerGroup.get(key).length"
        v-for="key of markerGroup.keys()">
        <van-empty image-size="80" v-if="markerGroup.get(key) == null || markerGroup.get(key).length == 0" />
        <van-list v-else style="max-height: calc(100vh - 250px); overflow: hidden scroll;">
          <van-cell center :border="true" clickable v-for="(marker, idx) in markerGroup.get(key)"
            :ref="(el: any) => setMarkerRef(el, key, idx as number)"
            @click="onMarkerStatusChanged(marker as any, 'selected')">
            <template #icon>
              <div class="color-block" :style="{ borderColor: marker.get('stroke') }"></div>
            </template>
            <template #title>
              <input :ref="`input_${key}_${idx}`" style="width: 5rem; border: 0;"
                @click="showLabelSearchResult(key, idx as number)" :value="marker.get('label')" @input="handleSearch" />
            </template>
            <template #right-icon>
              <van-icon class="iconfont label-option" v-for="opt of MarkerOpts"
                :class="'icon-' + opt + (getMarkerStatus(marker as any, opt) ? '' : '-n')"
                @click.stop="onMarkerStatusChanged(marker as any, opt)">
              </van-icon>
              <van-icon class="iconfont icon-delete label-option" style="color: #e74c3c"
                @click.stop="onMarkerStatusChanged(marker, 'delete', key, idx as number)" />
            </template>
          </van-cell>
        </van-list>
      </van-collapse-item>
    </van-collapse>
  </van-tab>
</template>
<script setup lang="ts">

import * as fabric from 'fabric'
import { Cell, Popup } from 'vant'
import { onMounted, ref } from 'vue'
import { AnnotationPanel, CVLabel, DrawType } from '../../common/Annotations'

const activeMarkerGroup = ref(DrawType.Rect) // 展开的标注组
const curMarker = ref<fabric.FabricObject>(null) // 当前选中的标注
const labelRefGroup = ref<Map<DrawType, Array<typeof Cell>>>(new Map())
const MarkerOpts = ['pin', 'lock', 'visible']
const labelSearchRef = ref<typeof Popup>()
const showLabelSearch = ref(false)

const markerGroup = defineModel('markerGroup', {
  required: true,
  default: new Map(),
  type: Map<number, fabric.FabricObject[]>
})

defineProps<{
  searchLabels: Array<CVLabel>
}>()

const emits = defineEmits<{
  (e: 'searchLabels', keyword: string)
}>()

onMounted(() => {
  labelRefGroup.value.set(DrawType.Rect, [])
  labelRefGroup.value.set(DrawType.Circle, [])
  labelRefGroup.value.set(DrawType.Polygon, [])
  labelRefGroup.value.set(DrawType.Line, [])
})

function setMarkerRef(el: typeof Cell, group: DrawType, idx: number) {
  if (el) labelRefGroup.value.get(group)[idx] = el
}

function getMarkerStatus(marker: fabric.FabricObject, status: string) {
  if (marker.get(status) == null) {
    marker.set(status, false)
  }
  return marker.get(status)
}

function onMarkerStatusChanged(object: fabric.FabricObject, status: string, group?: number, idx?: number) {
  curMarker.value = object
  let val = object.get(status) == null ? false : object.get(status)
  let params = {}
  params[status] = !val
  object.set(params)
  val = object.get(status)
  switch (status) {
    case 'selected':
      object.canvas.setActiveObject(object)
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
      markerGroup.value.get(group).splice(idx, 1)
      object.canvas.remove(object)
      break
  }
  object.canvas.requestRenderAll()
}

function handleSearch(e: any) {
  emits('searchLabels', e.target.value)
}

function showLabelSearchResult(type: DrawType, idx: number) {
  if (labelSearchRef.value.popupRef.value) {
    labelSearchRef.value.popupRef.value.style.top = labelRefGroup.value.get(type)[idx].$el.getBoundingClientRect().top + 'px'
  }
  showLabelSearch.value = !showLabelSearch.value
}

function updateMarkerLabel(label: CVLabel) {
  console.log(label)
  curMarker.value.set(AnnotationPanel.genLabelOption(label))
  curMarker.value.canvas.requestRenderAll()
  showLabelSearch.value = false
}

</script>
<style lang="css" scoped>
.label-search-panel {
  box-shadow: 5px 5px 12px #444444;
  border-radius: 5px;
  border: 1px solid #dcdcdc;
}

.label-option {
  font-size: 1rem;
  margin-left: 5px;
}

.color-block {
  width: 1.5rem;
  height: 1.5rem;
  border: 2px solid;
  margin-right: 10px;
  border-radius: 5px;
}
</style>