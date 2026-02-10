<template>
  <van-config-provider :theme="theme" :theme-vars="themeVars" theme-vars-scope="global">
    <router-view class="biz-content" v-slot="{ Component, route }">
      <transition name="fade">
        <component :is="Component" :key="route.path" />
      </transition>
    </router-view>

    <van-floating-bubble v-if="enableDebug" :offset="offset" axis="xy" :gap="10" magnetic="x" @click="onOpenDebugPanel">
      <template #default>
        <van-icon class-prefix="iconfont" name="debug" style="font-size: 1.2rem;" />
      </template>
    </van-floating-bubble>

    <van-popup v-model:show="showDebugPanel" position="left" closeable close-icon="close">
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

import { ConfigProviderTheme, ConfigProviderThemeVars } from 'vant'
import { onMounted, provide, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import DebugPanel from './pages/components/DebugPanel.vue'
import { CommonStore } from './store'

const i18n = useI18n()
const canRender = ref(true)
const theme = ref<ConfigProviderTheme>('light')
const themeVars = ref<ConfigProviderThemeVars>({
  fontSizeXs: '9px',
  fontSizeSm: '11px',
  fontSizeMd: '13px',
  fontSizeLg: '15px',
})

const lang = ref<string>('zh-CN')
const active = ref<number>(0)
const showDebugPanel = ref<boolean>(false)
const enableDebug = true
const showLoading = ref<boolean>(false)
const offset = ref({
  x: window.innerWidth - 42,
  y: window.innerHeight - 100
})

provide('theme', theme)
provide('themeVars', themeVars)
provide('lang', lang)
provide('showDebugPanel', showDebugPanel)
provide('showLoading', showLoading)

onMounted(async () => {

  window.isWeb = window.mainApi == null

  useRouter().beforeEach((to: any, from: any) => {
    return true
  })

  window.addEventListener('resize', () => {
    offset.value.x = window.innerWidth - 42
    offset.value.y = window.innerHeight - 100
  })

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
  --van-floating-bubble-size: 2.5rem;
  --van-grid-item-content-padding: 8px;
  --van-popover-radius: var(--van-radius-sm);
  --van-switch-size: 1.2rem;
  --van-radio-size: 1rem;
  --van-checkbox-size: 1rem;
  --van-font-size-xs: 9px;
  --van-font-size-sm: 11px;
  --van-font-size-md: 13px;
  --van-font-size-lg: 15px;
  --van-cell-group-inset-padding: 5px;
  --van-cell-group-inset-title-padding: 5px 20px;
  --van-icon-font-family: "iconfont";
  --van-collapse-item-content-padding: 0px;
  --van-dialog-border-radius: 6px;
  --van-tag-font-size: 0.6rem;
  --van-tag-padding: 2px 5px;
  --van-tag-border-radius: 5px;
  --van-cell-vertical-padding: 8px;
  --van-cell-horizontal-padding: 15px;
  --van-popup-round-radius: 8px;
  --van-popup-close-icon-margin: 23px;
  --van-border-width: 1px;
  --van-radius-md: 5px;
  --van-dialog-radius: 8px;
  --van-floating-bubble-background: #f04b1e;
}

#app {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Oxygen", "Ubuntu",
    "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: small;
  background: var(--van-gray-1);
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
  /* margin: 5px; */
  padding: 0;
  /* border-radius: 8px; */
  /* border: 1px solid #e1e1e1; */
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
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 32px;
  pointer-events: auto;
  /* background: linear-gradient(to bottom, var(--van-gray-1), #000); */
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