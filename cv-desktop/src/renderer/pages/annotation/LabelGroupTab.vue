<template>
  <van-tab :title="$t('anno.label')">
    <van-uploader v-model="fileList" accept=".json,.txt" :preview-image="false" :after-read="onLabelUpload">
      <van-button square plain size="small" block style="width: 62px; height: 32px;">
        <van-icon class="iconfont icon-file-upload" style="font-size: 1.5rem;" />
      </van-button>
    </van-uploader>
    <van-empty v-if="labelGroup.size == 0" />
    <van-collapse v-model="collapsedLabelGroup" :border="true" accordion>
      <van-collapse-item :name="key" v-for="key of labelGroup.keys()">
        <template #icon>
          <van-switch size="1rem" v-model="labelGroup.get(key).active" @click.stop="updateLabelGroup(key)"
            style="margin-top: 8px;"></van-switch>
        </template>
        <template #title>
          <div style="margin: 5px;">{{ key }}</div>
        </template>
        <template #value>
          {{ labelGroup.get(key)?.labels.length }}
          <van-button plain square type="danger" size="mini" @click.stop="">
            <van-icon class="iconfont icon-delete" style="font-size: 1rem;" />
          </van-button>
        </template>
        <van-empty v-if="labelGroup.get(key) == null || labelGroup.get(key).labels.length == 0" />
        <van-list v-else style="width: calc(15rem - 4px); height: calc(100vh - 280px); overflow-y: scroll;">
          <van-field :placeholder="$t('anno.labelPlaceholder')" center v-model="label.name"
            v-for="label in labelGroup.get(key).labels" @click="activeLabel = label">
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
</template>
<script setup lang="ts">

import { onMounted, ref, watch } from 'vue'
import { CVLabel, MarkerTypes } from '../../common/Annotations'
import { MARK_COLORS } from '../../common/DrawUtils'
import { UploaderFileListItem } from 'vant'
import { Cell, Popup } from 'vant'

const labelGroup = ref<Map<string, { labels: CVLabel[], active: boolean }>>(new Map())
const collapsedLabelGroup = ref() // 展开的标签组
let activeLabelGroup: string = null
const curLabel = ref(-1)
const labelColor = ref('#ff0000')
const labelName = ref('')
const fileList = ref([])

const activeLabel = defineModel('activeLabel', {
  required: false,
  default: null,
  type: Object as () => CVLabel
})

defineExpose({ getLabel })

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
    labelGroup.value.set(data.file.name, { labels, active: true })
    updateLabelGroup(data.file.name)
  }
}

function updateLabelGroup(key: string) {

  if (labelGroup.value.get(key).active) activeLabelGroup = key

  for (let item of labelGroup.value.keys()) {
    if (item != key && labelGroup.value.get(item).active) {
      let group = labelGroup.value.get(item)
      group.active = false
      labelGroup.value.set(item, group)
    }
  }
}

function getLabel(index: number) {
  return labelGroup.value.get(activeLabelGroup).labels[index]
}

function onLabelAdd() {
  // labels.value.push({ id: labels.value.length, name: labelName.value, color: labelColor.value })
  labelName.value = ''
}

function randomColor(idx: number) {
  // labels.value[idx].color = '#' + Math.floor(Math.random() * 16777215).toString(16)
}

</script>

<style lang="css" scoped>
.color-block {
  width: 1.5rem;
  height: 1.5rem;
  border: 2px solid;
  margin-right: 10px;
  border-radius: 5px;
}
</style>