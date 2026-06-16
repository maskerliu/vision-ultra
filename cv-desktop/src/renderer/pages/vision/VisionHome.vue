<template>
  <van-row>
    <transition name="fade">
      <apm-panel v-if="commonStore.showApm" />
    </transition>

    <van-col class="left-panel">
      <van-row justify="space-between">
        <van-row style="color: #c0392b;">
          <van-icon class-prefix="iconfont" name="sjtu-logo" style="font-size: 1.4rem; margin: 7px 10px 0 15px;" />
          <van-icon class-prefix="iconfont" name="sjtu-name" style="font-size: 1.4rem; margin: 6px 0 0 0;" />
        </van-row>
        <van-row style="z-index: 100; -webkit-app-region: no-drag; margin: 2px 5px;">
          <van-icon class-prefix="iconfont" class="left-panel-icon" name="ai-chat"
            @click="router.push({ name: 'AIHome' })" />
          <van-icon class-prefix="iconfont" class="left-panel-icon" name="apm"
            @click="commonStore.showApm = !commonStore.showApm" />
          <van-icon class-prefix="iconfont" class="left-panel-icon" name="face-db"
            @click="commonStore.showFaceDbMgr = true" />
          <van-icon class-prefix="iconfont" class="left-panel-icon" name="setting"
            @click="commonStore.showSettings = true">
            <span class="badge-dot"></span>
          </van-icon>
        </van-row>
      </van-row>
      <OverlayScrollbarsComponent class="border-bg snap-panel"
        :options="{ scrollbars: { theme: `os-theme-${reverseTheme}` } }" defer>
        <cv-control-panel />
      </OverlayScrollbarsComponent>
    </van-col>

    <detect-rec class="right-panel border-bg" />

    <van-popup v-model:show="showPopup" position="right" close-icon="close" @closed="onPanelClosed">
      <settings v-if="commonStore.showSettings" />
      <face-db-mgr v-else-if="commonStore.showFaceDbMgr" />
    </van-popup>
  </van-row>
</template>
<script lang="ts" setup>

import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { CommonStore } from '../../store'
import ApmPanel from '../components/ApmPanel.vue'
import Settings from '../settings/Settings.vue'
import CvControlPanel from './CVControlPanel.vue'
import DetectRec from './DetectRec.vue'
import FaceDbMgr from './FaceDbMgr.vue'

// const DetectRec = defineAsyncComponent({
//   loader: () => import('./DetectRec.vue'),
//   loadingComponent: Loading,
//   hydrate: () => {
//     console.info('loaded')
//   }
// })

const isWeb = window.isWeb

const reverseTheme = ref<string>('dark')
const showPopup = ref(false)
const commonStore = CommonStore()
const router = useRouter()

onMounted(() => {
  reverseTheme.value = commonStore.theme == 'dark' ? 'light' : 'dark'
  window.mainApi?.onOpenSettings(() => { commonStore.showSettings = true })
})

watch(() => commonStore.theme, () => {
  reverseTheme.value = commonStore.theme == 'dark' ? 'light' : 'dark'
})

watch(
  [
    () => commonStore.showSettings,
    () => commonStore.showFaceDbMgr
  ],
  () => {
    showPopup.value = commonStore.showSettings || commonStore.showFaceDbMgr
  }
)

function onPanelClosed() {
  commonStore.showSettings = false
  commonStore.showFaceDbMgr = false
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
}

.right-panel {
  position: relative;
  background-color: transparent;
  flex-grow: 19;
  flex-basis: 50%;
  min-width: 620px;
  margin: 5px 5px 8px 5px;
  overflow: hidden auto;
}

.left-panel-icon {
  cursor: pointer;
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
