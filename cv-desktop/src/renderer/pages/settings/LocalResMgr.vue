<template>
  <van-cell-group inset :title="$t('settings.resources.title')">
    <van-cell :title="$t('settings.resources.manage')" :border="false">
      <template #right-icon>
        <van-uploader multiple accept=".onnx,.json,.tflite,.bin,.task" :after-read="afterRead">
          <van-button plain size="small">{{ $t('common.upload') }}</van-button>
        </van-uploader>
      </template>
    </van-cell>


    <van-grid style="max-height: 200px; overflow: hidden scroll;">

      <van-grid-item v-for="(model, idx) in models" :key="idx">
        <div class="van-ellipsis" style="color: var(--van-text-color); max-width: 10rem; z-index: 1;">
          {{ $t(`cvControl.model.${model.name}`) }}
        </div>
        <div style="color: var(--van-text-color-2); z-index: 1; height: 1rem;">{{ model.desc }}</div>
        <div class="van-hairline--top"></div>
        <van-icon class-prefix="iconfont" :name="`${model.type}`"
          style="position: absolute; font-size: 3rem; color: var(--van-text-color-3); z-index: 0;" />
        <van-row style="width: 100%; margin-top: 15px;" justify="center">
          <van-button type="primary" size="mini" plain hairline @click="showModelInfo = true; curModel = model;">
            <van-icon class-prefix="iconfont" name="warning" />
          </van-button>

          <van-button type="danger" size="mini" plain hairline style="margin-right: 5px;" @click="onDelete(idx)">
            <van-icon class-prefix="iconfont" name="delete" />
          </van-button>
        </van-row>

      </van-grid-item>
    </van-grid>

    <van-popup v-model:show="showModelInfo" style="padding: 10px 5px; width: 80%;">
      <van-field label="name" label-align="left" input-align="right" :model-value="curModel?.name"></van-field>
      <van-field label="path" label-align="left" input-align="right" readonly :model-value="`$curModel.path}`" />
      <van-field label="type" label-align="left" readonly>
        <template #right-icon>
          <van-popover v-model:show="showModelType" placement="left-start"
            style="width: 180px; height: 160px; overflow: hidden scroll;">
            <template #reference>
              <van-icon class-prefix="iconfont" :name="curModel.type as string" />
            </template>
            <van-cell clickable v-for="type in modelTypes" :title="type.text" @click="showModelType = false">
              <template #icon>
                <van-icon class-prefix="iconfont" :name="type.value as string" style="margin-right: 10px;" />
              </template>
              <template #right-icon>
                <van-icon v-if="type.value == curModel.type" class-prefix="iconfont" name="success"
                  style="margin-right: 10px;" />
              </template>
            </van-cell>
          </van-popover>
        </template>
      </van-field>
      <van-button block plain type="primary" size="small">{{ $t('common.done') }}</van-button>
    </van-popup>

  </van-cell-group>
</template>
<script lang="ts" setup>
import { UploaderFileListItem } from 'vant'
import { onMounted, ref } from 'vue'
import { CommonApi, ModelInfo, ModelType } from '../../../shared'

const models = ref<Array<Partial<ModelInfo>>>([])
const showModelInfo = ref(false)
const showModelType = ref(false)
const fileList = ref([])
const curModel = ref<Partial<ModelInfo>>({
  name: null,
  type: ModelType.unknown,
  desc: null,
})

const modelTypes = [
  { text: '分类', value: ModelType.classify },
  { text: '目标检测', value: ModelType.detect, icon: 'detect' },
  { text: '目标分割', value: ModelType.segment, icon: 'segment' },
  { text: '姿态识别', value: ModelType.pose, icon: 'pose' },
  { text: '人脸检测', value: ModelType.face, icon: 'face-detect' },
  { text: '风格迁移', value: ModelType.genImage, icon: 'gen-image' },
  { text: 'OCR', value: ModelType.ocr, icon: 'ocr' },
]

const uploadModel = ref<Partial<ModelInfo>>({
  name: null,
  type: ModelType.unknown,
  desc: null,
  files: []
})

onMounted(async () => {

  const res = await CommonApi.getLocalModels()
  console.log(res)

  models.value = [
    { name: 'yolov8s', desc: '3.2M', type: ModelType.detect },
    { name: 'yolov10s', desc: '7.2M', type: ModelType.detect },
    { name: 'yolo11s', desc: '9.4M', type: ModelType.detect },
    { name: 'mobilenet', desc: '', type: ModelType.detect },
    { name: 'deeplab-ade', desc: 'class: 150', type: ModelType.segment },
    { name: 'deeplab-cityspace', desc: 'class: 20', type: ModelType.segment },
    { name: 'yolo11s-seg', desc: '9.4M', type: ModelType.segment },
    { name: 'yolo26s-seg', desc: '10.4', type: ModelType.transform },
    { name: 'unet', desc: '', type: ModelType.pose },
    { name: 'sam', desc: '38.9M', type: ModelType.segment },
    { name: 'animeGANv2', desc: '1.2M', type: ModelType.obb },
    { name: 'animeGANv3-TinyCute', desc: '1.2M', type: ModelType.genImage },
    { name: 'animeGANv3-FacePaint', desc: '2.0M', type: ModelType.ocr },
    { name: 'animeGANv3-Shinkai', desc: '4.6M', type: ModelType.classify },
    { name: 'animeGANv3-JPface', desc: '12.4M', type: ModelType.style },
  ]
})

function afterRead(data: UploaderFileListItem | UploaderFileListItem[]) {
  if (Array.isArray(data)) {
    data.forEach(it => {
      console.log(it.file)
    })
    uploadModel.value.files = data.map(it => it.file.name)
  } else {
    console.log(data.file)
    uploadModel.value.files = [data.file.name]
  }
  showModelInfo.value = true
}

function onDelete(idx: number) {
  models.value.splice(idx, 1)
}

</script>
<style scoped></style>