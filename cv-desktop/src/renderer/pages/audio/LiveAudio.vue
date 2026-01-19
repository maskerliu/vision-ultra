<template>
  <van-row>
    <van-cell-group inset title="HLS">
      <van-field center placeholder="HLS URL" label-width="3rem" v-model="streamUrl">
        <template #left-icon>
          <div style="display: flex; justify-content: center;">
            <van-icon class-prefix="iconfont" name="link" style="color: var(--van-gray-8)" />
            <div style="position: absolute; bottom: -5px; left: 0; font-size: 10px; color: red;">{{ bandwidth }}kbps
            </div>
          </div>
        </template>
        <template #button>
          <van-button size="small" type="primary" icon="play" @click="onHlsClick" :loading="playerLoading">
            <template #icon>
              <van-icon class-prefix="iconfont" :name="playerStatus ? 'player-pause' : 'player-play'"
                style="color: var(--van-gray-8)" />
            </template>
          </van-button>
        </template>
      </van-field>
      <video ref="hlsPlayer" width="100%" height="100px" controls></video>
    </van-cell-group>
  </van-row>

</template>
<script lang="ts" setup>

import Hls from 'hls.js'
import { inject, onMounted, Ref, ref, useTemplateRef, watch } from 'vue'
import { CommonStore } from '../../store'

const commonStore = CommonStore()
const showDebugPanel = inject<Ref<boolean>>('showDebugPanel')
const sseData = ref<string>('hello world')
const playerStatus = ref<boolean>(false)
const playerLoading = ref<boolean>(false)
const streamUrl = ref<string>('https://iovliveplay.radio.cn/fm/1600000001173.m3u8')
const bandwidth = ref<string>('0')

const hlsPlayer = useTemplateRef<HTMLMediaElement>('hlsPlayer')


let hls: Hls
let timer: any

onMounted(async () => {
  if (hls == null) hls = new Hls()
})


watch(showDebugPanel, (val, old) => {
  if (!val) {
    hlsPlayer.value.pause()
    hls?.stopLoad()
    hls?.destroy()
  } else {
    initHls()
  }
})



function initHls() {
  if (hls != null) return

  hls = new Hls({ maxBufferLength: 30 })

  timer = setInterval(() => {
    bandwidth.value = (hls?.bandwidthEstimate % 1000 || 0).toFixed(2)
  }, 1000)

  hls.on(Hls.Events.MANIFEST_PARSED, function () {
    hlsPlayer.value.play()
  })

  hls.on(Hls.Events.ERROR, function (event, data) {
    switch (data.type) {
      case Hls.ErrorTypes.NETWORK_ERROR:
        console.log('network error', event)
        hls.startLoad()
        break
      case Hls.ErrorTypes.MEDIA_ERROR:
        console.log('media error', event)
        hls.recoverMediaError()
        break
      default:
        hls.destroy()
        console.log('other error', event)
        break
    }
  })

  hls.on(Hls.Events.BUFFER_EOS, function (event, data) {
    console.log('buffer eos', event)
    hls.startLoad()
  })

  // hls.on(Hls.Events.BUFFER_APPENDED, function (event, data) {
  //   console.log('buffer appended', event, data)
  // })

  hls.on(Hls.Events.BUFFER_FLUSHED, function (event, data) {
    console.log('buffer flushed', event)
  })
}


function onHlsClick() {

  if (playerStatus.value) {
    playerStatus.value = false
    hlsPlayer.value.pause()
    hls?.stopLoad()
    clearTimeout(timer)
  } else {
    timer = setInterval(() => {
      bandwidth.value = (hls?.bandwidthEstimate % 1000 || 0).toFixed(2)
    }, 1000)
    playerStatus.value = true
    if (Hls.isSupported()) {
      hls?.loadSource(streamUrl.value)
      hls?.attachMedia(hlsPlayer.value)
      // hls.on(Hls.Events.MANIFEST_PARSED, function () {
      //   hlsPlayer.value.play()
      // })


      // hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, function (event, data) {
      //   console.log('lists has been updated', event, data)
      // })

      // hls.on(Hls.Events.AUDIO_TRACK_LOADING, function (event, data) {
      //   console.log('audio track  loading starts', event, data)
      // })

      // hls.on(Hls.Events.AUDIO_TRACK_LOADED, function (event, data) {
      //   console.log('audio track  loading completed', event, data)
      // })


      // hls.on(Hls.Events.FRAG_LOADING, function (event, data) {
      //   console.log('frag loading starts', event, data)
      // })

      // hls.on(Hls.Events.FRAG_LOADED, function (event, data) {
      //   console.log('frag loading completed', event, data)
      // })

      // hls.on(Hls.Events.FRAG_PARSED, function (event, data) {
      //   console.log('frag parsed', event, data)
      // })

      // hls.on(Hls.Events.FRAG_BUFFERED, function (event, data) {
      //   console.log('frag buffered', event, data)
      // })

      // hls.on(Hls.Events.FRAG_CHANGED, function (event, data) {
      //   console.log('frag changed', event, data)
      // })


    } else if (hlsPlayer.value.canPlayType('application/vnd.apple.mpegurl')) {
      hlsPlayer.value.src = streamUrl.value
    }
  }
}

</script>