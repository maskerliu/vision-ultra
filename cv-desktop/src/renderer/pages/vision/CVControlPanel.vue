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
      <van-cell center :disabled="!visionStore.enableObjDetect">
        <template #title>
          <van-checkbox shape="square" v-model="visionStore.enableObjDetect">
            <van-icon class-prefix="iconfont" name="obj-track" style="color: #2980b9;" />
            <span style="margin-left: 5px;">{{ $t('cvControl.objTrack') }}</span>
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
                  <van-icon class-prefix="iconfont" style="color: #2980b9;" :name="key.toLowerCase()" />
                  {{ $t(`cvControl.obj${key}`) }}
                </template>
                <van-cell center clickable :title="$t(`cvControl.objModel.${model.name}`)" title-class="van-ellipsis"
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
            <van-icon class-prefix="iconfont" name="face-detect" style="color: #e67e22;" />
            <span style="margin-left: 5px;">{{ $t('cvControl.faceDetect') }}</span>
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

      <van-cell center :disabled="!visionStore.enableOCR">
        <template #title>
          <van-checkbox shape="square" v-model="visionStore.enableOCR">
            <van-icon class-prefix="iconfont" name="ocr" style="color: #1B9CFC;" />
            <span style="margin-left: 5px;">{{ $t('cvControl.ocr') }}</span>
          </van-checkbox>
        </template>
        <template #value>
          <van-popover v-model:show="showOcrModels" :show-arrow="false" placement="bottom-end" overlay>
            <template #reference>
              {{ visionStore.ocrModel.name }}
            </template>
            <van-col class="model-container" style="height: 140px;">
              <van-cell center clickable :title="$t(`cvControl.ocrModel.${model.name}`)" title-class="van-ellipsis"
                style="margin-left: 4px;" @click="onOcrModelChanged(model)" v-for="model in OcrModels">
                <template #right-icon>
                  <span style="color: var(--van-cell-value-color)">{{ model.desc }}</span>
                </template>
              </van-cell>
            </van-col>
          </van-popover>
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
          <van-popover v-model:show="showAnimeModels" :show-arrow="false" placement="bottom-end" overlay>
            <template #reference>
              {{ $t(`cvControl.animeModel.${visionStore.animeModel.name}`) }}
            </template>
            <van-col class="model-container" style="height: 180px;">
              <van-cell center clickable :title="$t(`cvControl.animeModel.${model.name}`)" title-class="van-ellipsis"
                style="margin-left: 0px;" @click="onGanModelChanged(model)" v-for="model in GanModels">
                <template #right-icon>
                  <span style="color: var(--van-cell-value-color)">{{ model.desc }}</span>
                </template>
              </van-cell>
            </van-col>
          </van-popover>
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
                <van-popover v-model:show="showStyleModels" :show-arrow="false" placement="bottom-end" overlay>
                  <template #reference>
                    {{ $t(`cvControl.styleModel.${visionStore.styleModel.name}`) }}
                  </template>
                  <van-col class="model-container" style="width: 260px; height: 100px;">
                    <van-cell center clickable :title="$t(`cvControl.styleModel.${model.name}`)"
                      title-class="van-ellipsis" style="margin-left: 4px;" @click="onStyleModelChanged(model)"
                      v-for="model in StyleModels">
                      <template #right-icon>
                        <span style="color: var(--van-cell-value-color)">{{ model.desc }}</span>
                      </template>
                    </van-cell>
                  </van-col>
                </van-popover>
              </template>
            </van-cell>
            <van-cell title="transfer">
              <template #value>
                <van-popover v-model:show="showTransformModels" :show-arrow="false" placement="bottom-end" overlay>
                  <template #reference>
                    {{ $t(`cvControl.transModel.${visionStore.transModel.name}`) }}
                  </template>
                  <van-col class="model-container" style="width: 260px; height: 100px;">
                    <van-cell center clickable :title="$t(`cvControl.transModel.${model.name}`)"
                      title-class="van-ellipsis" style="margin-left: 4px;" @click="onTransModelChanged(model)"
                      v-for="model in TransferModels">
                      <template #right-icon>
                        <span style="color: var(--van-cell-value-color)">{{ model.desc }}</span>
                      </template>
                    </van-cell>
                  </van-col>
                </van-popover>
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

      <van-checkbox shape="square" v-model="visionStore.cvOptions.enableDetect" style="margin: 15px;">
        Opencv
      </van-checkbox>
      <van-radio-group direction="horizontal" :disabled="!visionStore.cvOptions.enableDetect"
        style="padding: 0 15px 15px 15px;" v-model="visionStore.cvOptions.detector[0]">
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

      <van-col v-if="visionStore.cvOptions.enableDetect">
        <slider-field label="threshold" v-model:sliderValue="visionStore.cvOptions.detector[1]" />
        <slider-field label="minArea" :max="31" :step="5" v-model:sliderValue="visionStore.cvOptions.detector[2]" />
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
      <van-field :label="$t('cvControl.gray')" type="number" input-align="right">
        <template #input>
          <van-switch v-model="visionStore.cvOptions.isGray"></van-switch>
        </template>
      </van-field>
      <slider-field :label="$t('cvControl.brightness')" :min="-1" :max="2" :step="0.1"
        v-model:sliderValue="visionStore.cvOptions.gamma" />

      <slider-field :label="$t('cvControl.rotate')" :min="-180" :max="180" :step="15"
        v-model:sliderValue="visionStore.cvOptions.rotate" />
    </van-cell-group>

    <!-- blur -->
    <van-cell-group inset>
      <template #title>
        <van-checkbox shape="square" v-model="visionStore.cvOptions.enableBlur">
          {{ $t('cvControl.blur') }}
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
          {{ $t('cvControl.sharpness') }}
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
              {{ $t(`cvControl.morph`) }}
            </van-checkbox>
          </template>
          <template #value>
            <van-popover style="width: 140px;" overlay :show-arrow="false" placement="bottom-end"
              v-model:show="showMorphOpts" @open="checkPosition">
              <template #reference>
                <span style="font-size: var(--van-font-size-md)">
                  {{ $t(`cvControl.morphOpt.${MorphOpts[visionStore.cvOptions.morph[0]]}`) }}
                </span>
              </template>
              <van-radio-group direction="vertical"
                style="height: 110px; padding: 10px 10px 0 10px; overflow: hidden scroll;"
                v-model="visionStore.cvOptions.morph[0]">
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

        <van-field center label="kernelX" input-align="right" type="number" v-model="visionStore.cvOptions.morph[1]" />
        <van-field center label="kernelY" input-align="right" type="number" v-model="visionStore.cvOptions.morph[2]" />
        <van-field center label="iterations" input-align="right" type="number"
          v-model="visionStore.cvOptions.morph[3]" />
      </van-cell-group>

      <!-- contrast -->
      <van-cell-group inset>
        <template #title>
          <van-checkbox shape="square" v-model="visionStore.cvOptions.enableContrast">
            {{ $t('cvControl.contrast') }}
          </van-checkbox>
        </template>
        <van-radio-group direction="horizontal" :disabled="!visionStore.cvOptions.enableContrast"
          style="padding: 10px 15px;" v-model="visionStore.cvOptions.equalization[0]">
          <van-radio name="equalizeHist" style="font-size: 0.8rem;">
            {{ $t('cvControl.equalizeHist') }}
          </van-radio>
          <van-radio name="clahe" style="font-size: 0.8rem;">
            {{ $t('cvControl.clahe') }}
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
            {{ $t('cvControl.filter') }}
          </van-checkbox>
        </template>
        <van-radio-group direction="horizontal" :disabled="!visionStore.cvOptions.enableFilter"
          style="padding: 10px 15px;" v-model="visionStore.cvOptions.filter[0]">
          <van-radio :name="idx" v-for="(item, idx) in FilterTypes">
            {{ $t(`cvControl.filterType.${item}`) }}
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

      <van-cell-group inset :title="$t('cvControl.featExtract')">
        <van-cell center :title="$t('cvControl.canny')" :label="'[ ' + visionStore.cvOptions.canny.toString() + ' ]'">
          <template #title>
            <van-checkbox shape="square" v-model="visionStore.cvOptions.enableCanny">
              <span>canny</span>
              <span class="param-desc">{{ $t('cvControl.cannyDesc') }}</span>
            </van-checkbox>
          </template>
          <template #right-icon>
            <van-slider range :max="160" :min="60" bar-height="4px" button-size="1.2rem" style="width: 60%;"
              :disabled="!visionStore.cvOptions.enableCanny" v-model="visionStore.cvOptions.canny">
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

import { UploaderFileListItem } from 'vant'
import { onMounted, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { cvBlurType, cvFilterType, ModelEngine, ModelInfo, ModelType } from '../../../shared'
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
  { name: 'yolov8s', desc: '3.2M', type: ModelType.detect },
  { name: 'yolov10s', desc: '7.2M', type: ModelType.detect },
  { name: 'yolo11s', desc: '9.4M', type: ModelType.detect },
  { name: 'mobilenet', desc: '', type: ModelType.detect }
]
const SegmentModels = [
  { name: 'deeplab-ade', desc: 'class: 150', type: ModelType.segment },
  { name: 'deeplab-cityspace', desc: 'class: 20', type: ModelType.segment },
  { name: 'deeplabv3p-mobilenet', external: 'model.data', desc: 'class: 21', type: ModelType.segment },
  { name: 'bisenet', external: 'model.data', desc: '3.2M', type: ModelType.segment },
  { name: 'yolo11s-seg', desc: '9.4M', type: ModelType.segment },
  { name: 'yolo26s-seg', desc: '10.4', type: ModelType.segment },
  { name: 'yoloe-26n-seg', desc: '20.1M', type: ModelType.segment },
  { name: 'yoloe-26n-seg-pf', desc: '20.1M', type: ModelType.segment },
  { name: 'unet', desc: '', type: ModelType.segment },
  { name: 'sam', desc: '38.9M', type: ModelType.segment },
  { name: 'fastSAMs', external: 'model.data', desc: '', type: ModelType.segment },
]

const showAnimeModels = ref(false)
const GanModels = [
  { name: 'animeGANv2', desc: '12.4M', type: ModelType.genImage },
  { name: 'animeGANv3-Ghibli-o1', desc: '12.4M', type: ModelType.genImage },
  { name: 'animeGANv3-Ghibli-c1', desc: '12.4M', type: ModelType.genImage },
  { name: 'animeGANv3-Hayao', desc: '12.4M', type: ModelType.genImage },
  { name: 'animeGANv3-JPface', desc: '12.4M', type: ModelType.genImage },
  { name: 'animeGANv3-PortraitSketch', desc: '12.4M', type: ModelType.genImage },
  { name: 'animeGANv3-Shinkai', desc: '12.4M', type: ModelType.genImage },
  { name: 'animeGANv3-TinyCute', desc: '1.2M', type: ModelType.genImage },
  { name: 'animeGANv3-FacePaint', desc: '1.2M', type: ModelType.genImage },
]

const showOcrModels = ref(false)
const OcrModels = [
  { name: 'tesseract', desc: '', type: ModelType.ocr },
  { name: 'kerasOcr', desc: '', type: ModelType.ocr },
  { name: 'easyOcr', external: 'easyOCR.onnx.data', desc: '', type: ModelType.ocr },
  { name: 'paddleOcr', desc: '', type: ModelType.ocr },
  { name: 'GOT-OCR', desc: '', type: ModelType.ocr },
]

const showStyleModels = ref(false)
const StyleModels = [
  { name: 'style-mobilenet', desc: '', type: ModelType.style },
  { name: 'style-inception', desc: '', type: ModelType.style },
]

const styleFile = ref()

const showTransformModels = ref(false)
const TransferModels = [
  { name: 'trans-separable-conv2d', desc: '', type: ModelType.transform },
  { name: 'trans-origin', desc: '', type: ModelType.transform },
]

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
  visionStore.animeModel = model
  showAnimeModels.value = false
}

function onOcrModelChanged(model: ModelInfo) {
  visionStore.ocrModel = model
  showOcrModels.value = false
}

function onStyleModelChanged(model: ModelInfo) {
  visionStore.styleModel = model
  showStyleModels.value = false
}

function onStyleFileUpload(item: UploaderFileListItem) {
  console.log(item)

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

function onTransModelChanged(model: ModelInfo) {
  visionStore.transModel = model
  showTransformModels.value = false
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
  padding: 10px 0 10px 4px;
  background-color: var(--van-gray-1);
}
</style>