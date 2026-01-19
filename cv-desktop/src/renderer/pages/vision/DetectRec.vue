<template>
  <van-col ref="previewParent">
    <van-row style="height: 30px;">
      <van-button plain round size="mini" class="top-btn" style="margin-left:5px;"
        :type="showAnnotationPanel ? 'primary' : 'default'" @click="showAnnotationPanel = !showAnnotationPanel">
        <van-icon class-prefix="iconfont" name="mark" />
      </van-button>

      <van-button plain square size="mini" type="primary" class="top-btn" @click="openFolder">
        <template #icon>
          <van-icon class-prefix="iconfont" name="open" />
        </template>
      </van-button>

      <van-button plain square size="mini" type="danger" class="top-btn" @click="showNameInputDialog = true">
        <template #icon>
          <van-icon class-prefix="iconfont" name="capture" />
        </template>
      </van-button>
      <van-button plain square size="mini" type="success" class="top-btn" :loading="workerStatus.showProcess"
        @click="onScan">
        <template #icon>
          <van-icon class-prefix="iconfont" name="face-rec" />
        </template>
      </van-button>
      <van-button plain square size="mini" type="primary" class="top-btn" @click="showLiveStreamInput = true">
        <template #icon>
          <van-icon class-prefix="iconfont" name="live-stream" />
        </template>
      </van-button>
      <van-button plain square size="mini" type="primary" class="top-btn" @click="onClickCamera">
        <template #icon>
          <van-icon class-prefix="iconfont" name="camera" />
        </template>
      </van-button>

      <van-image fit="cover" radius="10" width="26" height="26" :src="recFace" style="margin-left: 10px;" />

    </van-row>

    <media-controller audio class="media-controller">
      <Transition>
        <annotation-panel ref="annotationPanel" v-show="showAnnotationPanel" :canvas-size="previewSize" />
      </Transition>
      <!-- <van-empty v-show="hasPreview" style="position: absolute; top: 0; right: 0; bottom: 0; left: 0; z-index: 2000;" /> -->
      <canvas ref="preview"></canvas>
      <canvas ref="mask" style="display: block; position: absolute; top: 50px; left: 50px;"></canvas>
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

    <live2d-panel ref="live2dPanel" v-show="visionStore.live2d" />

    <Transition>
      <div ref="eigenFace" class="eigen-face" v-show="visionStore.enableFaceDetect">
        <canvas ref="capture" width="220" height="280" style="width: 120px; height: 140px;"></canvas>
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
import { WorkerCMD } from '../../common/misc'
import { VideoPlayer } from '../../common/VideoPlayer'
import { WorkerDrawMode, WorkerManager, WorkerStatus, WorkerType } from '../../common/WorkerManager'
import { CommonStore, VisionStore } from '../../store'
import AnnotationPanel from '../annotation/AnnotationPanel.vue'
import Live2dPanel from './Live2dPanel.vue'

const visionStore = VisionStore()
const commonStore = CommonStore()

const previewParent = useTemplateRef<typeof Col>('previewParent')
const preVideo = useTemplateRef<HTMLVideoElement>('preVideo')
const preview = useTemplateRef<HTMLCanvasElement>('preview')
const mask = useTemplateRef<HTMLCanvasElement>('mask')
const capture = useTemplateRef<HTMLCanvasElement>('capture')

const annotationPanel = useTemplateRef<typeof AnnotationPanel>('annotationPanel')
const live2dPanel = useTemplateRef<typeof Live2dPanel>('live2dPanel')

const previewSize = ref<[number, number]>([640, 360])
const showAnnotationPanel = ref(true)
const showNameInputDialog = ref(false)
const showLiveStreamInput = ref(false)
const eigenName = ref('')
const liveStreamUrl = ref(`https://scpull05.scjtonline.cn/scgro5/68A0ED86C9D221420010BAA2B1F7EC64.m3u8`)
const showControlBar = ref(false)
const recFace = ref<string>()
const isEigenNameValid = ref(true)
const isWeb = window.isWeb

const showLoading = inject<Ref<boolean>>('showLoading')

let previewCtx: CanvasRenderingContext2D
let offscreen: OffscreenCanvas
let offscreenCtx: OffscreenCanvasRenderingContext2D
let captureCtx: CanvasRenderingContext2D
let maskCtx: CanvasRenderingContext2D
let videoPlayer: VideoPlayer = null

const dpr = window.devicePixelRatio || 1

let workerMgr: WorkerManager = null
const workerStatus = ref<WorkerStatus>({
  showLoading: false,
  showProcess: false,
  error: null
})

let img: HTMLImageElement = null

onMounted(async () => {
  window.addEventListener('beforeunload', () => { videoPlayer?.close() })

  window.addEventListener('resize', () => {
    console.log(previewParent.value.$el.clientWidth, previewParent.value.$el.clientHeight)
  })

  previewCtx = preview.value.getContext('2d', { willReadFrequently: true })
  previewCtx.imageSmoothingEnabled = false

  maskCtx = mask.value.getContext('2d', { willReadFrequently: true })

  offscreen = new OffscreenCanvas(preview.value.width, preview.value.height)
  offscreenCtx = offscreen.getContext('2d', { willReadFrequently: true })
  captureCtx = capture.value.getContext('2d', { willReadFrequently: true })

  console.log(captureCtx)

  updateSize()
  workerMgr = new WorkerManager(previewCtx, captureCtx, maskCtx)
  workerMgr.workerStatus = workerStatus.value
  workerMgr.drawEigen = visionStore.drawEigen
  workerMgr.drawFaceMesh = visionStore.drawFaceMesh
  workerMgr.annotationPanel = annotationPanel.value
  workerMgr.live2dPanel = live2dPanel.value

  videoPlayer = new VideoPlayer(preVideo.value, preview.value)
  videoPlayer.workerMgr = workerMgr
})

async function onLiveStream() {
  visionStore.updateLiveStreamHistories(liveStreamUrl.value)
  await videoPlayer.open(liveStreamUrl.value, false)
  showLiveStreamInput.value = false
  showControlBar.value = true
  workerMgr.drawMode = videoPlayer.isOpen ? WorkerDrawMode.video : WorkerDrawMode.image
}

function onDeleteHistory(idx: number) {
  visionStore.deleteLiveStreamHistory(idx)
}

async function onClickCamera() {
  previewSize.value = [640, 360]
  await videoPlayer.open()
  showControlBar.value = true
  workerMgr.drawMode = videoPlayer.isOpen ? WorkerDrawMode.video : WorkerDrawMode.image
}

async function onConfirmName() {
  if (eigenName.value == null || eigenName.value.length == 0) {
    isEigenNameValid.value = false
    showNameInputDialog.value = true
    return
  }

  workerMgr.faceCapture(eigenName.value)

  // todo
  // workerMgr.postMessage(WorkerType.tracker, { cmd: [WorkerCMD.faceCapture], name: eigenName.value })
  eigenName.value = null
  showNameInputDialog.value = false
}

async function openFolder() {

  window.mainApi?.openFile((file: string) => {
    videoPlayer.close()
    workerMgr.drawMode = WorkerDrawMode.image
    showControlBar.value = false
    img = new Image()
    img.onload = function () {
      let w = img.width, h = img.height, ratio = 1
      if (w > previewParent.value.$el.clientWidth * dpr || h > (previewParent.value.$el.clientHeight - 35) * dpr) {
        ratio = Math.min(previewParent.value.$el.clientWidth * dpr / w, (previewParent.value.$el.clientHeight - 35) * dpr / h)
      }
      w *= ratio
      h *= ratio

      previewSize.value = [Math.round(w / dpr), Math.round(h / dpr)]
    }
    img.src = file
  })
}

async function onScan() {
  drawImage()
}

function drawImage() {

  if (workerMgr?.drawMode == WorkerDrawMode.video) return

  let image = offscreenCtx.getImageData(0, 0, offscreen.width, offscreen.height)
  if (visionStore.enableCVProcess) {
    workerMgr?.postMessage(WorkerType.cvProcess, { cmd: WorkerCMD.process, image, }, [image.data.buffer])
  } else {
    previewCtx.clearRect(0, 0, preview.value.width, preview.value.height)
    previewCtx?.drawImage(offscreen, 0, 0)

    workerMgr?.postMessage(WorkerType.objDetect, { cmd: WorkerCMD.process, image })
    workerMgr?.postMessage(WorkerType.faceDetect, { cmd: WorkerCMD.process, image })
    workerMgr?.postMessage(WorkerType.imageGen, { cmd: WorkerCMD.process, image })
  }
}

function updateSize() {
  preview.value.style.width = previewSize.value[0] + 'px'
  preview.value.style.height = previewSize.value[1] + 'px'

  offscreen.width = preview.value.width = mask.value.width = previewSize.value[0] * dpr
  offscreen.height = preview.value.height = mask.value.height = previewSize.value[1] * dpr

  offscreenCtx.clearRect(0, 0, offscreen.width, offscreen.height)
  if (img != null) {
    offscreenCtx.drawImage(img, 0, 0, offscreen.width, offscreen.height)
    img = null
  }

  drawImage()
}

watch(() => previewSize.value, () => {
  updateSize()
})

watch(
  () => workerStatus.value,
  () => {
    showLoading.value = workerStatus.value.showLoading
  },
  { deep: true }
)

watch(
  [
    () => visionStore.intergrateMode,
    () => visionStore.enableObjDetect,
    () => visionStore.enableFaceDetect,
    () => visionStore.enableImageGen,
    () => visionStore.enableCVProcess,
  ],
  async () => {
    workerMgr.setCVProcess(visionStore.enableCVProcess, {
      mode: visionStore.intergrateMode,
      options: JSON.stringify(visionStore.cvOptions.value)
    })
    workerMgr.setObjDetect(visionStore.enableObjDetect, {
      model: JSON.stringify(visionStore.objDetectModel)
    })
    workerMgr.setImageGen(visionStore.enableImageGen, {
      model: JSON.stringify(visionStore.ganModel)
    })
    workerMgr.enableFaceDetect = visionStore.enableFaceDetect

    if (!visionStore.enableFaceDetect) visionStore.live2d = false
  }
)

watch(() => visionStore.objDetectModel, async () => {
  workerMgr.postMessage(WorkerType.objDetect, {
    cmd: WorkerCMD.init,
    model: JSON.stringify(visionStore.objDetectModel)
  })
})

watch(() => visionStore.ganModel, async () => {
  workerMgr.postMessage(WorkerType.imageGen, {
    cmd: WorkerCMD.init,
    model: JSON.stringify(visionStore.ganModel)
  })
})

watch(
  [
    () => visionStore.drawEigen,
    () => visionStore.drawFaceMesh,
  ],
  () => {
    workerMgr.drawEigen = visionStore.drawEigen
    workerMgr.drawFaceMesh = visionStore.drawFaceMesh
  }
)

watch(() => visionStore.enableCVProcess, async () => {
  drawImage()
})

watch(
  () => visionStore.cvOptions,
  () => {
    workerMgr.postMessage(WorkerType.cvProcess, {
      cmd: WorkerCMD.updateOptions,
      options: JSON.stringify(visionStore.cvOptions.value)
    })
    drawImage()
  },
  { deep: true }
)

</script>
<style lang="css" scoped>
.v-enter-active,
.v-leave-active {
  transition: opacity 0.5s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}

.top-btn {
  width: 30px;
  height: 26px;
  margin: 3px 0 0 15px;
  -webkit-app-region: no-drag;
  z-index: 100;
}

.media-controller {
  margin-top: 5px;
  height: calc(100% - 35px);
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
  border: 1px solid #f1f2f6d8;
  background-color: #2f3542;
  z-index: 2000;
}
</style>