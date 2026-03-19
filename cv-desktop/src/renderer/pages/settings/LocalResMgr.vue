<template>
  <van-cell-group inset :title="$t('settings.resources.title')">
    <van-cell :title="$t('settings.resources.manage')" :border="false">
      <template #right-icon>
        <van-button type="primary" size="mini" plain hairline @click="onRefresh">
          <van-icon class-prefix="iconfont" name="refresh" />
        </van-button>
      </template>
    </van-cell>


    <van-grid style="max-height: 200px; overflow: hidden scroll;">

      <van-grid-item v-for="(model, idx) in visionStore.models" :key="idx" style="padding: 0;">
        <div class="van-ellipsis" style="color: var(--van-text-color); max-width: 10rem; z-index: 1;">
          {{ $t(`cvControl.model.${model.name}`) }}
        </div>
        <div style="color: var(--van-text-color-2); z-index: 1; height: 1rem;">{{ model.desc }}</div>
        <div class="van-hairline--top"></div>
        <van-icon class-prefix="iconfont" :name="`${model.type}`"
          style="position: absolute; font-size: 3rem; color: var(--van-text-color-3); z-index: 0;" />
        <van-row style="width: 100%; margin-top: 15px;" justify="center">
          <van-button type="primary" size="mini" plain hairline
            @click="showModelInfo = true; curModel = Object.assign(curModel, model); console.log(curModel)">
            <van-icon class-prefix="iconfont" name="warning" />
          </van-button>

          <van-button type="danger" size="mini" plain hairline style="margin-left: 15px;"
            @click="visionStore.deleteModel(model._id)">
            <van-icon class-prefix="iconfont" name="delete" />
          </van-button>
        </van-row>
      </van-grid-item>
    </van-grid>

    <van-popup v-model:show="showModelInfo" style="padding: 10px 5px; width: 60%;">
      <van-field label="name" label-align="left" input-align="right" :model-value="curModel.name" readonly />
      <van-field label="path" label-align="left" input-align="right"
        :model-value="commonStore.bizConfig.modelPath + '\\' + curModel.name" readonly />
      <van-field label="type" label-align="left" readonly>
        <template #right-icon>
          <van-popover v-model:show="showModelType" placement="left-start"
            style="width: 200px; height: 160px; overflow: hidden scroll;">
            <template #reference>
              <van-icon class-prefix="iconfont" :name="`${curModel.type}`" />
            </template>
            <van-cell clickable v-for="type in modelTypes" :title="type.text"
              @click="showModelType = false; curModel.type = type.value;">
              <template #icon>
                <van-icon class-prefix="iconfont" :name="`${type.value}`" style="margin-right: 10px;" />
              </template>
              <template #right-icon>
                <van-icon v-if="type.value == curModel.type" class-prefix="iconfont" name="success" />
              </template>
            </van-cell>
          </van-popover>
        </template>
      </van-field>
      <van-field label="desc" label-align="left" input-align="right" v-model="curModel.desc" />
      <van-field label="lang" label-align="left" input-align="right" v-model="curModel.lang"
        v-if="curModel.type == ModelType.ocr" />

      <van-field label="external" label-align="left" input-align="right" v-model="curModel.external" />

      <van-button block plain type="primary" size="small" @click="onSaveModelInfo">{{ $t('common.done') }}</van-button>
    </van-popup>

  </van-cell-group>
</template>
<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { ModelInfo, ModelType } from '../../../shared'
import { CommonStore, VisionStore } from '../../store'

const commonStore = CommonStore()
const visionStore = VisionStore()

const showModelInfo = ref(false)
const showModelType = ref(false)
const curModel = ref<Partial<ModelInfo>>({
  name: '',
  type: ModelType.unknown,
  desc: '',
  lang: '',
  external: '',
})
const lang = ref<string>()

const modelTypes = [
  { text: '分类', value: ModelType.classify },
  { text: '目标检测', value: ModelType.detect, },
  { text: '目标分割', value: ModelType.segment, },
  { text: '姿态识别', value: ModelType.pose, },
  { text: '人脸检测', value: ModelType.face, },
  { text: '图生图', value: ModelType.genImage, },
  { text: '风格迁移-Style', value: ModelType.style, },
  { text: '风格迁移-Tranform', value: ModelType.transform, },
  { text: 'OCR', value: ModelType.ocr, },
]

onMounted(async () => {
  await visionStore.getAllModels()
})

async function onRefresh() {
  visionStore.models = []
  await visionStore.getAllModels()
}

async function onSaveModelInfo() {
  console.log(curModel.value)
  await visionStore.saveModelInfo(Object.assign(curModel.value, lang.value))
  showModelInfo.value = false
}

</script>
<style scoped></style>