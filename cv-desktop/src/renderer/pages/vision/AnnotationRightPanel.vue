<template>
  <van-popup :show="show" position="right" :overlay="false"
    style="height: calc(100vh - 90px); margin-top: 40px; overflow-y: hidden; border-radius: 0 0 10px 0;">
    <van-tabs v-model:active="activeTab" sticky>
      <van-tab title="物体">
        <van-collapse v-model="activeMarkerGroup" accordion style="width: 15rem; overflow: hidden scroll;">
          <van-collapse-item :name="key" :title="MarkerTypes[key]" v-for="key of groupedMarkers.keys()">
            <van-list style="max-height: calc(100vh - 250px); overflow: hidden scroll;">
              <van-empty v-if="groupedMarkers.get(key) == null || groupedMarkers.get(key).length == 0" />
              <van-popover v-for="marker in groupedMarkers.get(key)" size="normal" v-model="showLabelSearch"
                trigger="manual" placement="bottom-start">
                <template #reference>
                  <van-field center v-if="marker != null && marker.get('label') != null"
                    :model-value="marker.get('label')"
                    @focus="$emit('markerSelected', marker as any); showLabelSearch = true;">
                    <template #left-icon>
                      <div style="width: 2rem; height: 1rem; border: 2px solid;"
                        :style="{ borderColor: marker.get('color') }"></div>
                    </template>
                    <template #right-icon>
                      <van-button square plain size="mini" style="margin-left: 10px;"
                        @click="marker.visible = !marker.visible; $emit('updateMarker', marker as any)">
                        <van-icon class="iconfont" :class="marker?.visible ? 'icon-eye' : 'icon-eye-close'"
                          style="font-size: 1rem;" />
                      </van-button>
                      <van-button square plain type="danger" size="mini" style="margin-left: 10px;">
                        <van-icon class="iconfont icon-delete" style="font-size: 0.8rem;" />
                      </van-button>
                    </template>
                  </van-field>
                </template>
                <van-empty description="未找到该标签" v-if="searchLabels == null || searchLabels.length == 0" />
                <van-list v-else style="min-width: 15rem; height: 100px;">
                  <van-cell :title="label.name" center clickable v-for="label in searchLabels">
                    <template #right-icon>
                      <van-icon v-if="label.id == curMarker?.get('label')" name="success" />
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
          <van-field placeholder="输入标签名" center v-model="label.name" v-for="(label, idx) in labels"
            @click="onLabelChanged(idx)">
            <template #left-icon>
              <div class="color-block" :style="{ backgroundColor: label.color }" @click="randomColor(idx)">
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
</template>
<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid'
import { onMounted, ref } from 'vue'
import * as fabric from 'fabric'
import { CVLabel, CVMarker, MarkerTypes } from '../../common/Annotations'
import { MARK_COLORS, Object_Labels } from '../../common/DrawUtils'


const activeTab = ref(0)

const groupedMarkers = ref<Map<number, fabric.FabricObject[]>>(new Map())
const activeMarkerGroup = ref(0) // 展开的标注组
const curMarker = ref<fabric.FabricObject>(null) // 当前选中的标注

const labels = ref<CVLabel[]>([]) // 标签列表
const curLabel = ref(-1)
const labelColor = ref('#ff0000')
const labelName = ref('')
const showLabelSearch = ref(false)
const searchLabels = ref<Array<any>>([
  { id: 0, name: 'person' },
  { id: 2, name: 'car' },
  { id: 5, name: 'bus' }
])

const {
  show = false,
} = defineProps<{
  show: boolean,
}>()

defineEmits<{
  (e: 'markerSelected', shape: fabric.FabricObject): void
  (e: 'updateMarker', shape: fabric.FabricObject): void
}>()

defineExpose({ addMarker, addMarkers, clearMarkers })

onMounted(() => {

  Object_Labels.forEach((object, idx) => {
    labels.value.push({ id: idx, name: object, color: MARK_COLORS.get(idx) })
  })

  groupedMarkers.value.set(0, [
  ])
  groupedMarkers.value.set(1, [
  ])
  groupedMarkers.value.set(2, [])
  groupedMarkers.value.set(3, [])
  groupedMarkers.value.set(4, [])
})

function clearMarkers() {
  groupedMarkers.value.clear()
}

function addMarker(type: number, marker: fabric.FabricObject) {
  let markers = groupedMarkers.value.get(type) || []
  markers.push(marker)
  groupedMarkers.value.set(type, markers)
}

function addMarkers(type: number, data: fabric.FabricObject[]) {
  let markers = groupedMarkers.value.get(type) || []
  markers.push(...data)
  groupedMarkers.value.set(type, markers)
  console.log(groupedMarkers.value)
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