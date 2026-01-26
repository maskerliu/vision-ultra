<template>
  <van-col>

    <van-cell-group inset>
      <van-cell center :title="$t('cvControl.IntergrateMode')">
        <template #right-icon>
          <van-radio-group v-model="visionStore.intergrateMode" direction="horizontal">
            <van-radio :name="idx" v-for="(mode, idx) in IntergrateModes">
              <van-icon class-prefix="iconfont" :name="mode.name" :style="{ color: mode.color }" />
            </van-radio>
          </van-radio-group>
        </template>
      </van-cell>
      <van-cell center :title="$t('cvControl.ModelEngine')">
        <template #right-icon>
          <van-radio-group v-model="visionStore.modelEngine" direction="horizontal">
            <van-radio :name="engine.value" v-for="engine in ModelEngines">
              <van-icon class-prefix="iconfont" :name="engine.name" :style="{ color: engine.color }" />
            </van-radio>
          </van-radio-group>
        </template>
      </van-cell>
    </van-cell-group>

    <!-- object detect & segment & face recognize-->
    <van-cell-group inset title="detect & segment & rec">
      <van-cell center :disabled="!visionStore.enableObjDetect">
        <template #title>
          <van-checkbox shape="square" v-model="visionStore.enableObjDetect">
            <van-icon class-prefix="iconfont" name="obj-rec" style="color: #2980b9;" />
            <span style="margin-left: 5px;">{{ $t('cvControl.ObjRec') }}</span>
          </van-checkbox>
        </template>
        <template #value>
          <van-popover v-model:show="showObjRecModels" :show-arrow="false" placement="bottom-end" overlay>
            <template #reference>
              {{ visionStore.objDetectModel.name }}
            </template>
            <van-col class="model-container">
              <van-cell-group inset v-for="key of ObjRecModelGrop.keys()">
                <template #title>
                  <van-icon class-prefix="iconfont" style="color: #2980b9;" :name="key" />
                  {{ $t(`cvControl.Obj${key}`) }}
                </template>
                <van-cell center clickable :title="$t(`cvControl.ObjModel.${model.name}`)" title-class="van-ellipsis"
                  @click="onObjRecModelChanged(model)" v-for="model in ObjRecModelGrop.get(key)">
                  <template #right-icon>
                    <span style="color: var(--van-cell-value-color)">{{ model.desc }}</span>
                  </template>
                </van-cell>
              </van-cell-group>
            </van-col>
          </van-popover>
        </template>
      </van-cell>

      <van-cell :disabled="!visionStore.enableFaceDetect">
        <template #title>
          <van-checkbox shape="square" v-model="visionStore.enableFaceDetect">
            <van-icon class-prefix="iconfont" name="face-rec" style="color: #e67e22;" />
            <span style="margin-left: 5px;">{{ $t('cvControl.FaceRec') }}</span>
          </van-checkbox>
        </template>
        <template #label>
          <van-row style="padding: 15px 0 5px 0;" v-show="visionStore.enableFaceDetect">
            <van-checkbox v-model="visionStore.drawEigen">
              <van-icon class-prefix="iconfont" name="eigen" />
            </van-checkbox>

            <van-checkbox v-model="visionStore.drawFaceMesh" style="margin-left: 15px;">
              <van-icon class-prefix="iconfont" name="mesh" />
            </van-checkbox>

            <van-checkbox v-model="visionStore.live2d" style="margin-left: 15px;">
              <van-icon class-prefix="iconfont" name="live2d" style="color: #FC427B;" />
            </van-checkbox>
          </van-row>
        </template>
        <template #right-icon>
          <span style="color: var(--van-cell-value-color)">face-mesh</span>
        </template>

      </van-cell>

      <van-cell center :disabled="!visionStore.enableImageGen">
        <template #title>
          <van-checkbox shape="square" v-model="visionStore.enableImageGen">
            <van-icon class-prefix="iconfont" name="gen-image" style="color: #16a085;" />
            <span style="margin-left: 5px;">{{ $t('cvControl.GenImage') }}</span>
          </van-checkbox>
        </template>
        <template #value>
          <van-popover v-model:show="showGanModels" :show-arrow="false" placement="bottom-end" overlay>
            <template #reference>
              {{ visionStore.ganModel.name }}
            </template>
            <van-col class="model-container">
              <van-cell center clickable :title="$t(`cvControl.GanModel.${model.name}`)" title-class="van-ellipsis"
                style="margin-left: 4px;" @click="onGanModelChanged(model)" v-for="model in GanModels">
                <template #right-icon>
                  <span style="color: var(--van-cell-value-color)">{{ model.desc }}</span>
                </template>
              </van-cell>
            </van-col>
          </van-popover>
        </template>
      </van-cell>

      <van-cell center :disabled="!visionStore.enableOCR">
        <template #title>
          <van-checkbox shape="square" v-model="visionStore.enableOCR">
            <van-icon class-prefix="iconfont" name="ocr" style="color: #1B9CFC;" />
            <span style="margin-left: 5px;">{{ $t('cvControl.OCR') }}</span>
          </van-checkbox>
        </template>
        <template #value>
          <van-popover v-model:show="showOCRModels" :show-arrow="false" placement="bottom-end" overlay>
            <template #reference>
              {{ visionStore.ocrModel.name }}
            </template>
            <van-col class="model-container">
              <van-cell center clickable :title="$t(`cvControl.GanModel.${model.name}`)" title-class="van-ellipsis"
                style="margin-left: 4px;" @click="onGanModelChanged(model)" v-for="model in GanModels">
                <template #right-icon>
                  <span style="color: var(--van-cell-value-color)">{{ model.desc }}</span>
                </template>
              </van-cell>
            </van-col>
          </van-popover>
        </template>
      </van-cell>

      <van-checkbox shape="square" v-model="visionStore.cvOptions.enableDetect" style="margin: 15px;">
        Opencv
      </van-checkbox>
      <van-radio-group direction="horizontal" :disabled="!visionStore.cvOptions.enableDetect"
        style="padding: 0 15px 15px 15px;" v-model="visionStore.cvOptions.detector[0]">
        <van-radio name="color">
          {{ $t('cvControl.ColorTrack') }}
        </van-radio>
        <van-radio name="contour">
          {{ $t('cvControl.ContourTrack') }}
        </van-radio>
        <van-radio name="bgSub">
          {{ $t('cvControl.BackgroundSub') }}
        </van-radio>
      </van-radio-group>

      <van-col v-if="visionStore.cvOptions.enableDetect">
        <slider-field label="threshold" v-model:sliderValue="visionStore.cvOptions.detector[1]" />
        <slider-field label="minArea" :max="31" :step="5" v-model:sliderValue="visionStore.cvOptions.detector[2]" />
      </van-col>

    </van-cell-group>

    <!-- opencv image process -->
    <van-cell-group inset>
      <template #title>
        <van-checkbox shape="square" v-model="visionStore.enableCVProcess">
          <van-icon class-prefix="iconfont" name="opencv" style="color: #27ae60;" />
          {{ $t('cvControl.ImgEnhance') }}
        </van-checkbox>
      </template>

      <van-field ref="colorMapAnchor" center clickable input-align="right" readonly :label="$t('cvControl.ColorMap')"
        style="scroll-margin-top: 50px;">
        <template #input>
          <van-popover v-model:show="showColorMaps" placement="bottom-end" :overlay="true" @open="checkPosition"
            style="width: 285px;">
            <template #reference>
              <div style="width: 180px;">
                {{ ColorMaps[visionStore.cvOptions.colorMap] }}
              </div>
            </template>
            <van-list style="height: 200px; overflow: hidden scroll;">
              <van-cell center clickable :title="val" v-for="(val, idx) in ColorMaps" :key="idx"
                @click="onColorMapChanged(idx)">
                <template #right-icon>
                  <img radius="5" class="colormaps" style="background-image: url('./static/colormaps.png')"
                    :style="{ backgroundPosition: `0px -${(idx - 1) * 10}px` }" v-if="idx != 0" />
                </template>
              </van-cell>
            </van-list>
          </van-popover>
        </template>
      </van-field>
      <van-field :label="$t('cvControl.Gray')" type="number" input-align="right">
        <template #input>
          <van-switch v-model="visionStore.cvOptions.isGray"></van-switch>
        </template>
      </van-field>
      <slider-field :label="$t('cvControl.Brightness')" :min="-1" :max="2" :step="0.1"
        v-model:sliderValue="visionStore.cvOptions.gamma" />

      <slider-field :label="$t('cvControl.Rotate')" :min="-180" :max="180" :step="15"
        v-model:sliderValue="visionStore.cvOptions.rotate" />
    </van-cell-group>

    <!-- blur -->
    <van-cell-group inset>
      <template #title>
        <van-checkbox shape="square" v-model="visionStore.cvOptions.enableBlur">
          {{ $t('cvControl.Blur') }}
        </van-checkbox>
      </template>

      <van-radio-group direction="horizontal" :disabled="!visionStore.cvOptions.enableBlur"
        v-model="visionStore.cvOptions.blur[0]" style="padding: 10px 15px;">
        <van-radio :name="idx" v-for="(type, idx) in BlurTypes">
          <van-icon class-prefix="iconfont" :name="`${type}-filter`" />
        </van-radio>
      </van-radio-group>

      <van-col v-if="visionStore.cvOptions.enableBlur">
        <slider-field label="sizeX" :max="31" v-model:sliderValue="visionStore.cvOptions.blur[1]"
          v-if="visionStore.cvOptions.blur[0] in [cvBlurType.gaussian, cvBlurType.avg]" />
        <slider-field label="sizeY" :max="31" v-model:sliderValue="visionStore.cvOptions.blur[2]"
          v-if="visionStore.cvOptions.blur[0] == cvBlurType.median" />
        <slider-field label="aperture" :max="31" v-model:sliderValue="visionStore.cvOptions.blur[3]"
          v-if="visionStore.cvOptions.blur[0] in [cvBlurType.gaussian, cvBlurType.avg]" />

        <van-col v-if="visionStore.cvOptions.blur[0] == cvBlurType.bilateral">
          <slider-field label="diameter" :max="5" v-model:sliderValue="visionStore.cvOptions.blur[4]" />
          <slider-field label="color" :min="10" :max="245" v-model:sliderValue="visionStore.cvOptions.blur[5]" />
          <slider-field label="space" :min="10" :max="255" v-model:sliderValue="visionStore.cvOptions.blur[6]" />
        </van-col>
      </van-col>

    </van-cell-group>

    <!-- sharpness -->
    <van-cell-group inset>
      <template #title>
        <van-checkbox shape="square" v-model="visionStore.cvOptions.enableSharpen">
          {{ $t('cvControl.Sharpness') }}
        </van-checkbox>
      </template>
      <van-radio-group direction="horizontal" :disabled="!visionStore.cvOptions.enableSharpen"
        style="padding: 10px 15px;" v-model="visionStore.cvOptions.sharpen[0]">
        <van-radio name="laplace"> laplacian </van-radio>
        <van-radio name="usm"> usm </van-radio>
      </van-radio-group>
      <van-col v-if="visionStore.cvOptions.sharpen[0] !== 'laplace' && visionStore.cvOptions.enableSharpen">
        <slider-field label="origin" :max="2" :step="0.1" v-model:sliderValue="visionStore.cvOptions.sharpen[1]" />
        <slider-field label="addon" :min="-2" :max="2" :step="0.1"
          v-model:sliderValue="visionStore.cvOptions.sharpen[2]" />
      </van-col>
    </van-cell-group>

    <van-col v-show="visionStore.cvOptions.isGray">
      <!-- morphological operation -->
      <van-cell-group inset>
        <van-cell center input-align="right" style="scroll-margin-top: 50px;">
          <template #title>
            <van-checkbox shape="square" v-model="visionStore.cvOptions.enableMorph">
              {{ $t(`cvControl.Morph`) }}
            </van-checkbox>
          </template>
          <template #value>
            <van-popover style="width: 140px;" overlay :show-arrow="false" placement="bottom-end"
              v-model:show="showMorphOpts" @open="checkPosition">
              <template #reference>
                <span style="font-size: var(--van-font-size-md)">
                  {{ $t(`cvControl.MorphOpt.${MorphOpts[visionStore.cvOptions.morph[0]]}`) }}
                </span>
              </template>
              <van-radio-group direction="vertical"
                style="height: 110px; padding: 10px 10px 0 10px; overflow: hidden scroll;"
                v-model="visionStore.cvOptions.morph[0]">
                <van-radio :name="idx" label-position="right" style="height: 1rem; margin-bottom: 15px;"
                  v-for="(morph, idx) in MorphOpts">
                  <span style="font-size: var(--van-font-size-md)">
                    {{ $t(`cvControl.MorphOpt.${morph}`) }}
                  </span>
                </van-radio>
              </van-radio-group>
            </van-popover>
          </template>
        </van-cell>

        <van-field center label="kernelX" input-align="right" type="number" v-model="visionStore.cvOptions.morph[1]" />
        <van-field center label="kernelY" input-align="right" type="number" v-model="visionStore.cvOptions.morph[2]" />
        <van-field center label="iterations" input-align="right" type="number"
          v-model="visionStore.cvOptions.morph[3]" />
      </van-cell-group>

      <!-- contrast -->
      <van-cell-group inset>
        <template #title>
          <van-checkbox shape="square" v-model="visionStore.cvOptions.enableContrast">
            {{ $t('cvControl.Contrast') }}
          </van-checkbox>
        </template>
        <van-radio-group direction="horizontal" :disabled="!visionStore.cvOptions.enableContrast"
          style="padding: 10px 15px;" v-model="visionStore.cvOptions.equalization[0]">
          <van-radio name="equalizeHist" style="font-size: 0.8rem;">
            {{ $t('cvControl.EqualizeHist') }}
          </van-radio>
          <van-radio name="clahe" style="font-size: 0.8rem;">
            {{ $t('cvControl.CLAHE') }}
          </van-radio>
        </van-radio-group>
        <van-col v-if="visionStore.cvOptions.equalization[0] == 'clahe' && visionStore.cvOptions.enableContrast">
          <slider-field label="clip" :max="31" v-model:sliderValue="visionStore.cvOptions.equalization[1]" />
          <slider-field label="sizeX" :max="31" v-model:sliderValue="visionStore.cvOptions.equalization[2]" />
          <slider-field label="sizeY" :max="31" v-model:sliderValue="visionStore.cvOptions.equalization[3]" />
        </van-col>

      </van-cell-group>

      <!-- filter -->
      <van-cell-group inset>
        <template #title>
          <van-checkbox shape="square" v-model="visionStore.cvOptions.enableFilter">
            {{ $t('cvControl.Filter') }}
          </van-checkbox>
        </template>
        <van-radio-group direction="horizontal" :disabled="!visionStore.cvOptions.enableFilter"
          style="padding: 10px 15px;" v-model="visionStore.cvOptions.filter[0]">
          <van-radio :name="idx" v-for="(item, idx) in FilterTypes">
            {{ $t(`cvControl.FilterType.${item}`) }}
          </van-radio>
        </van-radio-group>

        <van-col v-if="visionStore.cvOptions.enableFilter">
          <slider-field label="dX" :min="0" :max="3" :step="0.1"
            v-model:sliderValue="visionStore.cvOptions.filter[1]" />
          <slider-field label="dY" :min="0" :max="3" :step="0.1"
            v-model:sliderValue="visionStore.cvOptions.filter[2]" />
          <slider-field label="scale" :max="31" v-model:sliderValue="visionStore.cvOptions.filter[3]" />
          <slider-field label="size" :max="30" v-model:sliderValue="visionStore.cvOptions.filter[4]"
            v-if="visionStore.cvOptions.filter[0] !== cvFilterType.scharr" />
        </van-col>

      </van-cell-group>

      <van-cell-group inset :title="$t('cvControl.FeatExtract')">
        <van-cell center :title="$t('cvControl.Canny')" :label="'[ ' + visionStore.cvOptions.canny.toString() + ' ]'">
          <template #title>
            <van-checkbox shape="square" v-model="visionStore.cvOptions.enableCanny">
              <span>canny</span>
              <span class="param-desc">{{ $t('cvControl.CannyDesc') }}</span>
            </van-checkbox>
          </template>
          <template #right-icon>
            <van-slider range :max="160" :min="60" bar-height="4px" button-size="1.2rem" style="width: 60%;"
              :disabled="!visionStore.cvOptions.enableCanny" v-model="visionStore.cvOptions.canny">
            </van-slider>
          </template>
        </van-cell>
        <van-cell center :title="$t('cvControl.HoughLine')">
          <template #right-icon>
            <van-slider bar-height="4px" button-size="1.2rem" style="width: 60%;">
            </van-slider>
          </template>
        </van-cell>
        <van-cell center :title="$t('cvControl.HoughCircle')">
          <template #right-icon>
            <van-slider bar-height="4px" button-size="1.2rem" style="width: 60%;">
            </van-slider>
          </template>
        </van-cell>
      </van-cell-group>
    </van-col>
  </van-col>
</template>
<script lang="ts" setup>

import { onMounted, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { cvBlurType, cvFilterType, ModelEngine, ModelInfo, ModelType } from '../../../common'
import { VisionStore } from '../../store'
import SliderField from '../components/SliderField.vue'

const i18n = useI18n()

const IntergrateModes = [
  { name: 'wasm', color: '#8e44ad' },
  { name: 'nodejs', color: '#2ecc71' },
]
const ModelEngines = [
  { name: 'onnx', color: '##95a5a6', value: ModelEngine.onnx },
  { name: 'tensorflow', color: '#e67e22', value: ModelEngine.tensorflow }
]

const showObjRecModels = ref(false)
const ObjRecModelGrop = new Map<string, Array<ModelInfo>>()
const DetectModels = [
  { name: 'yolov8n', desc: '3.2M', type: ModelType.Detect },
  { name: 'yolov10n', desc: '2.3M', type: ModelType.Detect },
  { name: 'yolov10s', desc: '7.2M', type: ModelType.Detect },
  { name: 'yolo11n', desc: '2.6M', type: ModelType.Detect },
  { name: 'yolo11s', desc: '9.4M', type: ModelType.Detect },
  { name: 'mobilenet', desc: '', type: ModelType.Detect }
]
const SegmentModels = [
  { name: 'deeplab-ade', desc: 'class: 150', type: ModelType.Segment },
  { name: 'deeplab-cityspace', desc: 'class: 20', type: ModelType.Segment },
  { name: 'yolo11n-seg', desc: 'class: 80', type: ModelType.Segment },
  { name: 'yolo11s-seg', desc: '9.4M', type: ModelType.Segment },
  { name: 'yolo11m-seg', desc: '20.1M', type: ModelType.Segment },
  { name: 'yolo26s-seg', desc: '10.4', type: ModelType.Segment },
  { name: 'unet', desc: '', type: ModelType.Segment },
  { name: 'sam', desc: '38.9M', type: ModelType.Segment }
]

const showGanModels = ref(false)
const GanModels = [
  { name: 'animeGANv3', desc: '1.2M', type: ModelType.GenImage },
  { name: 'anime_Kpop', desc: '1.2M', type: ModelType.GenImage },
  { name: 'anime_Disney', desc: '2.0M', type: ModelType.GenImage },
  { name: 'anime_OilPaint', desc: '4.6M', type: ModelType.GenImage },
  { name: 'anime_Ghibli', desc: '12.4M', type: ModelType.GenImage },
]

const showOCRModels = ref(false)

const showMorphOpts = ref(false)
const MorphOpts = ['Erode', 'Dilate', 'Open', 'Close', 'Gradient', 'TopHat', 'BlackHat']

const showColorMaps = ref(false)
const ColorMaps = [
  'NONE', 'AUTUMN', 'BONE', 'JET', 'WINTER', 'RAINBOW', 'OCEAN', 'SUMMER',
  'SPRING', 'COOL', 'HSV', 'PINK', 'HOT', 'PARULA', 'MAGMA',
  'INFERNO', 'PLASMA', 'VIRIDIS', 'CIVIDIS', 'TWILIGHT', 'TWILIGHT_SHIFTED', 'TURBO', 'DEEPGREEN'
]

const BlurTypes = ['Gaussian', 'Avg', 'Median', 'Bilateral']

const FilterTypes = ['Sobel', 'Laplace', 'Scharr']

const visionStore = VisionStore()
const isWeb = window.isWeb

const colorMapAnchor = useTemplateRef('colorMapAnchor')
const modelName = ref<string>()

onMounted(() => {

  ObjRecModelGrop.set('Detect', DetectModels)
  ObjRecModelGrop.set('Segment', SegmentModels)
})

function checkPosition() {
  colorMapAnchor.value.$el.scrollIntoView({
    behavior: 'smooth',
  })
}

function onObjRecModelChanged(model: ModelInfo) {
  visionStore.objDetectModel = Object.assign(model, { engine: visionStore.modelEngine },)
  showObjRecModels.value = false
}

function onGanModelChanged(model: ModelInfo) {
  visionStore.ganModel = model
  showGanModels.value = false
}


function onColorMapChanged(idx: number) {
  visionStore.cvOptions.colorMap = idx
  showColorMaps.value = false
}

async function onModelUpload(data: any) {
  // var reader = new FileReader()
  // reader.readAsArrayBuffer(data.file)
  // reader.onload = async function () {
  //   let arrayBuffer = reader.result as ArrayBuffer
  //   let model = await onnx.createModelCpu(arrayBuffer)
  //   console.log(model)
  // }
}

</script>
<style>
.colormaps {
  width: 128px;
  height: 10px;
  background-size: 100% 2200%;
  background-image: './static/colormaps.png';
}

.model-container {
  width: 288px;
  height: 260px;
  overflow: hidden scroll;
  padding-top: 10px;
  padding-left: 4px;
  background-color: var(--van-gray-1);
}
</style>