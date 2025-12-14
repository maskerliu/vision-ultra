<template>
  <van-col>
    <van-cell-group>
      <van-cell :title="$t('imgProcess.ProcessMode')">
        <template #right-icon>
          <van-radio-group v-model="visionStore.imgProcessMode" direction="horizontal">
            <van-radio name="1" size="1rem">
              <van-icon class="iconfont icon-wasm" style="font-size: 1.2rem; color: #8e44ad; margin-top: 4px;" />
            </van-radio>
            <van-radio name="2" size="1rem" :disabled="isWeb">
              <van-icon class="iconfont icon-nodejs" style="font-size: 1.2rem; color: #27ae60; margin-top: 4px;" />
            </van-radio>
            <van-radio name="3" size="1rem" :disabled="isWeb">
              <van-icon class="iconfont icon-native" style="font-size: 1.2rem; color: #3498db; margin-top: 4px;" />
            </van-radio>
          </van-radio-group>
        </template>
      </van-cell>
    </van-cell-group>

    <!-- YOLO object detect -->
    <van-cell-group>
      <template #title>
        <van-checkbox icon-size="1rem" shape="square" v-model="visionStore.enableYolo">
          {{ $t('imgProcess.YOLODetect') }} <span class="param-desc">{{ $t('imgProcess.YOLODesc') }}</span>
        </van-checkbox>
      </template>
      <van-radio-group direction="vertical" :disabled="!visionStore.enableYolo" style="padding: 5px 15px;"
        v-model="visionStore.yoloModel" @change="onParamChange">
        <van-radio :name="model" icon-size="1rem" style="font-size: 0.8rem; margin-bottom: 8px;"
          v-for="model in YOLOModels">
          {{ $t(`imgProcess.${model}`) }}
        </van-radio>
      </van-radio-group>
    </van-cell-group>

    <!-- face recognize -->
    <van-cell-group>
      <template #title>
        <van-checkbox icon-size="1rem" shape="square" v-model="visionStore.faceDetect">
          <van-icon class="iconfont icon-tensorflow" style="font-size: 1rem; color: orange;" />
          <span>{{ $t('imgProcess.FaceRec') }}</span>
        </van-checkbox>
      </template>
      <van-row style="padding: 10px 15px;">
        <van-checkbox icon-size="1rem" v-model="visionStore.drawEigen" :disabled="!visionStore.faceDetect">
          <template #default>
            <van-icon class="iconfont icon-mesh" style="font-size: 1.2rem; font-weight: blod; margin-top: 1px;" />
          </template>
        </van-checkbox>

        <van-checkbox icon-size="1rem" v-model="visionStore.drawFaceMesh" style="margin-left: 15px;"
          :disabled="!visionStore.faceDetect">
          <template #default>
            <van-icon class="iconfont icon-eigen" style="font-size: 1.2rem; font-weight: blod; margin-top: 1px;" />
          </template>
        </van-checkbox>
      </van-row>
    </van-cell-group>

    <van-cell-group>
      <template #title>
        <van-checkbox icon-size="1rem" shape="square" v-model="visionStore.imgEnhance">
          <van-icon class="iconfont icon-opencv" style="font-size: 1rem; color: green;" />
          {{ $t('imgProcess.ImgEnhance') }}
        </van-checkbox>
      </template>
      <van-field :label="$t('imgProcess.Gray')" label-align="right" type="number" input-align="right"
        label-width="4rem">
        <template #input>
          <van-switch v-model="visionStore.imgParams.isGray" size="1.3rem"></van-switch>
        </template>
      </van-field>
      <van-field :label="$t('imgProcess.Rotate')" label-align="right" type="number" input-align="right"
        label-width="4rem">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="-180" max="180" step="15" v-model="rotate"
            @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ rotate }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-collapse v-model="activeCollapse">
        <van-collapse-item :title="$t('imgProcess.ColorMap')" name="1"
          :value="ColorMaps[visionStore.imgParams.colorMap]" style="padding-left: 5px;">
          <van-radio-group v-model="visionStore.imgParams.colorMap">
            <van-radio :name="idx" icon-size="1rem" style="font-size: 0.8rem; margin-bottom: 5px;"
              v-for="(val, idx) in ColorMaps" :key="idx" @click="onParamChange">
              <van-row justify="space-between">
                <van-col span="6">{{ val }}</van-col>
                <van-col span="11">
                  <van-image height="1rem" radius="5" :src="`/static/${val.toLowerCase()}.jpg`" v-if="idx != 0" />
                </van-col>
              </van-row>
            </van-radio>
          </van-radio-group>
        </van-collapse-item>
      </van-collapse>

    </van-cell-group>

    <!-- brightness -->
    <van-cell-group>
      <template #title>
        <van-checkbox icon-size="1rem" shape="square" v-model="visionStore.imgParams.enableGamma">
          {{ $t('imgProcess.Brightness') }}
        </van-checkbox>
      </template>
      <van-field label="gamma" label-align="right" type="number" input-align="right" label-width="4rem">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="-1" max="2" step="0.1" v-model="gamma"
            :disabled="!visionStore.imgParams.enableGamma" @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ gamma }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
    </van-cell-group>

    <!-- contrast -->
    <van-cell-group>
      <template #title>
        <van-checkbox icon-size="1rem" shape="square" v-model="visionStore.imgParams.enableContrast"
          :disabled="!visionStore.imgParams.isGray">
          {{ $t('imgProcess.Contrast') }}
        </van-checkbox>
      </template>
      <van-radio-group direction="horizontal" :disabled="!visionStore.imgParams.enableContrast"
        style="padding: 10px 15px;" v-model="equalization[0]" @change="onParamChange">
        <van-radio name="equalizeHist" icon-size="1rem" style="font-size: 0.8rem;">
          {{ $t('imgProcess.EqualizeHist') }}
        </van-radio>
        <van-radio name="clahe" icon-size="1rem" style="font-size: 0.8rem;">
          {{ $t('imgProcess.CLAHE') }}
        </van-radio>
      </van-radio-group>
      <van-field label="clip" label-align="right" type="number" input-align="right" label-width="4rem"
        v-if="equalization[0] == 'clahe' && visionStore.imgParams.enableContrast">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="1" max="31" step="1" v-model="equalization[1]"
            @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ equalization[1] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field label="sizeX" label-align="right" type="number" input-align="right" label-width="4rem"
        v-if="equalization[0] == 'clahe' && visionStore.imgParams.enableContrast">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="1" max="31" step="1" v-model="equalization[2]"
            @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ equalization[2] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field label="sizeY" label-align="right" type="number" input-align="right" label-width="4rem"
        v-if="equalization[0] == 'clahe' && visionStore.imgParams.enableContrast">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="1" max="31" step="1" v-model="equalization[3]"
            @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ equalization[3] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
    </van-cell-group>

    <!-- blur -->
    <van-cell-group>
      <template #title>
        <van-checkbox icon-size="1rem" shape="square" v-model="visionStore.imgParams.enableBlur">
          {{ $t('imgProcess.Blur') }}
        </van-checkbox>
      </template>

      <van-radio-group direction="horizontal" :disabled="!visionStore.imgParams.enableBlur" style="padding: 10px 15px;"
        v-model="blur[0]" @change="onParamChange">
        <van-radio name="gaussian" icon-size="1rem">
          <van-icon class="iconfont icon-gaussian-filter" style="font-size: 1.4rem; margin-top: 2px;" />
        </van-radio>
        <van-radio name="avg" icon-size="1rem">
          <van-icon class="iconfont icon-avg-filter" style="font-size: 1.4rem; margin-top: 2px;" />
        </van-radio>
        <van-radio name="median" icon-size="1rem">
          <van-icon class="iconfont icon-median-filter" style="font-size: 1.4rem; margin-top: 2px;" />
        </van-radio>
        <van-radio name="bilateral" icon-size="1rem" style="font-size: 0.8rem;">
          {{ $t('imgProcess.BilateralBlur') }}
        </van-radio>
      </van-radio-group>
      <van-field label="sizeX" label-align="right" type="number" input-align="right" label-width="4rem"
        v-if="(blur[0] == 'gaussian' || blur[0] == 'avg') && visionStore.imgParams.enableBlur">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="1" max="31" step="1" v-model="blur[1]"
            @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ blur[1] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field label="sizeY" label-align="right" type="number" input-align="right" label-width="4rem"
        v-if="(blur[0] == 'gaussian' || blur[0] == 'avg') && visionStore.imgParams.enableBlur">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="1" max="31" step="1" v-model="blur[2]"
            @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ blur[2] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field label="aperture" label-align="right" type="number" input-align="right" label-width="4rem"
        v-if="blur[0] == 'median' && visionStore.imgParams.enableBlur">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="1" max="31" step="1" v-model="blur[3]"
            @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ blur[3] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field label="diameter" label-align="right" type="number" input-align="right" label-width="4rem"
        v-if="blur[0] == 'bilateral' && visionStore.imgParams.enableBlur">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="1" max="5" step="1" v-model="blur[4]"
            @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ blur[4] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field label="color" label-align="right" type="number" input-align="right" label-width="4rem"
        v-if="blur[0] == 'bilateral' && visionStore.imgParams.enableBlur">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="10" max="255" step="1" v-model="blur[5]"
            @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ blur[5] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field label="space" label-align="right" type="number" input-align="right" label-width="4rem"
        v-if="blur[0] == 'bilateral' && visionStore.imgParams.enableBlur">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="10" max="255" step="1" v-model="blur[6]"
            @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ blur[6] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
    </van-cell-group>

    <!-- sharpness -->
    <van-cell-group>
      <template #title>
        <van-checkbox icon-size="1rem" shape="square" v-model="visionStore.imgParams.enableSharpen">
          {{ $t('imgProcess.Sharpness') }}
        </van-checkbox>
      </template>
      <van-radio-group direction="horizontal" :disabled="!visionStore.imgParams.enableSharpen"
        style="padding: 10px 15px;" v-model="sharpen[0]" @change="onParamChange">
        <van-radio name="laplace" icon-size="1rem" style="font-size: 0.8rem;">
          laplacian
        </van-radio>
        <van-radio name="usm" icon-size="1rem" style="font-size: 0.8rem;">
          usm
        </van-radio>
      </van-radio-group>
      <van-field label="origin" label-align="right" type="number" input-align="right" label-width="4rem"
        v-if="sharpen[0] !== 'laplace' && visionStore.imgParams.enableSharpen">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="1" max="2" step="0.1" v-model="sharpen[1]"
            @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ sharpen[1] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field label="addon" label-align="right" type="number" input-align="right" label-width="4rem"
        v-if="sharpen[0] !== 'laplace' && visionStore.imgParams.enableSharpen">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="-2" max="2" step="0.1" v-model="sharpen[2]"
            @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ sharpen[2] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
    </van-cell-group>

    <!-- filter -->
    <van-cell-group>
      <template #title>
        <van-checkbox icon-size="1rem" shape="square" v-model="visionStore.imgParams.enableFilter"
          :disabled="!visionStore.imgParams.isGray">
          {{ $t('imgProcess.Filter') }}
        </van-checkbox>
      </template>
      <van-radio-group direction="horizontal" :disabled="!visionStore.imgParams.enableFilter"
        style="padding: 10px 15px;" v-model="filter[0]" @change="onParamChange">
        <van-radio name="sobel" icon-size="1rem" style="font-size: 0.8rem;">
          {{ $t('imgProcess.Sobel') }}
        </van-radio>
        <van-radio name="scharr" icon-size="1rem" style="font-size: 0.8rem;">
          {{ $t('imgProcess.Scharr') }}
        </van-radio>
        <van-radio name="laplace" icon-size="1rem" style="font-size: 0.8rem;">
          {{ $t('imgProcess.Laplace') }}
        </van-radio>
      </van-radio-group>
      <van-field label="dX" label-align="right" type="number" input-align="right" label-width="4rem"
        v-if="filter[0] !== 'laplace' && visionStore.imgParams.enableFilter">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="0" max="3" step="0.1" v-model="filter[1]"
            @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ filter[1] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field label="dY" label-align="right" type="number" input-align="right" label-width="4rem"
        v-if="filter[0] !== 'laplace' && visionStore.imgParams.enableFilter">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="0" max="3" step="0.1" v-model="filter[2]"
            @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ filter[2] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field label="size" label-align="right" type="number" input-align="right" label-width="4rem"
        v-if="filter[0] !== 'scharr' && visionStore.imgParams.enableFilter">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="1" max="30" step="1" v-model="filter[4]"
            @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ filter[4] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field label="scale" label-align="right" type="number" input-align="right" label-width="4rem"
        v-if="visionStore.imgParams.enableFilter">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="1" max="31" step="1" v-model="filter[3]"
            @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ filter[3] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
    </van-cell-group>

    <!-- cv object detect -->
    <van-cell-group>
      <template #title>
        <van-checkbox icon-size="1rem" shape="square" v-model="visionStore.imgParams.enableDetect">
          {{ $t('imgProcess.ObjectDetect') }}
        </van-checkbox>
      </template>
      <van-radio-group direction="horizontal" :disabled="!visionStore.imgParams.enableDetect"
        style="padding: 10px 15px;" v-model="detector[0]" @change="onParamChange">
        <van-radio name="color" icon-size="1rem" style="font-size: 0.8rem;">
          {{ $t('imgProcess.ColorTrack') }}
        </van-radio>
        <van-radio name="contour" icon-size="1rem" style="font-size: 0.8rem;">
          {{ $t('imgProcess.ContourTrack') }}
        </van-radio>
        <van-radio name="bgSub" icon-size="1rem" style="font-size: 0.8rem;">
          {{ $t('imgProcess.BackgroundSub') }}
        </van-radio>
      </van-radio-group>
      <van-field label="threshold" label-align="right" type="number" input-align="right" label-width="5rem"
        v-if="visionStore.imgParams.enableDetect">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="1" max="100" step="1" v-model="detector[1]"
            @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ detector[1] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field label="minArea" label-align="right" type="number" input-align="right" label-width="5rem"
        v-if="visionStore.imgParams.enableDetect">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="1" max="31" step="5" v-model="detector[2]"
            @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ detector[2] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
    </van-cell-group>

    <van-cell-group :title="$t('imgProcess.FeatExtract')">
      <van-cell center :title="$t('imgProcess.Canny')" :label="'[ ' + visionStore.imgParams.canny.toString() + ' ]'">
        <template #title>
          <van-checkbox icon-size="1rem" shape="square" v-model="visionStore.imgParams.enableCanny">
            <span>canny</span>
            <span class="param-desc">{{ $t('imgProcess.CannyDesc') }}</span>
          </van-checkbox>
        </template>
        <template #right-icon>
          <van-slider range :max="160" :min="60" bar-height="4px" button-size="1.2rem" style="width: 60%;"
            :disabled="!visionStore.imgParams.enableCanny" v-model="canny" @change="onParamChange">
          </van-slider>
        </template>
      </van-cell>
      <van-cell :title="$t('imgProcess.HoughLine')" center>
        <template #right-icon>
          <van-slider bar-height="4px" button-size="1.2rem" style="width: 60%;">
          </van-slider>
        </template>
      </van-cell>
      <van-cell :title="$t('imgProcess.HoughCircle')" center>
        <template #right-icon>
          <van-slider bar-height="4px" button-size="1.2rem" style="width: 60%;">
          </van-slider>
        </template>
      </van-cell>
    </van-cell-group>
  </van-col>
</template>
<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { cvBlur, cvEqualizeHist, cvFilter, cvSharpen, cvDetector, VisionStore } from '../../store'


const YOLOModels = ['yolov6n', 'yolov8n', 'yolov10n', 'yolo11n']
const activeCollapse = ref(['0'])
const ColorMaps = ['NONE', 'AUTUMN', 'BONE', 'JET', 'WINTER', 'RAINBOW', 'OCEAN', 'SUMMER',
  'SPRING', 'COOL', 'HSV', 'PINK', 'HOT', 'PARULA', 'MAGMA',
  'INFERNO', 'PLASMA', 'VIRIDIS', 'CIVIDIS', 'TWILIGHT', 'TWILIGHT_SHIFTED', 'TURBO', 'DEEPGREEN']
const canny = ref<[number, number]>([60, 160])
const rotate = ref(0)
const visionStore = VisionStore()
const isWeb = window.isWeb
const gamma = ref(1)
const equalization = ref<cvEqualizeHist>(['', 0, 0, 0])
const blur = ref<cvBlur>(['', 0, 0, 0, 0, 0, 0])
const sharpen = ref<cvSharpen>(['', 0, 0, 0])
const detector = ref<cvDetector>(['', 0, 0])
const filter = ref<cvFilter>(['', 0, 0, 0, 0])


onMounted(() => {

  rotate.value = visionStore.imgParams.rotate

  for (let i = 0; i < visionStore.imgParams.equalization.length; ++i) {
    equalization.value[i] = visionStore.imgParams.equalization[i]
  }

  for (let i = 0; i < visionStore.imgParams.blur.length; ++i) {
    blur.value[i] = visionStore.imgParams.blur[i]
  }
  for (let i = 0; i < visionStore.imgParams.sharpen.length; ++i) {
    sharpen.value[i] = visionStore.imgParams.sharpen[i]
  }

  for (let i = 0; i < visionStore.imgParams.filter.length; ++i) {
    filter.value[i] = visionStore.imgParams.filter[i]
  }
  for (let i = 0; i < visionStore.imgParams.detector.length; ++i) {
    detector.value[i] = visionStore.imgParams.detector[i]
  }

  canny.value[0] = visionStore.imgParams.canny[0]
  canny.value[1] = visionStore.imgParams.canny[1]
})

function onParamChange() {
  visionStore.imgParams.rotate = rotate.value
  visionStore.imgParams.gamma = gamma.value

  visionStore.imgParams.equalization = equalization.value.map(val => val) as cvEqualizeHist
  visionStore.imgParams.sharpen = sharpen.value.map(val => val) as cvSharpen
  visionStore.imgParams.blur = blur.value.map(val => val) as cvBlur
  visionStore.imgParams.filter = filter.value.map(val => val) as cvFilter
  visionStore.imgParams.detector = detector.value.map(val => val) as cvDetector
  visionStore.imgParams.canny = canny.value.map(val => val) as any
}

</script>
<style>
.van-radio__label {
  width: 100%;
}
</style>