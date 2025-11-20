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
        <img-params-panel />
      </OverlayScrollbarsComponent>
    </van-col>
    <OverlayScrollbarsComponent class="right-panel" :options="{ scrollbars: { theme: `os-theme-${reverseTheme}`, } }"
      defer style="text-align: center;">
      <div class="drag-bar" v-if="!isWeb"></div>
      <apm-panel  />
      <face-rec />
    </OverlayScrollbarsComponent>

    <van-popup v-model:show="showPopup" position="right" :closeable="isWeb" close-icon="close">
      <settings v-if="showSettings" />
    </van-popup>
  </van-row>
</template>
<script lang="ts" setup>
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'
import { inject, onMounted, provide, Ref, ref, watch, defineAsyncComponent } from 'vue'
import { ConfigProviderTheme, showNotify, Loading } from 'vant'
import Settings from '../settings/Settings.vue'
import { CommonStore } from '../../store'
import ImgParamsPanel from './ImgParamsPanel.vue'
import ApmPanel from '../components/ApmPanel.vue'

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
const showPopup = ref(false)
const commonStore = CommonStore()

provide('showSettings', showSettings)

onMounted(() => {
  if (!__IS_WEB__) {
    window.mainApi?.onOpenSettings(() => { openSettings() })
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
