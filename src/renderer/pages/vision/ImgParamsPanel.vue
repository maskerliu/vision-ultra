<template>
  <van-col>
    <van-cell-group :border="false">
      <van-cell title="图像处理引擎">
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

    <van-cell-group title=" " :border="false">
      <van-cell title="灰度" center>
        <template #right-icon>
          <van-switch v-model="visionStore.imgParams.isGray" size="1.3rem"></van-switch>
        </template>
      </van-cell>
      <van-cell :title="$t('imgProcess.Contrast')" :label="$t('imgProcess.ContrastDesc')" center>
        <template #right-icon>
          <van-switch size="1.3rem" :disabled="!visionStore.imgParams.isGray"
            v-model="visionStore.imgParams.equalizeHist"></van-switch>
        </template>
      </van-cell>
      <van-cell :title="$t('imgProcess.Rotate')" center>
        <template #right-icon>
          <van-slider bar-height="4px" button-size="1.2rem" min="-180" max="180" step="1" style="width: 60%;"
            v-model="rotate" @change="visionStore.imgParams.rotate = rotate"></van-slider>
        </template>
      </van-cell>
      <van-cell label-class="label" center>
        <template #title>
          <van-checkbox icon-size="1rem" shape="square" v-model="visionStore.imgParams.enableGamma">
            <span>{{ $t('imgProcess.Brightness') }}</span>
            <span class="param-desc">{{ $t('imgProcess.BrightnessDesc') }}</span>
          </van-checkbox>
        </template>
        <template #right-icon>
          <van-stepper :disabled="!visionStore.imgParams.enableGamma" button-size="1.6rem"
            v-model="visionStore.imgParams.gamma" step="0.1" min="0" max="3" />
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group :border="false">
      <template #title>
        <van-checkbox icon-size="1rem" shape="square" v-model="visionStore.imgParams.enableBlur">
          <span style="margin-top:0px;">{{ $t('imgProcess.Blur') }}</span>
        </van-checkbox>
      </template>

      <van-radio-group direction="horizontal" :disabled="!visionStore.imgParams.enableBlur"
        style="padding: 15px 15px 0 15px;" v-model="blur[0]" @change="onParamChange">
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
      <van-field label-align="right" type="number" input-align="right" label-width="6rem">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="1" max="31" step="1" style="width: 60%;"
            v-model="blur[1]" @change="onParamChange"
            :disabled="blur[0] != 'gaussian' && blur[0] != 'avg' || !visionStore.imgParams.enableBlur" />
        </template>
        <template #label>
          <van-tag type="primary" plain style="width: 1rem;">
            {{ `${blur[1]}`.padStart(3, '&nbsp;') }}
          </van-tag>
          &nbsp;&nbsp;sizeX
        </template>
      </van-field>
      <van-field label-align="right" type="number" label="" input-align="right" label-width="6rem">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="1" max="31" step="1"
            style="width: 60%; margin-right: 15px;" v-model="blur[2]" @change="onParamChange"
            :disabled="blur[0] != 'gaussian' && blur[0] != 'avg' || !visionStore.imgParams.enableBlur" />
        </template>
        <template #label>
          <van-tag type="primary" plain style="width: 1rem;">
            {{ `${blur[2]}`.padStart(3, '&nbsp;') }}
          </van-tag>
          &nbsp;&nbsp;sizeY
        </template>
      </van-field>
      <van-field label-align="right" type="number" label="aperture" input-align="right" label-width="6rem">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="1" max="31" step="1"
            style="width: 60%; margin-right: 15px;" v-model="blur[3]" @change="onParamChange"
            :disabled="blur[0] !== 'median' || !visionStore.imgParams.enableBlur" />
        </template>
      </van-field>
      <van-field label-align="right" type="number" label="diameter" input-align="right" label-width="6rem"
        v-model="blur[4]" :disabled="blur[0] != 'bilateral' || !visionStore.imgParams.enableBlur" />
      <van-field label-align="right" type="number" label="sigmaColor" input-align="right" label-width="6rem"
        v-model="blur[5]" :disabled="blur[0] != 'bilateral' || !visionStore.imgParams.enableBlur" />
      <van-field label-align="right" type="number" label="sigmaSpace" input-align="right" label-width="6rem"
        v-model="blur[6]" :disabled="blur[0] != 'bilateral' || !visionStore.imgParams.enableBlur" />
      <van-button type="primary" plain size="small" style="width:90%; margin: 15px;" @click="onParamChange"
        v-if="blur[0] == 'bilateral' && visionStore.imgParams.enableBlur">
        Set
      </van-button>
    </van-cell-group>

    <van-cell-group :border="false">
      <template #title>
        <van-checkbox icon-size="1rem" shape="square" v-model="visionStore.imgParams.enableFilter">
          {{ $t('imgProcess.Filter') }}
        </van-checkbox>
      </template>
      <van-radio-group direction="horizontal" :disabled="!visionStore.imgParams.enableFilter"
        style="padding: 15px 15px 0 15px;" v-model="filter[0]" @change="onParamChange">
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
      <van-field label-align="right" type="number" input-align="right" label-width="5rem"
        v-if="filter[0] !== 'laplace'">
        <template #label>
          <van-tag type="primary" plain style="width: 1rem;">
            {{ `${filter[1]}`.padStart(3, '&nbsp;') }}
          </van-tag>
          &nbsp;&nbsp;&nbsp;&nbsp;dX
        </template>
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="0" max="3" step="0.1" style="width: 60%;"
            v-model="filter[1]" @change="onParamChange" />
        </template>
      </van-field>
      <van-field label-align="right" type="number" label="dy" input-align="right" label-width="5rem"
        v-if="filter[0] !== 'laplace'">
        <template #label>
          <van-tag type="primary" plain style="width: 1rem;">
            {{ `${filter[2]}`.padStart(3, '&nbsp;') }}
          </van-tag>
          &nbsp;&nbsp;&nbsp;&nbsp;dY
        </template>
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="0" max="3" step="0.1" style="width: 60%;"
            v-model="filter[2]" @change="onParamChange" />
        </template>
      </van-field>
      <van-field label-align="right" type="number" input-align="right" label-width="5rem">
        <template #label>
          <van-tag type="primary" plain style="width: 1rem;">
            {{ `${filter[4]}`.padStart(3, '&nbsp;') }}
          </van-tag>
          &nbsp;&nbsp;size
        </template>
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="1" max="30" step="1" style="width: 60%;"
            v-model="filter[4]" @change="onParamChange" />
        </template>
      </van-field>
      <van-field label-align="right" type="number" input-align="right" label-width="5rem">
        <template #label>
          <van-tag type="primary" plain style="width: 1rem;">
            {{ `${filter[3]}`.padStart(3, '&nbsp;') }}
          </van-tag>
          scale
        </template>
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="1" max="31" step="1" style="width: 60%;"
            v-model="filter[3]" @change="onParamChange" />
        </template>
      </van-field>
    </van-cell-group>

    <van-cell-group :title="$t('imgProcess.FeatExtract')" :border="false">
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
import { VisionStore } from '../../store'

type Blur = [string, number, number, number, number, number, number]
type Filter = [string, number, number, number, number]

const canny = ref<[number, number]>([60, 160])
const rotate = ref(0)
const visionStore = VisionStore()
const isWeb = window.isWeb
const blur = ref<Blur>(['', 0, 0, 0, 0, 0, 0])
const filter = ref<Filter>(['', 0, 0, 0, 0])

onMounted(() => {
  blur.value[0] = visionStore.imgParams.blur[0]
  blur.value[1] = visionStore.imgParams.blur[1]
  blur.value[2] = visionStore.imgParams.blur[2]
  blur.value[3] = visionStore.imgParams.blur[3]
  blur.value[4] = visionStore.imgParams.blur[4]
  blur.value[5] = visionStore.imgParams.blur[5]
  blur.value[6] = visionStore.imgParams.blur[6]

  filter.value[0] = visionStore.imgParams.filter[0]
  filter.value[1] = visionStore.imgParams.filter[1]
  filter.value[2] = visionStore.imgParams.filter[2]
  filter.value[3] = visionStore.imgParams.filter[3]
  filter.value[4] = visionStore.imgParams.filter[4]

  canny.value[0] = visionStore.imgParams.canny[0]
  canny.value[1] = visionStore.imgParams.canny[1]
})

function onParamChange() {
  visionStore.imgParams.blur = [
    blur.value[0], blur.value[1], blur.value[2], blur.value[3],
    Number(blur.value[4]), Number(blur.value[5]), Number(blur.value[6])
  ]

  visionStore.imgParams.filter = [
    filter.value[0], filter.value[1], filter.value[2], filter.value[3], filter.value[4]
  ]

  console.log('blur', filter.value)

  visionStore.imgParams.canny = [canny.value[0], canny.value[1]]
}

</script>
<style scoped></style>