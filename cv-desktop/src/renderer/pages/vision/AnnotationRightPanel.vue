<template>
  <van-popup :show="show" position="right" :overlay="false" class="right-bar">
    <van-tabs v-model:active="activeTab" sticky>
      <van-tab :title="$t('anno.object')">
        <van-collapse v-model="activeMarkerGroup" accordion style="width: 15rem;">
          <van-collapse-item :name="key" :title="MarkerTypes[key]" v-for="key of markerGroup.keys()">
            <van-empty v-if="markerGroup.get(key) == null || markerGroup.get(key).length == 0" />
            <van-list v-else style="max-height: calc(100vh - 250px); overflow: hidden scroll;">
              <van-cell center :border="true" clickable v-for="(marker, idx) in markerGroup.get(key)"
                @click="$emit('markerSelected', marker as any);">
                <template #icon>
                  <div style="width: 2rem; height: 14px; border: 2px solid;"
                    :style="{ borderColor: marker.get('color') }"></div>
                </template>
                <template #title>
                  <input :ref="`input_${key}_${idx}`" style="width: 5rem; border: 0;"
                    @click="showLabelSearchResult(key, idx)" :value="marker.get('label')" />
                </template>
                <template #right-icon>
                  <van-icon class="iconfont icon-pin" style="font-size: 0.8rem;" @click="" />
                  <van-icon class="iconfont icon-lock" style="font-size: 0.8rem; margin-left: 5px;" />
                  <van-icon class="iconfont" :class="marker?.visible ? 'icon-eye' : 'icon-eye-close'"
                    @click="marker.visible = !marker.visible; $emit('updateMarker', marker as any)"
                    style="font-size: 0.8rem; margin-left: 5px;" />
                  <van-icon class="iconfont icon-delete" style="font-size: 0.8rem; margin-left: 5px; color: #e74c3c" />
                </template>
              </van-cell>
            </van-list>
          </van-collapse-item>
        </van-collapse>
      </van-tab>
      <van-tab :title="$t('anno.label')">
        <van-uploader v-model="fileList" accept=".json,.txt" :preview-size="[62, 40]" :after-read="onLabelUpload"
          style="width: 210px; margin: 5px; justify-items: center; align-items: center;">
          <van-button square plain size="small" block style="width: 62px; height: 40px;">
            <van-icon class="iconfont icon-file-upload" style="font-size: 1.5rem;" />
          </van-button>
          <template #preview-cover="{ file }">
            <div class="label-file-name"> {{ file.name }}</div>
          </template>
        </van-uploader>
        <van-empty v-if="labelGroup.size == 0" />
        <van-collapse v-model="activeLabelGroup" accordion style="height: 100%; overflow: hidden scroll;">
          <van-collapse-item :name="key" :title="key" v-for="key of labelGroup.keys()">
            <van-empty v-if="labelGroup.get(key) == null || labelGroup.get(key).length == 0" />
            <van-list v-else style="width: calc(15rem - 4px); height: calc(100vh - 280px); overflow-y: scroll;">
              <van-field :placeholder="$t('anno.labelPlaceholder')" center v-model="label.name"
                v-for="label in labelGroup.get(key)" @click="onLabelChanged(label.id)">
                <template #left-icon>
                  <div class="color-block" :style="{ backgroundColor: label.color }" @click="randomColor(label.id)">
                    <van-icon class="iconfont icon-random" style="font-size: 1.2rem; color: white;" />
                  </div>
                </template>
                <template #right-icon>
                  <van-button square plain type="danger" size="mini">
                    <van-icon class="iconfont icon-delete" style="font-size: 1rem;" />
                  </van-button>
                </template>
              </van-field>
            </van-list>
          </van-collapse-item>
        </van-collapse>

        <van-field :placeholder="$t('anno.labelPlaceholder')" v-model="labelName" center
          style="width: 15rem; position: relative; left: 0; right: 0; bottom: 10px; z-index: 500; margin-top: 15px;">
          <template #left-icon>
            <div class="color-block" :style="{ backgroundColor: labelColor }">
              <van-icon class="iconfont icon-random" style="font-size: 1.2rem; color: white; cursor: pointer;" />
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

    <van-popover ref="labelSearchPopover" size="normal" v-model:show="showLabelSearch" trigger="manual"
      placement="bottom" overlay>
      <template #reference>
        <div ref="labelSearchRef"
          style="position: absolute; left: 0; right: 0; z-index: 500; height: 5px; background-color: #e74c3c;"></div>
      </template>
      <van-empty :description="$t('anno.noMatch')" v-if="searchLabels == null || searchLabels.length == 0" />
      <van-list v-else style="min-width: 14rem; height: 100px;">
        <van-cell :title="label.name" center clickable v-for="label in searchLabels">
          <template #right-icon>
            <van-icon v-if="label.id == curMarker?.get('label')" name="success" />
          </template>
        </van-cell>
      </van-list>
    </van-popover>
  </van-popup>
</template>
<script setup lang="ts">
import * as fabric from 'fabric'
import { onMounted, ref } from 'vue'
import { CVLabel, MarkerTypes } from '../../common/Annotations'
import { MARK_COLORS } from '../../common/DrawUtils'
import { UploaderFileListItem } from 'vant'


const activeTab = ref(0)

const markerGroup = ref<Map<number, fabric.FabricObject[]>>(new Map())
const activeMarkerGroup = ref(1) // 展开的标注组
const curMarker = ref<fabric.FabricObject>(null) // 当前选中的标注
const labelSearchPopover = ref('labelSearchPopover')
const labelSearchRef = ref('labelSearchRef')
const showLabelSearch = ref(false)
const searchLabels = ref<Array<any>>([
  { id: 0, name: 'person' },
  { id: 2, name: 'car' },
  { id: 5, name: 'bus' }
])

const labelGroup = ref<Map<string, CVLabel[]>>(new Map())
const activeLabelGroup = ref() // 展开的标签组
const labels = ref<CVLabel[]>([]) // 标签列表
const curLabel = ref(-1)
const labelColor = ref('#ff0000')
const labelName = ref('')

const fileList = ref([])

const {
  show = false,
} = defineProps<{
  show: boolean,
}>()

defineEmits<{
  (e: 'markerSelected', shape: fabric.FabricObject): void
  (e: 'updateMarker', shape: fabric.FabricObject): void
}>()

defineExpose({ addMarker, addMarkers, clearMarkers, getLabel })

onMounted(() => {
  markerGroup.value.set(1, [])
  markerGroup.value.set(2, [])
  markerGroup.value.set(3, [])
  markerGroup.value.set(4, [])
})

function clearMarkers() {
  markerGroup.value.clear()
}

function addMarker(type: number, marker: fabric.FabricObject) {
  let markers = markerGroup.value.get(type) || []
  markers.push(marker)
  markerGroup.value.set(type, markers)
}

function addMarkers(type: number, data: fabric.FabricObject[]) {
  let markers = markerGroup.value.get(type) || []
  markers.push(...data)
  markerGroup.value.set(type, markers)
}

function showLabelSearchResult(group: number, idx: number) {
  labelSearchRef.value = ref(`input_${group}_${idx}`).value
  showLabelSearch.value = true
}

function onLabelUpload(data: UploaderFileListItem) {
  var reader = new FileReader()
  reader.readAsText(data.file, 'utf-8')
  reader.onload = function (e) {
    var pointsTxt = e.target.result
    let arr = JSON.parse(pointsTxt as string)
    let labels = []
    for (let i = 0; i < arr.length; i++) {
      labels.push({ id: i, name: arr[i], color: MARK_COLORS.get(i) })
    }
    labelGroup.value.set(data.file.name, labels)
    console.log(labelGroup.value)
  }
}

function onLabelChanged(idx: number) {
  curLabel.value = -1
  // markers.value[activeResult.value][curMarker.value].label = idx
}

function getLabel(index: number) {
  return labelGroup.value.get(activeLabelGroup.value)[index]
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
.right-bar {
  height: calc(100vh - 90px);
  margin-top: 40px;
  overflow-y: hidden;
  border-radius: 0 0 10px 0;
}

.color-block {
  width: 1.5rem;
  height: 1.5rem;
  margin-right: 10px;
  border-radius: 5px;
}

.label-file-name {
  width: 62px;
  height: 0.5rem;
  font-size: 0.5rem;
  color: gray;
  margin-top: 32px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>