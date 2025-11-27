<template>
  <van-col>
    <van-cell-group :border="false">
      <van-cell title="图像处理引擎">
        <template #right-icon>
          <van-radio-group v-model="visionStore.imgProcessMode" direction="horizontal">
            <van-radio name="1" size="1rem">
              <van-icon class="iconfont icon-wasm" style="font-size: 1.2rem; color: #8e44ad; margin-top: 4px;" />
            </van-radio>
            <van-radio name="2" size="1rem">
              <van-icon class="iconfont icon-nodejs" style="font-size: 1.2rem; color: #27ae60; margin-top: 4px;" />
            </van-radio>
            <van-radio name="3" size="1rem">
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
      <van-cell title="对比度" label="直方图均衡" center>
        <template #right-icon>
          <van-switch size="1.3rem" :disabled="!visionStore.imgParams.isGray"
            v-model="visionStore.imgParams.equalizeHist"></van-switch>
        </template>
      </van-cell>
      <van-cell title="旋转" center>
        <template #right-icon>
          <van-slider bar-height="4px" button-size="1.2rem" min="-180" max="180" step="1" style="width: 60%;"
            v-model="rotate" @change="visionStore.imgParams.rotate = rotate"></van-slider>
        </template>
      </van-cell>
      <van-cell label-class="label" center>
        <template #title>
          <van-checkbox shape="square" v-model="visionStore.imgParams.enableGamma">
            <span>亮度</span>
            <span class="param-desc">Gamma校正</span>
          </van-checkbox>
        </template>
        <template #right-icon>
          <van-stepper :disabled="!visionStore.imgParams.enableGamma" button-size="1.6rem"
            v-model="visionStore.imgParams.gamma" step="0.1" min="0" max="3" />
        </template>
      </van-cell>

      <van-cell label-class="label">
        <template #title>
          <van-checkbox shape="square" v-model="visionStore.imgParams.enableGaussian">
            <span>模糊</span>
            <span class="param-desc">高斯模糊</span>
          </van-checkbox>
        </template>
        <template #label>
          size:\t\t<van-stepper button-size="1.6rem" step="2" min="1" :disabled="!visionStore.imgParams.enableGaussian"
            v-model="visionStore.imgParams.gaussian[0]" />
          sigmaX:<van-stepper button-size="1.6rem" step="1" min="1" :disabled="!visionStore.imgParams.enableGaussian"
            v-model="visionStore.imgParams.gaussian[1]" />
          <br /><br />
          amount:<van-stepper button-size="1.6rem" step="1" min="1" :disabled="!visionStore.imgParams.enableGaussian"
            v-model="visionStore.imgParams.gaussian[2]" />
        </template>
      </van-cell>
    </van-cell-group>
    <van-cell-group title="边缘检测" :border="false">
      <van-cell label="离散的微分算子" center>
        <template #title>
          <van-checkbox shape="square" v-model="visionStore.imgParams.enableSobel">Sobel算子</van-checkbox>
        </template>
        <template #right-icon>
          <van-col style="align-items: end;">
            size: <van-stepper button-size="1.6rem" step="2" min="1" max="7"
              :disabled="!visionStore.imgParams.enableSobel" v-model="visionStore.imgParams.sobel[0]" />
            <br /><br />
            scale:<van-stepper button-size="1.6rem" step="1" min="1" max="31"
              :disabled="!visionStore.imgParams.enableSobel" v-model="visionStore.imgParams.sobel[1]" />
          </van-col>
        </template>
      </van-cell>
      <van-cell label="通常用于特征提取和特征检测" center>
        <template #title>
          <van-checkbox shape="square" v-model="visionStore.imgParams.enableScharr" size="1.3rem">
            <span>Scharr算子</span>
          </van-checkbox>
        </template>
        <template #right-icon>
          <van-stepper button-size="1.6rem" step="2" min="1" max="31" :disabled="!visionStore.imgParams.enableScharr"
            v-model="visionStore.imgParams.scharr" />
        </template>
      </van-cell>
      <van-cell label-class="label">
        <template #title>
          <van-checkbox shape="square" v-model="visionStore.imgParams.enableLaplace">
            <span>拉普拉斯算子</span>
            <span class="param-desc">通常用于特征提取和特征检测</span>
          </van-checkbox>
        </template>
        <template #label>
          size: <van-stepper button-size="1.6rem" step="2" min="1" max="7"
            :disabled="!visionStore.imgParams.enableLaplace" v-model="visionStore.imgParams.laplace[0]" />
          scale:<van-stepper button-size="1.6rem" step="1" min="1" max="31"
            :disabled="!visionStore.imgParams.enableLaplace" v-model="visionStore.imgParams.laplace[1]" />
        </template>
      </van-cell>
      <van-cell center title="Canny" :label="'[ ' + visionStore.imgParams.cannyThreshold.toString() + ' ]'">
        <template #title>
          <van-checkbox shape="square" v-model="visionStore.imgParams.enableCanny">
            <span>canny</span>
            <span class="param-desc">边缘检测</span>
          </van-checkbox>
        </template>

        <template #right-icon>
          <van-slider range :max="160" :min="60" bar-height="4px" button-size="1.2rem" style="width: 60%;"
            :disabled="!visionStore.imgParams.enableCanny" v-model="cannyThreshold" @change="onCannyChange">
          </van-slider>
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group title="噪声滤波" :border="false">
      <van-cell title="均值滤波" center>
        <template #right-icon>
          <van-slider bar-height="4px" button-size="1.2rem" style="width: 60%;">
          </van-slider>
        </template>
      </van-cell>
      <van-cell title="中值滤波" center>
        <template #right-icon>
          <van-slider bar-height="4px" button-size="1.2rem" style="width: 60%;">
          </van-slider>
        </template>
      </van-cell>
      <van-cell title="高斯滤波" center>
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

const cannyThreshold = ref<[number, number]>([60, 160])
const rotate = ref(0)
const visionStore = VisionStore()

onMounted(() => {
  cannyThreshold.value[0] = visionStore.imgParams.cannyThreshold[0]
  cannyThreshold.value[1] = visionStore.imgParams.cannyThreshold[1]
})

function onCannyChange() {
  visionStore.imgParams.cannyThreshold = [cannyThreshold.value[0], cannyThreshold.value[1]]
}

</script>
<style scoped></style>