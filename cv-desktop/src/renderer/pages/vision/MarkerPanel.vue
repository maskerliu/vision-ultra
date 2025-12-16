<template>
  <van-row class="marker-layer" justify="space-between">
    <van-col class="marker-panel" justify="start">
      <van-button square block @click="showLabelConfig = true; labelConfigModel = 0;">
        <van-icon :class="`iconfont icon-marker`" style="font-size: 1.2rem;" />
      </van-button>
      <van-button square block @click="expandResult = !expandResult">
        <van-icon class="iconfont" :class="`icon-expand-${expandResult ? 'left' : 'right'}`"
          style="font-size: 1.2rem;" />
      </van-button>

      <van-button :plain="activeMarker == idx" square block v-for="(type, idx) in MarkerTypes" :key="idx"
        @click="onMarkerSelected(idx)">
        <van-icon :class="`iconfont icon-mark-${type}`" style="font-size: 1.2rem;" />
      </van-button>
    </van-col>

    <van-row class="result-panel" justify="start">


    </van-row>

    <van-popup v-model:show="expandResult" position="right"
      style="height: calc(100% - 84px); margin-top: 44px; overflow-y: scroll;">
      <van-collapse v-model="activeResult" accordion style="width: 18.2rem; overflow: hidden;">
        <van-collapse-item :title="MarkerTypes[key]" :name="key" v-for="(_, key) of markers">
          <van-empty description="暂无结果" v-if="_.length == 0" />
          <van-list style="overflow: hidden;" v-else>
            <van-cell center v-for="(val, idx) in _.values()" size="normal">
              <template #right-icon>
                <van-button square size="mini" style="margin-left: 10px;">
                  <van-icon class="iconfont icon-eye-close" style="font-size: 1rem;" />
                </van-button>
                <van-button square plain type="danger" size="mini" style="margin-left: 10px;">
                  <van-icon class="iconfont icon-delete" style="font-size: 0.8rem;" />
                </van-button>
              </template>
              <template #title>
                <div style="width: 100%;" :style="{ 'background-color': labels[val.label].color }"
                  @click="onLabelClicked(idx, val.label)">
                  {{ labels[val.label].name }}
                </div>
              </template>
            </van-cell>
          </van-list>
        </van-collapse-item>
      </van-collapse>
    </van-popup>

    <van-dialog v-model:show="showLabelConfig" :title="`${labelConfigModel == 0 ? '编辑' : '选择'}标签`" show-cancel-button
      style="width: 40vw; padding: 0 10px;">
      <van-list style="height: 40vh; overflow-y: auto;">
        <van-field placeholder="输入标签名" center v-model="label.name" :readonly="labelConfigModel == 1"
          :clickable="labelConfigModel == 1" v-for="(label, idx) in labels" @click="onLabelChanged(idx)">
          <template #left-icon>
            <div class="color-block" :style="{ backgroundColor: label.color }" @click="randomColor(idx)">
              <van-icon class="iconfont icon-random" style="font-size: 1.2rem; color: white;" />
            </div>
          </template>
          <template #right-icon>
            <van-button square plain type="danger" size="mini" v-if="labelConfigModel == 0">
              <van-icon class="iconfont icon-delete" style="font-size: 1rem;" />
            </van-button>
            <van-icon name="success" style="font-size: 1rem;" v-if="labelConfigModel == 1 && curLabel == idx" />
          </template>
        </van-field>
      </van-list>

      <van-field placeholder="输入标签名" v-model="labelName" center>
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
    </van-dialog>
  </van-row>

</template>
<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { MARK_COLORS, Object_Labels } from '../../common/DrawUtils'

const MarkerTypes = [
  'rect', 'circle', 'polygon', 'line', 'multi-line'
]
const activeMarker = ref(1)
const activeResult = ref('1')
const showLabelConfig = ref(false)

const labelConfigModel = ref(0) // 0: edit 1: select

const expandResult = ref(false)
const labelName = ref('')
const labelColor = ref('#ff0000')

type MarkerLabel = {
  name: string,
  color: string,
}

type Marker = {
  label: number,
  points: number[], // [x, y]
}

const labels = ref<MarkerLabel[]>([])

const markers = ref<Map<number, Marker[]>>({
  0: [
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
  ],
  1: [
    { label: 0, points: [0, 0] },
    { label: 1, points: [0, 0] },
    { label: 2, points: [0, 0] },
    { label: 3, points: [0, 0] },
    { label: 2, points: [0, 0] },
    { label: 1, points: [0, 0] },
    { label: 1, points: [0, 0] },
  ],
  2: [],
  3: [],
  4: [],
} as any)

const curLabel = ref(-1)
const curMarker = ref(-1)

onMounted(() => {
  Object_Labels.forEach((object, idx) => {
    labels.value.push({ name: object, color: MARK_COLORS.get(idx) })
  })
})

function onMarkerSelected(idx: number) {
  activeMarker.value = idx
}

function onLabelChanged(idx: number) {
  curLabel.value = -1
  markers.value[activeResult.value][curMarker.value].label = idx
}

function onLabelClicked(idx: number, label: number) {
  labelConfigModel.value = 1
  showLabelConfig.value = true

  curMarker.value = idx
  curLabel.value = label
}

function onLabelAdd() {
  labels.value.push({ name: labelName.value, color: labelColor.value })
  labelName.value = ''
}

function randomColor(idx: number) {
  labels.value[idx].color = '#' + Math.floor(Math.random() * 16777215).toString(16)
}
</script>

<style lang="css" scoped>
.marker-layer {
  position: absolute;
  top: 80px;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 500;
  top: 50px;
}

.marker-panel {
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