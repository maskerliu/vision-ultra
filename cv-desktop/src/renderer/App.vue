<template>
  <van-config-provider :theme="commonStore.theme" :theme-vars="commonStore.themeVars" theme-vars-scope="global">
    <div class="drag-bar" v-if="!isWeb"></div>
    <router-view class="biz-content" v-slot="{ Component, route }">
      <transition name="fade" v-if="canRender">
        <component :is="Component" :key="route.path" />
      </transition>
    </router-view>

    <van-floating-bubble v-if="enableDebug" :offset="offset" axis="xy" :gap="10" magnetic="x" @click="onOpenDebugPanel">
      <template #default>
        <van-icon class-prefix="iconfont" name="debug" style="font-size: 1.2rem;" />
      </template>
    </van-floating-bubble>

    <van-popup v-model:show="commonStore.showDebugPanel" position="left" closeable close-icon="close">
      <debug-panel />
    </van-popup>

    <van-overlay :show="showLoading" teleport="#app"
      style="width:100vw; height: 100vh; align-items: center; flex-direction: column; z-index: 2000;">
      <van-row justify="center" class="loading">
        <van-loading />
        <div style="margin: 5px 15px;">{{ $t('common.loading') }}</div>
      </van-row>
    </van-overlay>

  </van-config-provider>
</template>

<script lang="ts" setup>

import DebugPanel from '@renderer/pages/components/DebugPanel.vue'
import { CommonStore } from '@renderer/store'
import { onMounted, provide, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const isWeb = window.isWeb
const commonStore = CommonStore()
const i18n = useI18n()
const canRender = ref(false)
const active = ref<number>(0)
const enableDebug = true
const showLoading = ref<boolean>(false)
const offset = ref({
  x: window.innerWidth - 42,
  y: window.innerHeight - 150
})

provide('showLoading', showLoading)

onMounted(async () => {

  canRender.value = false
  window.isWeb = window.mainApi == null

  useRouter().beforeEach((to: any, from: any) => {
    return true
  })

  window.addEventListener('resize', () => {
    offset.value.x = window.innerWidth - 42
    offset.value.y = window.innerHeight - 150
  })

  if (window.mainApi) {
    window.mainApi?.getBizConfig(async (result) => {
      await commonStore.init(result)
    })
  } else {
    await commonStore.init()
  }

  i18n.locale.value = commonStore.lang
  window.mainApi?.setAppTheme(commonStore.theme)

  canRender.value = true

  useRouter().replace("/visionHome")
  active.value = 1

})

function onOpenDebugPanel() {
  commonStore.showDebugPanel = true
}

</script>

<style>
#app {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Oxygen", "Ubuntu",
    "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: small;
  letter-spacing: 1px;
  -moz-user-select: none;
  -webkit-user-select: none;
  -ms-user-select: none;
  user-select: none;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  user-select: none;
  scroll-behavior: smooth;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: var(--van-gray-1);
}

::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

::-webkit-scrollbar-thumb {
  border-radius: 2px;
  box-shadow: inset 0 0 5px rgba(125, 125, 125, 0.1);
  -webkit-box-shadow: inset 0 0 5px rgba(125, 125, 125, 0.1);
  background: var(--van-gray-8);
}

.full-row {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.border-bg {
  padding: 0;
  box-shadow: 0px 12px 8px -12px #000;
}

.biz-content {
  width: 100%;
  min-width: 375px;
  height: 100vh;
  /* background: var(--van-gray-1); */
  overflow: hidden auto;
}

.drag-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 32px;
  pointer-events: auto;
  /* background: #44444444; */
  -webkit-app-region: drag;
  z-index: 1;
}

.loading {
  width: 20%;
  padding: 10px 5px;
  margin: 20% auto;
  background-color: #262f37e0;
  border-radius: 10px;
  font-size: 0.8rem;
  color: #bdc3c7;
}
</style>