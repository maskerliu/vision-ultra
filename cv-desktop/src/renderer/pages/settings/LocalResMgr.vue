<template>
  <van-cell-group inset :title="$t('settings.resources.title')">
    <van-cell :title="$t('settings.resources.manage')">
      <template #right-icon>
        <van-uploader multiple accept=".onnx,.json,.tflite,.bin,.task" :after-read="afterRead">
          <van-button plain size="small">{{ $t('common.upload') }}</van-button>
        </van-uploader>
      </template>
    </van-cell>


    <van-grid style="max-height: 200px; overflow: hidden scroll;">

      <van-grid-item v-for="(model, idx) in models" :key="idx">
        <div class="van-ellipsis" style="color: var(--van-text-color); max-width: 10rem; z-index: 1;">
          {{ $t(`cvControl.ObjModel.${model.name}`) }}
        </div>
        <div style="color: var(--van-text-color-2); z-index: 1; height: 1rem;">{{ model.desc }}</div>
        <div class="van-hairline--top"></div>
        <van-icon class-prefix="iconfont" :name="model.type == ModelType.Segment ? 'Segment' : 'Detect'"
          style="position: absolute; font-size: 3rem; color: var(--van-text-color-3); z-index: 0;" />
        <van-row style="width: 100%; margin-top: 15px;" justify="center">
          <van-button type="primary" size="mini" plain hairline style="width: 40%;">
            <van-icon class-prefix="iconfont" name="warning" />
          </van-button>
          <van-button type="danger" size="mini" plain hairline style="width: 40%;" @click="onDelete(idx)">
            <van-icon class-prefix="iconfont" name="delete" />
          </van-button>
        </van-row>

      </van-grid-item>
    </van-grid>

    <van-popup :show="showModelInfo" style="padding: 10px 5px;">
      <van-field label="name" :value="uploadModel.name"></van-field>
      <van-cell :value="file" v-for="file in uploadModel.files"></van-cell>
      <van-button block plain hairline type="primary" size="mini">{{ $t('common.done') }}</van-button>
    </van-popup>

  </van-cell-group>
</template>
<script lang="ts" setup>
import { UploaderFileListItem } from 'vant'
import { onMounted, ref } from 'vue'
import { ModelInfo, ModelType } from '../../../common'

const models = ref<Array<ModelInfo>>([])
const showModelInfo = ref(false)
const fileList = ref([])

const uploadModel = ref<ModelInfo>({
  name: null,
  type: ModelType.Unknown,
  desc: null,
  files: []
})

onMounted(() => {
  models.value = [
    { name: 'yolov8n', desc: '3.2M', type: ModelType.Detect },
    { name: 'yolov10n', desc: '2.3M', type: ModelType.Detect },
    { name: 'yolov10s', desc: '7.2M', type: ModelType.Detect },
    { name: 'yolo11n', desc: '2.6M', type: ModelType.Detect },
    { name: 'yolo11s', desc: '9.4M', type: ModelType.Detect },
    { name: 'mobilenet', desc: '', type: ModelType.Detect },
    { name: 'deeplab-ade', desc: 'class: 150', type: ModelType.Segment },
    { name: 'deeplab-cityspace', desc: 'class: 20', type: ModelType.Segment },
    { name: 'yolo11n-seg', desc: 'class: 80', type: ModelType.Segment },
    { name: 'yolo11s-seg', desc: '9.4M', type: ModelType.Segment },
    { name: 'yolo11m-seg', desc: '20.1M', type: ModelType.Segment },
    { name: 'yolo26s-seg', desc: '10.4', type: ModelType.Segment },
    { name: 'unet', desc: '', type: ModelType.Segment },
    { name: 'sam', desc: '38.9M', type: ModelType.Segment },
    { name: 'animeGANv3', desc: '1.2M', type: ModelType.GenImage },
    { name: 'anime_Kpop', desc: '1.2M', type: ModelType.GenImage },
    { name: 'anime_Disney', desc: '2.0M', type: ModelType.GenImage },
    { name: 'anime_OilPaint', desc: '4.6M', type: ModelType.GenImage },
    { name: 'anime_Ghibli', desc: '12.4M', type: ModelType.GenImage },
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