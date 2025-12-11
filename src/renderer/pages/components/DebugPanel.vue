<template>
  <van-form class="debug-panel" label-align="right" colon>
    <van-cell-group inset :title="$t('debug.common.title')">
      <van-cell :title="$t('debug.common.versionCheck')" clickable @click="toNew"></van-cell>
      <van-cell :title="$t('debug.common.devTools')" clickable @click="openDevTools"></van-cell>
    </van-cell-group>

    <van-cell-group inset title="Event Source">
      <van-cell title="trigger server notification" :label="sseData" is-link @click="onSSE"></van-cell>
    </van-cell-group>
  </van-form>
</template>

<script lang="ts" setup>
import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source'
import { inject, onMounted, onUnmounted, Ref, ref } from 'vue'
import { baseDomain, ProxyMock } from '../../../common'
import { CommonStore } from '../../store'

const commonStore = CommonStore()
const showDebugPanel = inject<Ref<boolean>>('showDebugPanel')
const sseData = ref<string>('hello world')

onMounted(async () => {

  await registerSSE()
})

onUnmounted(() => {
  console.log('unmounted')
})

async function registerSSE() {
  // await fetchEventSource(`${baseDomain()}/_/sse/${commonStore.uid}`, {
  //   headers: {
  //     'x-mock-uid': commonStore.uid
  //   },
  //   async onopen(resp) {
  //     if (resp.ok && resp.headers.get('content-type') === EventStreamContentType) {
  //       return // everything's good
  //     } else if (resp.status >= 400 && resp.status < 500 && resp.status !== 429) {
  //       // client-side errors are usually non-retriable:
  //       throw new Error('Fatal')
  //     } else {
  //       throw new Error('Retriable')
  //     }
  //   },
  //   onmessage(ev) {
  //     sseData.value = ev.data
  //   },
  //   onclose() {
  //     console.log('closed')
  //   },
  //   onerror(err) {
  //     console.log(err)
  //   },
  // })
}

function toNew() {
  alert('去新版')
}

function openDevTools() {
  window.mainApi?.openDevTools()
  showDebugPanel.value = false
}

async function onSSE() {
  window.mainApi?.sendServerEvent()
  await ProxyMock.broadcast(commonStore.uid)
}

</script>

<style scoped>
.drag-ball {
  position: absolute;
  z-index: 10003;
  right: 0;
  top: 70%;
  width: 2.5em;
  height: 2.5em;
  background: #e1e1e1aa;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0px 0px 10px 2px skyblue;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}

.debug-panel {
  width: 100%;
  min-width: 375px;
  height: 100vh;
  padding: 10px 0;
  background-color: var(--van-gray-1);
}
</style>
