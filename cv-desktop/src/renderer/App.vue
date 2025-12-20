<template>
  <van-config-provider :theme="theme" class="full-row">
    <router-view class="biz-content" v-slot="{ Component, route }">
      <transition name="fade">
        <component :is="Component" :key="route.path" />
      </transition>
    </router-view>

    <van-floating-bubble v-if="enableDebug" :offset="offset" axis="xy" :gap="10" magnetic="x"
      @click="onOpenDebugPanel">

      <template #default>
        <van-icon class="iconfont icon-debug" style="font-size: 1.6rem;" />
      </template>
    </van-floating-bubble>

    <van-popup v-model:show="showDebugPanel" position="left" closeable close-icon="close">
      <debug-panel />
    </van-popup>

    <van-overlay :show="showLoading" style="display: flex; align-items: center; flex-direction: column;">
      <van-row justify="center" class="loading">
        <van-loading />
        <div style="margin: 5px 15px;">{{ $t('common.componetLoading') }}</div>
      </van-row>
    </van-overlay>
  </van-config-provider>
</template>

<script lang="ts" setup>
import { ConfigProviderTheme } from 'vant'
import { onMounted, provide, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import DebugPanel from './pages/components/DebugPanel.vue'
import { CommonStore } from './store'
import { windowWidth } from 'vant/lib/utils'

const i18n = useI18n()
const canRender = ref(true)
const theme = ref<ConfigProviderTheme>('light')
const lang = ref<string>('zh-CN')
const active = ref<number>(0)
const showDebugPanel = ref<boolean>(false)
const enableDebug = true
const showLoading = ref<boolean>(false)
const offset = {
  x: window.innerWidth - 60,
  y: window.innerHeight - 100
}

provide('theme', theme)
provide('lang', lang)
provide('showDebugPanel', showDebugPanel)
provide('showLoading', showLoading)

onMounted(async () => {

  window.isWeb = window.mainApi == null

  useRouter().beforeEach((to: any, from: any) => {
    return true
  })


  window.onresize = () => {
    offset.x = window.innerWidth - 60
    offset.y = window.innerHeight - 100
  
  }
  useRouter().replace("/visionHome")
  active.value = 1

  let wrapTheme = window.localStorage.getItem('theme')
  theme.value = wrapTheme != null ? wrapTheme as ConfigProviderTheme : 'light'

  let wrapLang = window.localStorage.getItem('lang')
  lang.value = wrapLang != null ? wrapLang : 'zh-CN'
  i18n.locale.value = lang.value

  window.mainApi?.setAppTheme(theme.value)
  if (window.mainApi) {
    window.mainApi?.getSysSettings(async (result) => {
      await CommonStore().init(result)
    })
  } else {
    await CommonStore().init()
  }

  canRender.value = true
})

function onOpenDebugPanel() {
  showDebugPanel.value = true
}

</script>

<style>
.van-theme-light {
  --van-white: white;
  --van-black: #333;
  --van-gray-1: #ecedee;
  --van-gray-8: #69696b;
}

.van-theme-dark {
  --van-white: rgb(24, 23, 23);
  --van-black: #efecec;
  --van-gray-1: #272728;
  --van-gray-8: #ccccce;
}

:root {
  --van-collapse-item-content-padding: 0px;
  --van-dialog-border-radius: 6px;
  --van-tag-font-size: 0.6rem;
  --van-tag-padding: 2px 5px;
  --van-tag-border-radius: 5px;
  --van-cell-vertical-padding: 5px;
  --van-cell-horizontal-padding: 10px;
  --van-popup-round-radius: 8px;
  --van-popup-close-icon-margin: 23px;
  --van-border-width: 1.4px;
  --van-radius-md: 8px;
  --van-dialog-radius: 8px;
  --van-floating-bubble-background: #f04b1e;
}

#app {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Oxygen", "Ubuntu",
    "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
  background: var(--van-gray-1);
  letter-spacing: 1px;
  /* -moz-user-select: none;
  -webkit-user-select: none;
  -ms-user-select: none;
  user-select: none; */
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  user-select: none;
  scroll-behavior: smooth;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
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
  /* background: var(--van-background); */
  overflow: hidden;
}

.border-bg {
  margin: 5px;
  padding: 0;
  /* border-radius: 8px;
  border: 1px solid #e1e1e1; */
  box-shadow: 0px 12px 8px -12px #000;
}

.biz-content {
  width: 100%;
  min-width: 375px;
  height: 100vh;
  background: var(--van-gray-1);
  overflow: hidden auto;
}

.drag-bar {
  width: 100%;
  height: 30px;
  position: fixed;
  background: linear-gradient(to bottom, var(--van-gray-1), transparent);
  -webkit-app-region: drag;
  z-index: -1;
}

.rule-mgr-cell-value {
  flex: 0 0 120px !important;
}

.van-tabs__nav--card {
  box-sizing: border-box;
  height: var(--van-tabs-card-height);
  margin: 0;
  border: var(--van-border-width) solid var(--van-tabs-default-color);
  border-radius: var(--van-radius-sm);
}

.loading {
  width: 20%;
  padding: 10px 5px;
  margin-top: 20%;
  background-color: #2c3e50e0;
  border-radius: 10px;
  font-size: 0.8rem;
  color: #bdc3c7;
}
</style>