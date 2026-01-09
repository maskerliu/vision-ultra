<template>
  <van-col ref="previewParent">
    <Transition>
      <apm-panel v-if="commonStore.showApm" />
    </Transition>

    <van-row justify="space-between" style="height: 32px; margin-top: 30px;">
      <van-row style="margin-left: 10px;">
        <van-checkbox v-model="showAnnotationPanel">
          <van-icon class-prefix="iconfont" name="mark" />
        </van-checkbox>
      </van-row>
      <van-row style="padding: 0 10px 0 0;">
        <van-image fit="cover" radius="10" width="32" height="32" :src="recFace" />

        <van-button plain size="small" type="primary" style="margin-left: 15px;" @click="openFolder">
          <template #icon>
            <van-icon class-prefix="iconfont" name="open" />
          </template>
        </van-button>

        <van-button plain size="small" type="danger" style="margin-left: 15px;" @click="showNameInputDialog = true">
          <template #icon>
            <van-icon class-prefix="iconfont" name="capture" />
          </template>
        </van-button>
        <van-button plain size="small" type="success" :loading="workerStatus.showProcess" style="margin-left: 15px;"
          @click="onScan">
          <template #icon>
            <van-icon class-prefix="iconfont" name="face-rec" />
          </template>
        </van-button>
        <van-button plain size="small" type="primary" style="margin-left: 15px;" @click="showLiveStreamInput = true">
          <template #icon>
            <van-icon class-prefix="iconfont" name="live-stream" />
          </template>
        </van-button>
        <van-button plain size="small" type="default" style="margin-left: 15px;" @click="onClickCamera">
          <template #icon>
            <van-icon class-prefix="iconfont" name="camera" />
          </template>
        </van-button>
      </van-row>
    </van-row>

    <media-controller audio class="media-controller">
      <Transition>
        <annotation-panel ref="annotationPanel" v-show="showAnnotationPanel" :canvas-size="[canvasW, canvasH]" />
      </Transition>
      <!-- <van-empty v-show="hasPreview" style="position: absolute; top: 0; right: 0; bottom: 0; left: 0; z-index: 2000;" /> -->
      <canvas ref="preview"></canvas>
      <canvas ref="offscreen" style="display: none;"></canvas>
      <canvas ref="mask" style="display: none;"></canvas>
      <video ref="preVideo" slot="media" autoplay style="display: none;"></video>
      <media-control-bar style="position: absolute; bottom: 0; left: 0; right: 0;" v-if="showControlBar">
        <media-play-button></media-play-button>
        <media-time-display showduration></media-time-display>
        <media-time-range></media-time-range>
        <media-playback-rate-button></media-playback-rate-button>
        <media-mute-button></media-mute-button>
        <media-volume-range></media-volume-range>
      </media-control-bar>
    </media-controller>

    <live2d-panel ref="live2dPanel" v-if="visionStore.live2d" />

    <Transition>
      <div ref="eigenFace" class="eigen-face" v-show="visionStore.enableFaceDetect">
        <canvas ref="capture" width="120" height="140"></canvas>
        <canvas ref="masklayer" width="120" height="140"
          style="position: absolute; top: 5px; left: 5px; z-index: 3000; display: none;"></canvas>
      </div>
    </Transition>

    <van-dialog v-model:show="showNameInputDialog" :title="$t('faceRec.nameInput')" show-cancel-button
      @confirm="onConfirmName">
      <van-field v-model="eigenName" :placeholder="$t('faceRec.nameInput')"
        :error-message="$t('faceRec.nameInputError')" :error="!isEigenNameValid" />
    </van-dialog>

    <van-popup v-model:show="showLiveStreamInput" position="center" :style="{ width: '50%' }" round>
      <van-field center v-model="liveStreamUrl">
        <template #left-icon>
          <van-icon class-prefix="iconfont" name="stream-url" />
        </template>
        <template #right-icon>
          <van-button type="primary" plain size="small" @click="onLiveStream">确认</van-button>
        </template>
      </van-field>
      <van-row style="padding: 10px 5px 5px 15px;">
        <van-tag plain closeable size="large" v-for="(value, idx) in visionStore.liveStreamHistories"
          style="margin: 0 10px 10px 0; max-width: calc(50% - 30px);" @close="onDeleteHistory(idx)">
          <div style="max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            {{ value }}
          </div>
        </van-tag>
      </van-row>
    </van-popup>
  </van-col>
</template>
<script lang="ts" setup>

import 'media-chrome'
import { Col } from 'vant'
import { inject, onMounted, Ref, ref, useTemplateRef, watch } from 'vue'
import { VideoPlayer, WorkerCMD } from '../../common'
import { WorkerManager, WorkerStatus, WorkerType } from '../../common/WorkerManager'
import { CommonStore, VisionStore } from '../../store'
import AnnotationPanel from '../annotation/AnnotationPanel.vue'
import ApmPanel from '../components/ApmPanel.vue'
import Live2dPanel from './Live2dPanel.vue'

// const Live2dPanel = defineAsyncComponent({
//   loader: () => import('./Live2dPanel.vue'),
//   loadingComponent: Loading,
//   hydrate: () => {
//     console.info('loaded')
//   }
// })

const visionStore = VisionStore()
const commonStore = CommonStore()

const previewParent = useTemplateRef<typeof Col>('previewParent')
const preVideo = useTemplateRef<HTMLVideoElement>('preVideo')
const preview = useTemplateRef<HTMLCanvasElement>('preview')
const offscreen = useTemplateRef<HTMLCanvasElement>('offscreen')
const mask = useTemplateRef<HTMLCanvasElement>('mask')
const eigenFace = useTemplateRef<HTMLDivElement>('eigenFace')
const capture = useTemplateRef<HTMLCanvasElement>('capture')
const masklayer = useTemplateRef<HTMLCanvasElement>('masklayer')

const live2dPanel = useTemplateRef('live2dPanel')

const showAnnotationPanel = ref(true)
const showNameInputDialog = ref(false)
const showLiveStreamInput = ref(false)
const eigenName = ref('')
const liveStreamUrl = ref(`https://scpull05.scjtonline.cn/scgro5/68A0ED86C9D221420010BAA2B1F7EC64.m3u8`)
const showControlBar = ref(false)
const recFace = ref<string>()
const isEigenNameValid = ref(true)
const isWeb = window.isWeb

const canvasW = ref(640)
const canvasH = ref(480)
const annotationPanel = useTemplateRef<typeof AnnotationPanel>('annotationPanel')

const showLoading = inject<Ref<boolean>>('showLoading')

let previewCtx: CanvasRenderingContext2D
let maskCtx: CanvasRenderingContext2D
let offscreenCtx: CanvasRenderingContext2D
let captureCtx: CanvasRenderingContext2D
let videoPlayer: VideoPlayer = null

let workerMgr: WorkerManager = null
const workerStatus = ref<WorkerStatus>({
  showLoading: false,
  showProcess: false,
  error: null
})



onMounted(async () => {
  window.addEventListener('beforeunload', () => { videoPlayer?.close() })

  window.addEventListener('resize', () => {
    console.log(previewParent.value.$el.clientWidth, previewParent.value.$el.clientHeight)
  })

  preview.value.width = canvasW.value
  preview.value.height = canvasH.value
  offscreen.value.width = canvasW.value
  offscreen.value.height = canvasH.value

  previewCtx = preview.value.getContext('2d', { willReadFrequently: true })
  maskCtx = mask.value.getContext('2d', { willReadFrequently: true })
  offscreenCtx = offscreen.value.getContext('2d', { willReadFrequently: true })
  captureCtx = capture.value.getContext('2d', { willReadFrequently: true })

  videoPlayer = new VideoPlayer(preVideo.value, preview.value, offscreen.value, capture.value)

  workerMgr = new WorkerManager(previewCtx, captureCtx, maskCtx)
  workerMgr.workerStatus = workerStatus.value
  workerMgr.annotationPanel = annotationPanel.value
})





async function onLiveStream() {
  visionStore.updateLiveStreamHistories(liveStreamUrl.value)
  videoPlayer?.open(liveStreamUrl.value, false)
  showLiveStreamInput.value = false
  showControlBar.value = true
}

function onDeleteHistory(idx: number) {
  visionStore.deleteLiveStreamHistory(idx)
}

async function onClickCamera() {
  videoPlayer?.open()
  showControlBar.value = true
}

async function onConfirmName() {
  if (eigenName.value == null || eigenName.value.length == 0) {
    isEigenNameValid.value = false
    showNameInputDialog.value = true
    return
  }

  workerMgr.postMessage(WorkerType.tracker, { cmd: WorkerCMD.faceCapture, name: eigenName.value })
  eigenName.value = null
  showNameInputDialog.value = false
}

async function openFolder() {

  window.mainApi?.openFile((file: string) => {
    videoPlayer.close()
    showControlBar.value = false
    var img = new Image()
    img.onload = async function () {
      let w = img.width, h = img.height
      if (w > previewParent.value.$el.clientWidth || h > (previewParent.value.$el.clientHeight - 67)) {
        const ratio = Math.min(previewParent.value.$el.clientWidth / w, (previewParent.value.$el.clientHeight - 67) / h)
        w = img.width * ratio
        h = img.height * ratio
      }
      offscreen.value.width = preview.value.width = mask.value.width = w
      offscreen.value.height = preview.value.height = mask.value.height = h

      canvasW.value = w
      canvasH.value = h

      offscreenCtx.clearRect(0, 0, offscreen.value.width, offscreen.value.height)
      offscreenCtx.drawImage(img, 0, 0, offscreen.value.width, offscreen.value.height)

      onScan()
    }
    img.src = file
  })
}

async function onScan() {

  workerStatus.value.showProcess = true
  let frame = drawImage()
  if (frame != null) {
    let cmds = []
    if (visionStore.enableFaceDetect) cmds.push(WorkerCMD.faceDetect)
    if (visionStore.enableObjRec) cmds.push(WorkerCMD.objRec)
    if (cmds.length > 0) {
      workerMgr.postMessage(WorkerType.tracker, { cmd: cmds, image: frame })
    } else { workerStatus.value.showProcess = false }
  }

}

function initWorker(worker: WorkerType) {
  let data: any
  switch (worker) {
    case WorkerType.tracker:
      data = {
        cmd: WorkerCMD.initObjTracker,
        model: JSON.stringify(visionStore.objRecModel)
      }
      break
    case WorkerType.imageProcessor:
      data = {
        cmd: WorkerCMD.initImageProcessor,
        mode: visionStore.intergrateMode,
        options: JSON.stringify(visionStore.imgParams.value)
      }
      break
  }

  workerMgr.register([worker])
  workerMgr.postMessage(worker, data)
}

function drawImage() {
  let imgData = offscreenCtx.getImageData(0, 0, offscreen.value.width, offscreen.value.height)
  if (visionStore.imgEnhance) {
    workerMgr.postMessage(WorkerType.imageProcessor, {
      cmd: WorkerCMD.imageProcess,
      image: imgData,
      width: imgData.width,
      height: imgData.height
    }, [imgData.data.buffer])
    return null
  } else {
    previewCtx.clearRect(0, 0, imgData.width, imgData.height)
    previewCtx.putImageData(imgData, 0, 0)
    return imgData
  }
}

watch(
  () => workerStatus.value,
  () => {
    showLoading.value = workerStatus.value.showLoading
  },
  { deep: true }
)

watch(() => visionStore.intergrateMode, async () => {
  if (visionStore.imgEnhance) {
    initWorker(WorkerType.imageProcessor)
  }
})

watch(() => visionStore.enableObjRec, async (val, _) => {
  videoPlayer.enableObject = val
  if (val) {
    workerStatus.value.showLoading = true
    initWorker(WorkerType.tracker)
  } else {
    workerMgr.terminate(WorkerType.tracker)
  }
})

watch(() => visionStore.objRecModel, async () => {
  workerStatus.value.showLoading = true
  workerMgr.postMessage(WorkerType.tracker, {
    cmd: WorkerCMD.initObjTracker,
    model: JSON.stringify(visionStore.objRecModel)
  })
})

watch(() => visionStore.enableFaceDetect, async (val, _) => {
  videoPlayer.enableFace = val
  if (val) {
    workerStatus.value.showLoading = true
    workerMgr.register([WorkerType.tracker])
    workerMgr.postMessage(WorkerType.tracker, { cmd: WorkerCMD.initFaceDetector })
  } else {
    workerMgr.terminate(WorkerType.tracker)
    videoPlayer.face = null
  }
})

watch(() => visionStore.imgEnhance, async (val) => {
  if (val) {
    workerStatus.value.showLoading = true
    initWorker(WorkerType.imageProcessor)
    // workerMgr.register([WorkerType.imageProcessor])
  } else {
    workerMgr.terminate(WorkerType.imageProcessor)
  }

  if (!videoPlayer.isOpen) { drawImage() }
})

watch(() => visionStore.intergrateMode, async (val) => {
  if (visionStore.imgEnhance) {
    workerStatus.value.showLoading = true
    initWorker(WorkerType.tracker)
    // workerMgr.register([WorkerType.imageProcessor])
  }
})

watch(
  () => visionStore.imgParams,
  () => {
    workerMgr.postMessage(WorkerType.imageProcessor, {
      cmd: WorkerCMD.updateOptions,
      options: JSON.stringify(visionStore.imgParams.value)
    })

    if (!videoPlayer.isOpen) { drawImage() }
  },
  { deep: true }
)

</script>
<style lang="css">
.v-enter-active,
.v-leave-active {
  transition: opacity 0.5s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}

.media-controller {
  /* width: 100%; */
  margin-top: 5px;
  height: calc(100% - 67px);
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  background-color: #2f3542;
}

.eigen-face {
  height: 140px;
  object-fit: contain;
  position: absolute;
  top: 100px;
  right: 15px;
  padding: 5px;
  border-radius: 12px;
  border: 2px solid #f1f2f699;
  background-color: #2f3542;
  z-index: 2000;
}
</style>