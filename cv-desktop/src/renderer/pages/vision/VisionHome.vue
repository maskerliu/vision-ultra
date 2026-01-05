<template>
  <van-row>
    <van-sticky class="drag-bar" v-if="!isWeb"></van-sticky>
    <van-col class="left-panel">
      <van-row justify="space-between">
        <van-row style="color: #c0392b;">
          <van-icon class-prefix="iconfont" name="sjtu-logo" style="font-size: 1.4rem; margin: 5px 10px;" />
          <van-icon class-prefix="iconfont" name="sjtu-name" style="font-size: 1.4rem; margin: 5px 0;" />
        </van-row>
        <div style="padding: 1px 0;">
          <van-icon class-prefix="iconfont" class="left-panel-icon" name="apm"
            @click="commonStore.showApm = !commonStore.showApm" />
          <van-icon class-prefix="iconfont" class="left-panel-icon" name="data" @click="openFaceDbMgr" />
          <van-icon class-prefix="iconfont" class="left-panel-icon" name="setting" @click="openSettings">
            <span class="badge-dot"></span>
          </van-icon>
        </div>
      </van-row>
      <OverlayScrollbarsComponent class="border-bg snap-panel"
        :options="{ scrollbars: { theme: `os-theme-${reverseTheme}` } }" defer>
        <cv-control-panel />
      </OverlayScrollbarsComponent>
    </van-col>

    <detect-rec class="right-panel border-bg" />

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
import Settings from '../settings/Settings.vue'
import CvControlPanel from './CVControlPanel.vue'
import FaceDbMgr from './FaceDbMgr.vue'
// import FaceRec from './FaceRec.vue'

const DetectRec = defineAsyncComponent({
  loader: () => import('./DetectRec.vue'),
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
  min-width: 300px;
  height: calc(100vh - 10px);
  margin: 5px;
  z-index: 500;
}

.right-panel {
  position: relative;
  flex-grow: 19;
  flex-basis: 50%;
  min-width: 620px;
  margin: 5px 5px 8px 5px;
  overflow: hidden auto;
}

.left-panel-icon {
  font-size: 1.2rem;
  margin: 5px;
  color: var(--van-gray-8)
}

.snap-panel {
  height: calc(100vh - 45px);
  margin: 0;
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
</style>
