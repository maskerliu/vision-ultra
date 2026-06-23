<template>
  <van-col>
    <van-cell-group inset>
      <van-cell center :title="$t('cvControl.intergrateMode')">
        <template #right-icon>
          <van-radio-group v-model="visionStore.intergrateMode" direction="horizontal">
            <van-radio :name="idx" v-for="(mode, idx) in IntergrateModes">
              <van-icon class-prefix="iconfont" :name="mode.name" :style="{ color: mode.color }" />
            </van-radio>
          </van-radio-group>
        </template>
      </van-cell>
      <van-cell center :title="$t('cvControl.modelEngine')">
        <template #right-icon>
          <van-radio-group v-model="visionStore.modelEngine" direction="horizontal">
            <van-radio :name="engine.value" v-for="engine in ModelEngines">
              <van-icon class-prefix="iconfont" :name="engine.name" :style="{ color: engine.color }" />
            </van-radio>
          </van-radio-group>
        </template>
      </van-cell>
    </van-cell-group>

    <!-- object detect & segment, face recognize, style transfer, animeGAN-->
    <van-cell-group inset title="Model Zoo">
      <van-cell center>
        <template #title>
          <van-row>
            <van-checkbox shape="square" v-model="visionStore.enableObjDetect" style="margin-right: 7px;">
            </van-checkbox>

            <van-radio-group :disabled="!visionStore.enableObjDetect" v-model="visionStore.objDetectModel.type"
              direction="horizontal" @change="onObjRecTypeChanged">
              <van-radio :name="key" v-for="key in ObjRecGroup">
                <van-icon class-prefix="iconfont" style="color: #2980b9;" :name="key" />
                <!-- {{ $t(`cvControl.obj.${key}`) }} -->
              </van-radio>
            </van-radio-group>
          </van-row>
        </template>
        <template #value>
          <pop-selector :models="visionStore.getModels(visionStore.objDetectModel.type)"
            :label="visionStore.objDetectModel.name" @on-selected="changeModel" />
        </template>
      </van-cell>

      <van-cell center :disabled="!visionStore.enableFaceDetect">
        <template #title>
          <van-checkbox shape="square" v-model="visionStore.enableFaceDetect">
            <van-icon class-prefix="iconfont" name="face-detect" style="color: #e67e22;" />
            <span style="margin-left: 5px;">{{ $t('cvControl.faceDetect') }}</span>
          </van-checkbox>
        </template>
        <template #label>
          <van-row style="padding: 15px 0 5px 0;" v-show="visionStore.enableFaceDetect">
            <van-checkbox v-model="visionStore.drawEigen">
              <van-icon class-prefix="iconfont" name="face-eigen" />
            </van-checkbox>

            <van-checkbox v-model="visionStore.drawFaceMesh" style="margin-left: 15px;">
              <van-icon class-prefix="iconfont" name="face-mesh" />
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

      <van-cell center :disabled="!visionStore.enableOCR">
        <template #title>
          <van-checkbox shape="square" v-model="visionStore.enableOCR">
            <van-icon class-prefix="iconfont" name="ocr" style="color: #1B9CFC;" />
            <span style="margin-left: 5px;">{{ $t('cvControl.ocr') }}</span>
          </van-checkbox>
        </template>
        <template #value>
          <pop-selector :models="visionStore.getModels(ModelType.ocr)" :label="visionStore.ocrModel.name" height="140px"
            @on-selected="changeModel" />
        </template>
      </van-cell>

      <van-cell center :disabled="!visionStore.enableAnime">
        <template #title>
          <van-checkbox shape="square" v-model="visionStore.enableAnime">
            <van-icon class-prefix="iconfont" name="gen-image" style="color: #16a085;" />
            <span style="margin-left: 5px;">{{ $t('cvControl.animeGAN') }}</span>
          </van-checkbox>
        </template>
        <template #value>
          <pop-selector :models="visionStore.getModels(ModelType.genImage)" :label="visionStore.animeModel.name"
            @on-selected="changeModel" />
        </template>
      </van-cell>

      <van-cell center :disabled="!visionStore.enableStyleTrans">
        <template #title>
          <van-checkbox shape="square" v-model="visionStore.enableStyleTrans">
            <van-icon class-prefix="iconfont" name="style-transform" style="color: #6D214F;" />
            <span style="margin-left: 5px;">{{ $t('cvControl.styleTrans') }}</span>
          </van-checkbox>
        </template>

        <template #label>
          <van-col v-if="visionStore.enableStyleTrans">
            <van-cell title="style">
              <template #value>
                <pop-selector :models="visionStore.getModels(ModelType.style)" :label="visionStore.styleModel.name" />
              </template>
            </van-cell>
            <van-cell title="transfer">
              <template #value>
                <pop-selector :models="visionStore.getModels(ModelType.transform)"
                  :label="visionStore.transModel.name" />
              </template>
            </van-cell>

            <van-cell title="style image">
              <template #value>
                <van-uploader v-model="styleFile" preview-size="60" max-count="1" :after-read="onStyleFileUpload" />
              </template>
            </van-cell>
            <slider-field label="content size" v-model:sliderValue="visionStore.styleTransParams[0]" />
            <slider-field label="style size" v-model:sliderValue="visionStore.styleTransParams[1]" />
            <slider-field label="strength" v-model:sliderValue="visionStore.styleTransParams[2]" />
          </van-col>
        </template>
      </van-cell>

      <van-checkbox shape="square" v-model="visionStore.cvOpts.enableDetect" style="margin: 15px;">
        Opencv
      </van-checkbox>
      <van-radio-group direction="horizontal" :disabled="!visionStore.cvOpts.enableDetect"
        style="padding: 0 15px 15px 15px;" v-model="visionStore.cvOpts.detector[0]">
        <van-radio name="color">
          {{ $t('cvControl.colorTrack') }}
        </van-radio>
        <van-radio name="contour">
          {{ $t('cvControl.contourTrack') }}
        </van-radio>
        <van-radio name="bgSub">
          {{ $t('cvControl.backgroundSub') }}
        </van-radio>
      </van-radio-group>

      <van-col v-if="visionStore.cvOpts.enableDetect">
        <slider-field label="threshold" v-model:sliderValue="visionStore.cvOpts.detector[1]" />
        <slider-field label="minArea" :max="31" :step="5" v-model:sliderValue="visionStore.cvOpts.detector[2]" />
      </van-col>

    </van-cell-group>

    <!-- opencv image process -->
    <van-cell-group inset>
      <template #title>
        <van-checkbox shape="square" v-model="visionStore.enableCV">
          <van-icon class-prefix="iconfont" name="opencv" style="color: #27ae60;" />
          {{ $t('cvControl.imgEnhance') }}
        </van-checkbox>
      </template>

      <van-field ref="colorMapAnchor" center clickable input-align="right" readonly :label="$t('cvControl.colorMap')"
        style="scroll-margin-top: 50px;">
        <template #input>
          <van-popover v-model:show="showColorMaps" placement="bottom-end" :overlay="true" @open="checkPosition"
            style="width: 285px;">
            <template #reference>
              <div style="width: 180px;">
                {{ ColorMaps[visionStore.cvOpts.colorMap] }}
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
      <van-field :label="$t('cvControl.gray')" type="number" input-align="right">
        <template #input>
          <van-switch v-model="visionStore.cvOpts.isGray"></van-switch>
        </template>
      </van-field>
      <slider-field :label="$t('cvControl.brightness')" :min="-1" :max="2" :step="0.1"
        v-model:sliderValue="visionStore.cvOpts.gamma" />

      <slider-field :label="$t('cvControl.rotate')" :min="-180" :max="180" :step="15"
        v-model:sliderValue="visionStore.cvOpts.rotate" />
    </van-cell-group>

    <!-- blur -->
    <van-cell-group inset>
      <template #title>
        <van-checkbox shape="square" v-model="visionStore.cvOpts.enableBlur">
          {{ $t('cvControl.blur') }}
        </van-checkbox>
      </template>

      <van-radio-group direction="horizontal" :disabled="!visionStore.cvOpts.enableBlur"
        v-model="visionStore.cvOpts.blur[0]" style="padding: 10px 15px;">
        <van-radio :name="idx" v-for="(type, idx) in BlurTypes">
          <van-icon class-prefix="iconfont" :name="`${type}-filter`" />
        </van-radio>
      </van-radio-group>

      <van-col v-if="visionStore.cvOpts.enableBlur">
        <slider-field label="sizeX" :max="31" v-model:sliderValue="visionStore.cvOpts.blur[1]" v-if="isGaussianOrAvg" />
        <slider-field label="sizeY" :max="31" v-model:sliderValue="visionStore.cvOpts.blur[2]"
          v-if="visionStore.cvOpts.blur[0] == cvBlurType.median" />
        <slider-field label="aperture" :max="31" v-model:sliderValue="visionStore.cvOpts.blur[3]"
          v-if="isGaussianOrAvg" />

        <van-col v-if="visionStore.cvOpts.blur[0] == cvBlurType.bilateral">
          <slider-field label="diameter" :max="5" v-model:sliderValue="visionStore.cvOpts.blur[4]" />
          <slider-field label="color" :min="10" :max="245" v-model:sliderValue="visionStore.cvOpts.blur[5]" />
          <slider-field label="space" :min="10" :max="255" v-model:sliderValue="visionStore.cvOpts.blur[6]" />
        </van-col>
      </van-col>

    </van-cell-group>

    <!-- sharpness -->
    <van-cell-group inset>
      <template #title>
        <van-checkbox shape="square" v-model="visionStore.cvOpts.enableSharpen">
          {{ $t('cvControl.sharpness') }}
        </van-checkbox>
      </template>
      <van-radio-group direction="horizontal" :disabled="!visionStore.cvOpts.enableSharpen" style="padding: 10px 15px;"
        v-model="visionStore.cvOpts.sharpen[0]">
        <van-radio name="laplace"> laplacian </van-radio>
        <van-radio name="usm"> usm </van-radio>
      </van-radio-group>
      <van-col v-if="visionStore.cvOpts.sharpen[0] !== 'laplace' && visionStore.cvOpts.enableSharpen">
        <slider-field label="origin" :max="2" :step="0.1" v-model:sliderValue="visionStore.cvOpts.sharpen[1]" />
        <slider-field label="addon" :min="-2" :max="2" :step="0.1"
          v-model:sliderValue="visionStore.cvOpts.sharpen[2]" />
      </van-col>
    </van-cell-group>

    <van-col v-show="visionStore.cvOpts.isGray">
      <!-- morphological operation -->
      <van-cell-group inset>
        <van-cell center input-align="right" style="scroll-margin-top: 50px;">
          <template #title>
            <van-checkbox shape="square" v-model="visionStore.cvOpts.enableMorph">
              {{ $t(`cvControl.morph`) }}
            </van-checkbox>
          </template>
          <template #value>
            <van-popover style="width: 140px;" overlay :show-arrow="false" placement="bottom-end"
              v-model:show="showMorphOpts" @open="checkPosition">
              <template #reference>
                <span style="font-size: var(--van-font-size-md)">
                  {{ $t(`cvControl.morphOpt.${MorphOpts[visionStore.cvOpts.morph[0]]}`) }}
                </span>
              </template>
              <van-radio-group direction="vertical"
                style="height: 110px; padding: 10px 10px 0 10px; overflow: hidden scroll;"
                v-model="visionStore.cvOpts.morph[0]">
                <van-radio :name="idx" label-position="right" style="height: 1rem; margin-bottom: 15px;"
                  v-for="(morph, idx) in MorphOpts">
                  <span style="font-size: var(--van-font-size-md)">
                    {{ $t(`cvControl.morphOpt.${morph}`) }}
                  </span>
                </van-radio>
              </van-radio-group>
            </van-popover>
          </template>
        </van-cell>

        <van-field center label="kernelX" input-align="right" type="number" v-model="visionStore.cvOpts.morph[1]" />
        <van-field center label="kernelY" input-align="right" type="number" v-model="visionStore.cvOpts.morph[2]" />
        <van-field center label="iterations" input-align="right" type="number" v-model="visionStore.cvOpts.morph[3]" />
      </van-cell-group>

      <!-- contrast -->
      <van-cell-group inset>
        <template #title>
          <van-checkbox shape="square" v-model="visionStore.cvOpts.enableContrast">
            {{ $t('cvControl.contrast') }}
          </van-checkbox>
        </template>
        <van-radio-group direction="horizontal" :disabled="!visionStore.cvOpts.enableContrast"
          style="padding: 10px 15px;" v-model="visionStore.cvOpts.equalization[0]">
          <van-radio name="equalizeHist" style="font-size: 0.8rem;">
            {{ $t('cvControl.equalizeHist') }}
          </van-radio>
          <van-radio name="clahe" style="font-size: 0.8rem;">
            {{ $t('cvControl.clahe') }}
          </van-radio>
        </van-radio-group>
        <van-col v-if="visionStore.cvOpts.equalization[0] == 'clahe' && visionStore.cvOpts.enableContrast">
          <slider-field label="clip" :max="31" v-model:sliderValue="visionStore.cvOpts.equalization[1]" />
          <slider-field label="sizeX" :max="31" v-model:sliderValue="visionStore.cvOpts.equalization[2]" />
          <slider-field label="sizeY" :max="31" v-model:sliderValue="visionStore.cvOpts.equalization[3]" />
        </van-col>

      </van-cell-group>

      <!-- filter -->
      <van-cell-group inset>
        <template #title>
          <van-checkbox shape="square" v-model="visionStore.cvOpts.enableFilter">
            {{ $t('cvControl.filter') }}
          </van-checkbox>
        </template>
        <van-radio-group direction="horizontal" :disabled="!visionStore.cvOpts.enableFilter" style="padding: 10px 15px;"
          v-model="visionStore.cvOpts.filter[0]">
          <van-radio :name="idx" v-for="(item, idx) in FilterTypes">
            {{ $t(`cvControl.filterType.${item}`) }}
          </van-radio>
        </van-radio-group>

        <van-col v-if="visionStore.cvOpts.enableFilter">
          <slider-field label="dX" :min="0" :max="3" :step="0.1" v-model:sliderValue="visionStore.cvOpts.filter[1]" />
          <slider-field label="dY" :min="0" :max="3" :step="0.1" v-model:sliderValue="visionStore.cvOpts.filter[2]" />
          <slider-field label="scale" :max="31" v-model:sliderValue="visionStore.cvOpts.filter[3]" />
          <slider-field label="size" :max="30" v-model:sliderValue="visionStore.cvOpts.filter[4]"
            v-if="visionStore.cvOpts.filter[0] !== cvFilterType.scharr" />
        </van-col>

      </van-cell-group>

      <van-cell-group inset :title="$t('cvControl.featExtract')">
        <van-cell center :title="$t('cvControl.canny')" :label="'[ ' + visionStore.cvOpts.canny.toString() + ' ]'">
          <template #title>
            <van-checkbox shape="square" v-model="visionStore.cvOpts.enableCanny">
              <span>canny</span>
              <span class="param-desc">{{ $t('cvControl.cannyDesc') }}</span>
            </van-checkbox>
          </template>
          <template #right-icon>
            <van-slider range :max="160" :min="60" bar-height="4px" button-size="1.2rem" style="width: 60%;"
              :disabled="!visionStore.cvOpts.enableCanny" v-model="visionStore.cvOpts.canny">
            </van-slider>
          </template>
        </van-cell>
        <van-cell center :title="$t('cvControl.houghLine')">
          <template #right-icon>
            <van-slider bar-height="4px" button-size="1.2rem" style="width: 60%;">
            </van-slider>
          </template>
        </van-cell>
        <van-cell center :title="$t('cvControl.houghCircle')">
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

import { VisionStore } from '@renderer/store'
import { cvBlurType, cvFilterType, ModelEngine, ModelInfo, ModelType } from '@shared/index'
import { UploaderFileListItem } from 'vant'
import { computed, onMounted, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import PopSelector from '../components/PopSelector.vue'
import SliderField from '../components/SliderField.vue'

const i18n = useI18n()
const visionStore = VisionStore()

const IntergrateModes = [
  { name: 'wasm', color: '#8e44ad' },
  { name: 'nodejs', color: '#2ecc71' },
]
const ModelEngines = [
  { name: 'onnx', color: '#95a5a6', value: ModelEngine.onnx },
  { name: 'tensorflow', color: '#e67e22', value: ModelEngine.tensorflow }
]

const ObjRecGroup = [ModelType.detect, ModelType.segment]

const styleFile = ref()

const showMorphOpts = ref(false)
const MorphOpts = ['erode', 'dilate', 'open', 'close', 'gradient', 'topHat', 'blackHat']

const showColorMaps = ref(false)
const ColorMaps = [
  'NONE', 'AUTUMN', 'BONE', 'JET', 'WINTER', 'RAINBOW', 'OCEAN', 'SUMMER',
  'SPRING', 'COOL', 'HSV', 'PINK', 'HOT', 'PARULA', 'MAGMA',
  'INFERNO', 'PLASMA', 'VIRIDIS', 'CIVIDIS', 'TWILIGHT', 'TWILIGHT_SHIFTED', 'TURBO', 'DEEPGREEN'
]
const BlurTypes = ['gaussian', 'avg', 'median', 'bilateral']
const FilterTypes = ['sobel', 'laplace', 'scharr']

const colorMapAnchor = useTemplateRef('colorMapAnchor')

const isGaussianOrAvg = computed(() => [cvBlurType.gaussian, cvBlurType.avg].includes(visionStore.cvOpts.blur[0]))


onMounted(async () => {
  await visionStore.getAllModels()
})

function checkPosition() {
  colorMapAnchor.value.$el.scrollIntoView({ behavior: 'smooth', })
}
function onObjRecTypeChanged(type: ModelType) {
  changeModel(visionStore.getModels(type)[0])
}

function changeModel(model: Partial<ModelInfo>) {
  switch (model.type) {
    case ModelType.detect:
    case ModelType.segment:
      visionStore.objDetectModel = Object.assign({}, model, { engine: visionStore.modelEngine })
      break
    case ModelType.genImage:
      visionStore.animeModel = Object.assign({}, model, { engine: visionStore.modelEngine })
      break
    case ModelType.ocr:
      visionStore.ocrModel = Object.assign({}, model, { engine: visionStore.modelEngine })
      break
  }
}

function onStyleFileUpload(item: UploaderFileListItem) {
  let img = new Image()
  img.onload = (e) => {
    if (img == null) return
    let w = img.width, h = img.height
    console.log(e)
    let data = new ImageData(w, h)
    visionStore.styleFile = data
  }

  img.src = item.objectUrl

}

function onTransModelChanged(model: Partial<ModelInfo>) {
  visionStore.transModel = model
}

function onColorMapChanged(idx: number) {
  visionStore.cvOpts.colorMap = idx
  showColorMaps.value = false
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
  padding: 10px 0 10px 4px;
  background-color: var(--van-gray-1);
}
</style>