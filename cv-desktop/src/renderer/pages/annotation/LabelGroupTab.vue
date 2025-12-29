<template>
  <van-tab :title="$t('anno.label')">
    <van-collapse v-model="collapsedLabelGroup" :border="true" accordion>
      <van-collapse-item name="colorSpace" title="Color Space" value=" " style="width: 15rem;">
        <van-grid clickable :column-num="2" style="width: 15rem;">
          <van-grid-item v-for="key in MARK_COLORS.palettes" @click="onColorSpaceChanged(key)">
            <div v-if="key == colorSpace"
              style="position: absolute; top: 0; bottom: 0; left: 0; right: 0; border: 2px solid #1989fa;">
            </div>
            <van-image radius="5" :src="`/static/${key}.png`"></van-image>
          </van-grid-item>
        </van-grid>
      </van-collapse-item>
      <van-uploader accept=".json,.txt" :preview-image="false" :after-read="onLabelUpload">
        <van-collapse-item name="colorSpace" :title="$t('anno.labelImport')" value=" " style="width: 15rem;">
          <template #right-icon>
            <van-icon class-prefix="iconfont" name="file-upload" style="font-size: 1rem;" />
          </template>
        </van-collapse-item>
      </van-uploader>
      <van-collapse-item :name="key" v-for="key of labelGroup.keys()">
        <template #icon>
          <van-switch size="1rem" v-model="labelGroup.get(key).active" @click.stop="updateLabelGroup(key)"
            style="margin-top: 8px;"></van-switch>
        </template>
        <template #title>
          <div style="margin: 5px;">{{ key }}</div>
        </template>
        <template #value>
          <div style="margin: 5px; ">{{ labelGroup.get(key)?.labels.size }}</div>
        </template>
        <template #right-icon>
          <van-button plain type="danger" size="mini" style="margin-top: 5px;" v-if="key !== $t('anno.labelDefault')"
            @click.stop="deleteLabelGroup(key)">
            <van-icon class-prefix="iconfont" name="delete" />
          </van-button>
        </template>
        <van-empty image-size="80" v-if="labelGroup.get(key) == null || labelGroup.get(key).labels.size == 0" />
        <van-list v-else style="width: calc(15rem - 4px); height: calc(100vh - 280px); overflow-y: scroll;">
          <van-cell :placeholder="$t('anno.labelPlaceholder')" center clickable
            v-for="labelKey of labelGroup.get(key).labels.keys()"
            @click="activeLabel = labelGroup.get(key).labels.get(labelKey)">
            <template #title>
              <div class="color-block" :style="{ borderColor: labelGroup.get(key).labels.get(labelKey).color }">
                {{ labelGroup.get(key).labels.get(labelKey).name }}
              </div>
            </template>
            <template #right-icon>
              <van-icon class-prefix="iconfont" name="visible" />
              <van-icon class-prefix="iconfont" name="lock" style="margin-left: 5px;" />
            </template>
          </van-cell>
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
const labelGroup = ref<Map<string, { labels: Map<string, CVLabel>, active: boolean }>>(new Map())
const collapsedLabelGroup = ref() // 展开的标签组
let activeLabelGroup: string = null
const labelName = ref('')
const colorSpace = ref('defo')

const activeLabel = defineModel('activeLabel', {
  required: false,
  default: null,
  type: Object as () => CVLabel
})

defineExpose({ getLabel, searchLabel })

onMounted(() => {

  // let defLabels = Def_Object_Labels.map((label, idx) => {
  //   return { id: idx, name: label, color: MARK_COLORS.get(idx, colorSpace.value) }
  // })
  let defLabels = new Map()
  Def_Object_Labels.forEach((label, idx) => {
    defLabels.set(`${idx}`, { id: idx, name: label, color: MARK_COLORS.get(idx, colorSpace.value) })
  })

  let defaultKey = t('anno.labelDefault')

  labelGroup.value.set(defaultKey, { labels: defLabels, active: true })
  updateLabelGroup(defaultKey)
})

function onColorSpaceChanged(key: string) {
  colorSpace.value = key
  for (let item of labelGroup.value.keys()) {
    let labels = labelGroup.value.get(item).labels
    for (let key of labels.keys()) {
      labels.get(key).color = MARK_COLORS.get(labels.get(key).id, colorSpace.value)
    }
  }
}

function onLabelUpload(data: UploaderFileListItem) {
  var reader = new FileReader()
  reader.readAsText(data.file, 'utf-8')
  reader.onload = function (e) {
    var pointsTxt = e.target.result
    let arr = JSON.parse(pointsTxt as string)
    let labels = new Map()
    arr.forEach((it: any) => {
      labels.set(`${it.id}`, { id: it.id, name: it.name, color: MARK_COLORS.get(it.id, colorSpace.value) })
    })

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
  return labelGroup.value.get(activeLabelGroup).labels.get(`${index}`)
}

function searchLabel(keyword: string) {
  let result = []

  for (let item of labelGroup.value.get(activeLabelGroup).labels.values()) {
    if (item.name.indexOf(keyword) != -1) {
      result.push(item)
    }
  }

  return result
}

function deleteLabelGroup(key: string) {
  let isActive = labelGroup.value.get(key).active
  labelGroup.value.delete(key)
  if (isActive) {
    labelGroup.value.get(t('anno.labelDefault')).active = true
  }
}

</script>

<style lang="css" scoped>
.color-block {
  border: 2px solid;
  padding: 1px 10px;
  margin-right: 10px;
  border-radius: 5px;
}
</style>