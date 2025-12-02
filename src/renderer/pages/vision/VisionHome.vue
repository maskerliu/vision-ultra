<template>
  <van-row>
    <van-col class="border-bg left-panel">
      <van-row justify="space-between">
        <van-row style="color: #c0392b;">
          <van-icon class="iconfont icon-sjtu-logo" style="font-size: 1.6rem; margin-left: 10px;" />
          <van-icon class="iconfont icon-sjtu-name" style="font-size: 1.4rem; margin: 2px 10px;" />
        </van-row>
        <div style="padding: 1px 0;">
          <van-icon class="iconfont icon-apm left-panel-icon" @click="commonStore.showApm = !commonStore.showApm" />
          <van-icon class="iconfont icon-data left-panel-icon" @click="openFaceDbMgr" />
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
    <van-col class="right-panel" :options="{ scrollbars: { theme: `os-theme-${reverseTheme}`, } }" defer
      style="text-align: center;">
      <div class="drag-bar" v-if="!isWeb"></div>
      <apm-panel v-if="commonStore.showApm" />
      <face-rec />
    </van-col>

    <van-popup v-model:show="showPopup" position="right" close-icon="close">
      <settings v-if="showSettings" />
      <face-db-mgr v-else-if="showFaceDbMgr" />
    </van-popup>
  </van-row>
</template>
<script lang="ts" setup>
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'
import { ConfigProviderTheme, Loading } from 'vant'
import { defineAsyncComponent, inject, onMounted, provide, Ref, ref, watch } from 'vue'
import { CommonStore } from '../../store'
import ApmPanel from '../components/ApmPanel.vue'
import Settings from '../settings/Settings.vue'
import FaceDbMgr from './FaceDbMgr.vue'
import ImgParamsPanel from './ImgParamsPanel.vue'
// import FaceRec from './FaceRec.vue'

const FaceRec = defineAsyncComponent({
  loader: () => import('./FaceRec.vue'),
  loadingComponent: Loading,
  hydrate: () => {
    console.info('loaded')
  }
})

const isWeb = window.isWeb
const theme = inject<Ref<ConfigProviderTheme>>('theme')

const showSettings = ref<boolean>(false)
const reverseTheme = ref<string>(theme.value == 'dark' ? 'light' : 'dark')
const showPopup = ref(false)
const showFaceDbMgr = ref(false)
const commonStore = CommonStore()

provide('showSettings', showSettings)

onMounted(() => {
  window.mainApi?.onOpenSettings(() => { openSettings() })
})

watch(() => theme.value, () => {
  reverseTheme.value = theme.value == 'dark' ? 'light' : 'dark'
})

function openFaceDbMgr() {
  showPopup.value = true
  showFaceDbMgr.value = true
  showSettings.value = false
}

function openSettings() {
  showPopup.value = true
  showSettings.value = true
  showFaceDbMgr.value = false
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
  height: calc(100vh - 10px);
  margin: 5px;
}

.right-panel {
  position: relative;
  flex-grow: 19;
  flex-basis: 50%;
  min-width: 620px;
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
  height: calc(100vh - 45px);
  overflow-y: auto;
  overflow-x: hidden;
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
