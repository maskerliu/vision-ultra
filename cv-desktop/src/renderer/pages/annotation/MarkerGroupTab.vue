<template>
  <van-tab :title="$t('anno.object')">
    <van-overlay :show="showLabelSearch" @click="showLabelSearch = false" />
    <van-popup ref="labelSearchRef" class="label-search-panel" size="normal" trigger="manual" :overlay="false"
      :lazy-render="false" v-model:show="showLabelSearch">
      <van-list style="min-width: 14rem; height: 100px;">
        <van-empty image-size="35" v-if="searchLabels == null || searchLabels.length == 0" />
        <van-cell :title="label.name" center clickable v-for="label in searchLabels" @click="updateMarkerLabel(label)">
          <template #right-icon>
            <van-icon class-prefix="iconfont" name="success" v-if="label.name == curMarker?.get('label')" />
          </template>
        </van-cell>
      </van-list>
    </van-popup>
    <van-collapse v-model="activeMarkerGroup" accordion style="width: 15rem;">
      <van-collapse-item :name="key" :title="key" :value="markerGroup.get(key).length"
        v-for="key of markerGroup.keys()">
        <van-empty image-size="80" v-if="markerGroup.get(key) == null || markerGroup.get(key).length == 0" />
        <van-list v-else style="max-height: calc(100vh - 300px); overflow: hidden scroll;">
          <van-cell center :border="true" clickable class="marker" v-for="(marker, idx) in markerGroup.get(key)"
            :ref="(el: any) => setMarkerRef(el, key, idx as number)"
            :style="{ borderColor: marker.get('stroke'), backgroundColor: activeMarker?.get('uuid') == marker.get('uuid') ? 'var(--van-cell-active-color)' : 'transparent' }"
            @click="onMarkerStatusChanged(marker as any, 'selected')">
            <template #title>
              <van-row>
                <input :ref="`input_${key}_${idx}`" class="marker-input" :value="marker.get('label')"
                  @input="handleSearch" @click="showLabelSearchResult(key, idx as number)" />
                <van-icon class-prefix="iconfont" class="label-option" v-for="opt of MarkerOpts"
                  :name="opt + (getMarkerStatus(marker as any, opt) ? '' : '-n')"
                  @click.stop="onMarkerStatusChanged(marker as any, opt)">
                </van-icon>
                <van-icon class-prefix="iconfont" name="delete" class="label-option" style="color: #e74c3c"
                  @click.stop="onMarkerStatusChanged(marker, 'delete', key)" />
              </van-row>
            </template>
            <template #label>
              <div class="van-ellipsis" style="width: 13rem;">{{ marker.get('uuid') }}</div>
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
import { inject, onMounted, Ref, ref, useTemplateRef } from 'vue'
import { AnnotationManager, CVLabel, DrawType } from '../../common'

const annoMgr = inject<Ref<AnnotationManager>>('annoMgr')
const activeMarkerGroup = ref(DrawType.rect)
const curMarker = ref<fabric.FabricObject>()
const labelRefGroup = ref<Map<DrawType, Array<typeof Cell>>>(new Map())
const MarkerOpts = ['pin', 'lock', 'visible']
const labelSearchRef = useTemplateRef<typeof Popup>('labelSearchRef')
const showLabelSearch = ref(false)

const markerGroup = defineModel('markerGroup', {
  required: true,
  default: new Map(),
  type: Map<DrawType, fabric.FabricObject[]>
})

const activeMarker = defineModel('activeMarker', {
  required: false,
  default: null,
  type: fabric.FabricObject
})

defineProps<{
  searchLabels: Array<CVLabel>
}>()

const emits = defineEmits<{
  (e: 'searchLabels', keyword: string)
}>()

onMounted(() => {
  labelRefGroup.value.set(DrawType.rect, [])
  labelRefGroup.value.set(DrawType.circle, [])
  labelRefGroup.value.set(DrawType.polygon, [])
  labelRefGroup.value.set(DrawType.line, [])
  labelRefGroup.value.set(DrawType.multiLine, [])
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

function onMarkerStatusChanged(object: fabric.FabricObject, status: string, type?: string) {
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
      annoMgr.value.remove(type as DrawType, object)
      markerGroup.value.set(type, annoMgr.value.getObjects(type as DrawType))
      break
  }
  annoMgr.value.requestRenderAll()
}

function handleSearch(e: any) {
  emits('searchLabels', e.target.value)
}

function showLabelSearchResult(type: DrawType, idx: number) {
  if (labelSearchRef.value.popupRef.value) {
    labelSearchRef.value.popupRef.value.style.top = labelRefGroup.value.get(type)[idx].$el.getBoundingClientRect().bottom + 12 + 'px'
  }
  showLabelSearch.value = !showLabelSearch.value
}

function updateMarkerLabel(label: CVLabel) {
  curMarker.value.set(AnnotationManager.genLabelOption(label))
  annoMgr.value.requestRenderAll()
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
  margin-right: 8px;
}

.marker {
  width: calc(100% - 3px);
  border: 1px solid;
  border-radius: 5px;
  margin: 3px 0 0 2px;
}

.marker-input {
  width: 50%;
  border: 0;
  background-color: transparent;
}
</style>