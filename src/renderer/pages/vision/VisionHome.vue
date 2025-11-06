<template>
  <van-row>
    <van-col class="border-bg left-panel">
      <van-row justify="space-between">
        <van-checkbox-group size="mini" direction="horizontal" style="width: 235px;">
          <van-checkbox shape="square" name="5010" style="padding: 5px 10px">
            <i class="iconfont icon-api" style="font-weight: blod"></i>
          </van-checkbox>
          <van-checkbox shape="square" name="5020" style="padding: 5px 10px">
            <van-icon class="iconfont icon-statistics" style="font-weight: blod" />
          </van-checkbox>
          <van-checkbox shape="square" name="5030" style="padding: 5px 10px">
            <van-icon class="iconfont icon-websocket" style="font-weight: blod" />
          </van-checkbox>
        </van-checkbox-group>
        <div style="padding: 1px 0;">
          <van-icon class="iconfont icon-qrcode left-panel-icon" @click="commonStore.showQrCode = true" />
          <van-icon class="iconfont icon-rule left-panel-icon" @click="" />
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
              <van-switch v-model="visionStore.isGray"></van-switch>
            </template>
          </van-cell>
          <van-cell>
            <template #title>
              <span>亮度</span>
              <span class="param-desc">Gamma校正</span>
            </template>
            <template #label>
              <van-slider v-model="visionStore.brightness" bar-height="4px" class="param-value"
                @change="onBrightnessChange">
                <template #button>
                  <van-button round type="primary" size="mini">{{ visionStore.brightness }}</van-button>
                </template>
              </van-slider>
            </template>
          </van-cell>
          <van-cell>
            <template #title>
              <span>对比度</span>
              <span class="param-desc">直方图均衡</span>
            </template>
            <template #label>
              <van-slider v-model="visionStore.contrast" bar-height="4px" class="param-value"
                @change="onContrastChange">
                <template #button>
                  <van-button round type="primary" size="mini">{{ visionStore.contrast }}</van-button>
                </template>
              </van-slider>
            </template>
          </van-cell>
          <van-cell>
            <template #title>
              <span>边缘增强</span>
              <span class="param-desc">拉普拉斯增强</span>
            </template>
            <template #label>
              <van-slider v-model="visionStore.laplace" bar-height="4px" class="param-value">
                <template #button>
                  <van-button round type="primary" size="mini">{{ visionStore.laplace }}</van-button>
                </template>
              </van-slider>
            </template>
          </van-cell>
        </van-cell-group>

        <van-cell-group title="噪声滤波" inset :border="false">
          <van-cell title="均值滤波">
            <template #label>
              <van-slider v-model="visionStore.enhance" bar-height="4px" class="param-value">
                <template #button>
                  <van-button round type="primary" size="mini">{{ enhance }}</van-button>
                </template>
              </van-slider>
            </template>
          </van-cell>
          <van-cell title="中值滤波">
            <template #label>
              <van-slider v-model="visionStore.enhance" bar-height="4px" class="param-value">
                <template #button>
                  <van-button round type="primary" size="mini">{{ enhance }}</van-button>
                </template>
              </van-slider>
            </template>
          </van-cell>
          <van-cell title="高斯滤波">
            <template #label>
              <van-slider v-model="visionStore.enhance" bar-height="4px" class="param-value">
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

const enhance = ref(0)
const showPopup = ref(false)

const showSettings = ref<boolean>(false)
const reverseTheme = ref<string>(theme.value == 'dark' ? 'light' : 'dark')

provide('showSettings', showSettings)

const commonStore = CommonStore()
const visionStore = VisionStore()
const show = ref<boolean>(false)

onMounted(() => {
  if (!__IS_WEB__) {
    window.mainApi.onOpenSettings(() => { openSettings() })
  }
})

watch(() => theme.value, () => {
  reverseTheme.value = theme.value == 'dark' ? 'light' : 'dark'
})

watch(() => visionStore.brightness, () => {
  console.info('brightness', visionStore.brightness)
})

function onBrightnessChange() {

}

function onContrastChange() {

}

function onEnhanceChange() {
}

function openSettings() {
  showPopup.value = true
  showSettings.value = true
}

async function saveProxyDelay() {
  try {
    showNotify({ message: '成功设置延迟', type: 'success', duration: 500 })
  } catch (err) {
    showNotify({ message: '设置延迟失败', type: 'danger', duration: 1200 })
  }
}

function onMockRecordStart() {

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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.v-enter-active,
.v-leave-active {
  transition: opacity 0.4s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}

.v-enter-to,
.v-leave-from {
  opacity: 1;
}
</style>
