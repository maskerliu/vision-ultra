<template>
  <van-row>
    <van-col class="border-bg left-panel">
      <van-row justify="space-between">
        <van-row></van-row>
        <div style="padding: 1px 0;">
          <van-icon class="iconfont icon-qrcode left-panel-icon" @click="commonStore.showQrCode = true" />
          <van-icon class="iconfont icon-data left-panel-icon" @click="" />
          <van-icon class="iconfont icon-setting left-panel-icon" @click="openSettings">
            <span class="badge-dot"></span>
          </van-icon>
        </div>
      </van-row>
      <OverlayScrollbarsComponent class="snap-panel" :options="{ scrollbars: { theme: `os-theme-${reverseTheme}` } }"
        defer>

        <van-cell-group title="图像处理" inset :border="false">
          <van-cell title="灰度" center>
            <template #value>
              <van-switch v-model="visionStore.imgParams.isGray" size="1.3rem"></van-switch>
            </template>
          </van-cell>
          <van-cell>
            <template #title>
              <span>对比度</span>
              <span class="param-desc">直方图均衡</span>
            </template>
            <template #value>
              <van-switch size="1.3rem" :disabled="!visionStore.imgParams.isGray"
                v-model="visionStore.imgParams.equalizeHist"></van-switch>
            </template>
          </van-cell>
          <van-cell label-class="label">
            <template #title>
              <van-checkbox shape="square" icon-size="1rem" v-model="visionStore.imgParams.enableGamma" size="1.3rem">
                <span>亮度</span>
                <span class="param-desc">Gamma校正</span>
              </van-checkbox>
            </template>
            <template #label>
              <van-stepper :disabled="!visionStore.imgParams.enableGamma" button-size="1.6rem"
                v-model="visionStore.imgParams.gamma" step="0.1" min="0" max="3" />
            </template>
          </van-cell>

          <van-cell label-class="label">
            <template #title>
              <van-checkbox shape="square" icon-size="1rem" v-model="visionStore.imgParams.enableGaussian"
                size="1.3rem">
                <span>模糊</span>
                <span class="param-desc">高斯模糊</span>
              </van-checkbox>
            </template>
            <template #label>
              size: <van-stepper button-size="1.6rem" step="2" min="1" 
                :disabled="!visionStore.imgParams.enableGaussian" v-model="visionStore.imgParams.gaussian[0]" />
              sigmaX:<van-stepper button-size="1.6rem" step="1" min="1" 
                :disabled="!visionStore.imgParams.enableGaussian" v-model="visionStore.imgParams.gaussian[1]" />
            </template>
          </van-cell>
        </van-cell-group>
        <van-cell-group title="边缘检测" inset :border="false">
          <van-cell label-class="label">
            <template #title>
              <van-checkbox shape="square" icon-size="1rem" v-model="visionStore.imgParams.enableSobel" size="1.3rem">
                <span>Sobel算子</span>
                <span class="param-desc">离散的微分算子</span>
              </van-checkbox>
            </template>
            <template #label>
              size: <van-stepper button-size="1.6rem" step="2" min="1" max="7"
                :disabled="!visionStore.imgParams.enableSobel" v-model="visionStore.imgParams.sobel[0]" />
              scale:<van-stepper button-size="1.6rem" step="1" min="1" max="31"
                :disabled="!visionStore.imgParams.enableSobel" v-model="visionStore.imgParams.sobel[1]" />
            </template>
          </van-cell>
          <van-cell label-class="label">
            <template #title>
              <van-checkbox shape="square" icon-size="1rem" v-model="visionStore.imgParams.enableScharr" size="1.3rem">
                <span>Scharr算子</span>
                <span class="param-desc">通常用于特征提取和特征检测</span>
              </van-checkbox>
            </template>
            <template #label>
              <van-stepper button-size="1.6rem" step="2" min="1" max="31"
                :disabled="!visionStore.imgParams.enableScharr" v-model="visionStore.imgParams.scharr" />
            </template>
          </van-cell>
          <van-cell label-class="label">
            <template #title>
              <van-checkbox shape="square" icon-size="1rem" v-model="visionStore.imgParams.enableLaplace" size="1.3rem">
                <span>拉普拉斯算子</span>
                <span class="param-desc">通常用于特征提取和特征检测</span>
              </van-checkbox>
            </template>
            <template #label>
              size: <van-stepper :disabled="!visionStore.imgParams.enableLaplace" button-size="1.6rem"
                v-model="visionStore.imgParams.laplace[0]" step="2" min="1" max="7" />
              scale:<van-stepper :disabled="!visionStore.imgParams.enableLaplace" button-size="1.6rem"
                v-model="visionStore.imgParams.laplace[1]" step="1" min="1" max="31" />
            </template>
          </van-cell>
          <van-cell label-class="label">
            <template #title>
              <van-checkbox shape="square" icon-size="1rem" v-model="visionStore.imgParams.enableCanny" size="1.3rem">
                <span>canny</span>
                <span class="param-desc">边缘检测 [ {{ visionStore.imgParams.cannyThreshold.toString() }} ]</span>
              </van-checkbox>
            </template>

            <template #label>
              <van-slider range :max="160" :min="60" bar-height="8px" class="param-value"
                :disabled="!visionStore.imgParams.enableCanny" v-model="visionStore.imgParams.cannyThreshold">
              </van-slider>
            </template>
          </van-cell>
        </van-cell-group>

        <van-cell-group title="噪声滤波" inset :border="false">
          <van-cell title="均值滤波">
            <template #label>
              <van-slider bar-height="4px" class="param-value">
                <template #button>
                  <van-button round type="primary" size="mini">{{ enhance }}</van-button>
                </template>
              </van-slider>
            </template>
          </van-cell>
          <van-cell title="中值滤波">
            <template #label>
              <van-slider bar-height="4px" class="param-value">
                <template #button>
                  <van-button round type="primary" size="mini">{{ enhance }}</van-button>
                </template>
              </van-slider>
            </template>
          </van-cell>
          <van-cell title="高斯滤波">
            <template #label>
              <van-slider bar-height="4px" class="param-value">
                <template #button>
                  <van-button round type="primary" size="mini">{{ enhance }}</van-button>
                </template>
              </van-slider>
            </template>
          </van-cell>
        </van-cell-group>
      </OverlayScrollbarsComponent>
    </van-col>
    <OverlayScrollbarsComponent class="right-panel" :options="{ scrollbars: { theme: `os-theme-${reverseTheme}`, } }"
      defer style="text-align: center;">
      <div class="drag-bar" v-if="!isWeb"></div>
      <face-rec />
    </OverlayScrollbarsComponent>

    <van-popup v-model:show="showPopup" position="right" :closeable="isWeb" close-icon="close">
      <settings v-if="showSettings" />
    </van-popup>
  </van-row>
</template>

<script lang="ts" setup>
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'
import { ConfigProviderTheme, List, showNotify, Loading } from 'vant'
import { inject, onMounted, provide, Ref, ref, watch, defineAsyncComponent } from 'vue'
import Settings from '../settings/Settings.vue'
import { VisionStore, CommonStore } from '../../store'

const FaceRec = defineAsyncComponent({
  loader: () => import('./FaceRec.vue'),
  loadingComponent: Loading,
  hydrate: () => {
    console.info('loaded')
  }
})
const isWeb = __IS_WEB__
const theme = inject<Ref<ConfigProviderTheme>>('theme')

const showSettings = ref<boolean>(false)
const reverseTheme = ref<string>(theme.value == 'dark' ? 'light' : 'dark')

provide('showSettings', showSettings)

const commonStore = CommonStore()
const visionStore = VisionStore()
const show = ref<boolean>(false)
const enhance = ref(0)
const showPopup = ref(false)

onMounted(() => {
  if (!__IS_WEB__) {
    window.mainApi.onOpenSettings(() => { openSettings() })
  }
})

watch(() => theme.value, () => {
  reverseTheme.value = theme.value == 'dark' ? 'light' : 'dark'
})

function openSettings() {
  showPopup.value = true
  showSettings.value = true
}

</script>

<style>
.badge-dot {
  position: absolute;
  display: block;
  border-radius: 50%;
  font-size: 4px;
  width: 8px;
  height: 8px;
  background-color: var(--van-danger-color);
  top: -3px;
  right: -3px;
}

.left-panel {
  flex-grow: 1;
  min-width: 340px;
  height: calc(100% - 10px);
  margin: 5px;
}

.right-panel {
  flex-grow: 19;
  flex-basis: 50%;
  min-width: 375px;
  height: calc(100vh - 10px);
  margin: 5px 2px;
  overflow: hidden;
  overflow-y: auto;
}

.left-panel-icon {
  font-size: 1.4rem;
  margin: 3px 6px;
  color: var(--van-gray-8)
}

.snap-panel {
  width: 100%;
  height: calc(100vh - 54px);
  overflow-y: auto;
  overflow-x: hidden;
  margin: 5px 0 0 0;
}

.param-desc {
  color: var(--van-gray-6);
  margin-left: 5px;
  font-size: 0.6rem;
}

.param-value {
  margin: 10px;
  width: calc(100% - 20px);
}

.register-url {
  text-decoration: underline;
  width: 300px;
  color: var(--van-text-color);
  padding: 5px;
  font-size: 0.8rem;
  user-select: text;
  word-break: break-all;
  cursor: pointer;
}

.register-url:focus {
  font-weight: bold;
}

a {
  color: rgb(31, 187, 166);
  text-decoration: underline;
}

.label {
  padding: 15px 0;
}
</style>
