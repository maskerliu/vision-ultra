<template>
  <van-tab :title="$t('anno.label')">

    <van-uploader v-model="fileList" accept=".json,.txt" :preview-image="false" :after-read="onLabelUpload">
      <van-cell center style="width: 15rem;" title="导入标签文件" value="" clickable>
        <template #right-icon>
          <van-icon class-prefix="iconfont" name="file-upload" style="font-size: 1rem;" />
        </template>
      </van-cell>
    </van-uploader>

    <van-empty image-size="80" style="width: 15rem;" v-if="labelGroup.size == 0" />
    <van-collapse v-else v-model="collapsedLabelGroup" :border="true" accordion>
      <van-collapse-item name="colorSpace" title="Color Space" value=" ">
        <van-grid clickable :column-num="2" style="width: 15rem;">
          <van-grid-item v-for="key in MARK_COLORS.palettes" @click="onColorSpaceChanged(key)">
            <van-image :src="`/static/${key}.png`">
              <div v-if="key == colorSpace"
                style="position: absolute; top: 0; bottom: 0; left: 0; right: 0; border: 3px solid #1989fa; border-radius: 2px;">
              </div>
            </van-image>
          </van-grid-item>
        </van-grid>
      </van-collapse-item>
      <van-collapse-item :name="key" v-for="key of labelGroup.keys()">
        <template #icon>
          <van-switch size="1rem" v-model="labelGroup.get(key).active" @click.stop="updateLabelGroup(key)"
            style="margin-top: 8px;"></van-switch>
        </template>
        <template #title>
          <div style="margin: 5px;">{{ key }}</div>
        </template>
        <template #value>
          <div style="margin: 5px; ">{{ labelGroup.get(key)?.labels.length }}</div>
        </template>
        <template #right-icon>
          <van-button plain type="danger" size="mini" style="margin-top: 5px;" v-if="key !== $t('anno.labelDefault')"
            @click.stop="deleteLabelGroup(key)">
            <van-icon class-prefix="iconfont" name="delete" />
          </van-button>
        </template>
        <van-empty image-size="80" v-if="labelGroup.get(key) == null || labelGroup.get(key).labels.length == 0" />
        <van-list v-else style="width: calc(15rem - 4px); height: calc(100vh - 280px); overflow-y: scroll;">
          <van-field :placeholder="$t('anno.labelPlaceholder')" center v-model="label.name"
            v-for="label in labelGroup.get(key).labels" @click="activeLabel = label">
            <template #left-icon>
              <div class="color-block" :style="{ backgroundColor: label.color }" @click="randomColor(label.id)">
                <van-icon class-prefix="iconfont" name="random" style="font-size: 1.2rem; color: white;" />
              </div>
            </template>
            <template #right-icon>
              <van-icon class-prefix="iconfont" name="delete" style="font-size: 1rem;" />
            </template>
          </van-field>
        </van-list>
      </van-collapse-item>
    </van-collapse>
  </van-tab>
</template>
<script setup lang="ts">

import { UploaderFileListItem } from 'vant'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CVLabel, Def_Object_Labels } from '../../common/Annotations'
import { MARK_COLORS } from '../../common/CVColors'

const { t } = useI18n()
const labelGroup = ref<Map<string, { labels: CVLabel[], active: boolean }>>(new Map())
const collapsedLabelGroup = ref() // 展开的标签组
let activeLabelGroup: string = null
const labelName = ref('')
const fileList = ref([])
const colorSpace = ref('defo')

const activeLabel = defineModel('activeLabel', {
  required: false,
  default: null,
  type: Object as () => CVLabel
})

defineExpose({ getLabel, searchLabel })

onMounted(() => {

  let defLabels = Def_Object_Labels.map((label, idx) => {
    return { id: idx, name: label, color: MARK_COLORS.get(idx, colorSpace.value) }
  })

  let defaultKey = t('anno.labelDefault')
  labelGroup.value.set(defaultKey, { labels: defLabels, active: true })
  updateLabelGroup(defaultKey)
})

function onColorSpaceChanged(key: string) {
  colorSpace.value = key
  for (let item of labelGroup.value.keys()) {
    let labels = labelGroup.value.get(item).labels
    for (let i = 0; i < labels.length; i++) {
      labels[i].color = MARK_COLORS.get(i, colorSpace.value)
    }
  }
}

function onLabelUpload(data: UploaderFileListItem) {
  var reader = new FileReader()
  reader.readAsText(data.file, 'utf-8')
  reader.onload = function (e) {
    var pointsTxt = e.target.result
    let arr = JSON.parse(pointsTxt as string)
    let labels = []
    for (let i = 0; i < arr.length; i++) {
      labels.push({ id: i, name: arr[i], color: MARK_COLORS.get(i, colorSpace.value) })
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

function searchLabel(keyword: string) {
  return labelGroup.value.get(activeLabelGroup).labels.filter(item => item.name.indexOf(keyword) != -1)
}

function deleteLabelGroup(key: string) {
  let isActive = labelGroup.value.get(key).active
  labelGroup.value.delete(key)
  if (isActive) {
    labelGroup.value.get(t('anno.labelDefault')).active = true
  }
}

function randomColor(idx: number) {
  // labels.value[idx].color = '#' + Math.floor(Math.random() * 16777215).toString(16)
}

</script>

<style lang="css" scoped>
.color-block {
  color: white;
  border: 2px solid;
  padding: 1px 10px;
  margin-right: 10px;
  border-radius: 5px;
}
</style>