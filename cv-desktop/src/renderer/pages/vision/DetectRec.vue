<template>
  <van-row ref="previewParent" style="position: relative; height: calc(100% - 30px); margin-top: 30px;">

    <van-row justify="space-between" style="width: 100%; height: 50px;">
      <van-row style="margin-left: 10px;">
        <van-checkbox v-model="showAnnotationPanel">
          <van-icon class-prefix="iconfont" name="mark" />
        </van-checkbox>
      </van-row>
      <van-row style="padding: 10px 10px 0 0;">
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
        <van-button plain size="small" type="success" :loading="isScan" style="margin-left: 15px;" @click="onScan">
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
      <canvas ref="preview"></canvas>
      <canvas ref="offscreen" style="display: none;"></canvas>
      <canvas ref="mask" style="display: none;"></canvas>
      <video ref="preVideo" slot="media" autoplay style="display: none;"></video>
      <media-control-bar style="position: absolute; bottom: 0px; left: 0px; right: 0px;" v-if="showControlBar">
        <media-play-button></media-play-button>
        <media-time-display showduration></media-time-display>
        <media-time-range></media-time-range>
        <media-playback-rate-button></media-playback-rate-button>
        <media-mute-button></media-mute-button>
        <media-volume-range></media-volume-range>
      </media-control-bar>
    </media-controller>

    <div ref="eigenFace" class="eigen-face" v-show="visionStore.faceDetect">
      <canvas ref="capture" width="120" height="140"></canvas>
      <canvas ref="masklayer" width="120" height="140"
        style="position: absolute; top: 5px; left: 5px; z-index: 3000; display: none;"></canvas>
    </div>

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
          <div style="max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ value }}
          </div>
        </van-tag>
      </van-row>
    </van-popup>
  </van-row>
</template>
<script lang="ts" setup>

import { MPMask } from '@mediapipe/tasks-vision'
import 'media-chrome'
import { showNotify } from 'vant'
import { inject, onMounted, Ref, ref, useTemplateRef, watch } from 'vue'
import { createCopyTextureToCanvas, drawTFFaceResult } from '../../common/DrawUtils'
import { ImageProcessor } from '../../common/ImageProcessor'
import { VideoPlayer } from '../../common/VideoPlayer'
import { VisionStore } from '../../store'
import TrackerWorker from '../../tracker.worker?worker'
import AnnotationPanel from '../annotation/AnnotationPanel.vue'

const trackerWorker = new TrackerWorker() as Worker
const visionStore = VisionStore()
const previewParent = useTemplateRef<any>('previewParent')
const preVideo = useTemplateRef<HTMLVideoElement>('preVideo')
const preview = useTemplateRef<HTMLCanvasElement>('preview')
const offscreen = useTemplateRef<HTMLCanvasElement>('offscreen')
const mask = useTemplateRef<HTMLCanvasElement>('mask')
const eigenFace = useTemplateRef<HTMLDivElement>('eigenFace')
const capture = useTemplateRef<HTMLCanvasElement>('capture')
const masklayer = useTemplateRef<HTMLCanvasElement>('masklayer')

const showAnnotationPanel = ref(true)
const showNameInputDialog = ref(false)
const showLiveStreamInput = ref(false)
const eigenName = ref('')
const liveStreamUrl = ref(`https://scpull05.scjtonline.cn/scgro5/68A0ED86C9D221420010BAA2B1F7EC64.m3u8`)
const showControlBar = ref(false)
const recFace = ref<string>()
const isScan = ref(false)
const isEigenNameValid = ref(true)
const isWeb = window.isWeb

const canvasW = ref(640)
const canvasH = ref(480)
const annotationPanel = ref<any>('annotationPanel')

const showLoading = inject<Ref<boolean>>('showLoading')


let toImageBitmap: (mask: MPMask) => Promise<ImageBitmap>

let previewCtx: CanvasRenderingContext2D
let offscreenCtx: CanvasRenderingContext2D
let captureCtx: CanvasRenderingContext2D
let imgProcessor: ImageProcessor
let videoPlayer: VideoPlayer = null

let workerListener = (event: MessageEvent) => {
  showLoading.value = event.data.loading
  isScan.value = false

  if (event.data.error) {
    showNotify({ type: 'danger', message: event.data.error, duration: 1500 })
    return
  }

  switch (event.data.type) {
    case 'object':
      if (videoPlayer.isOpen) {
        videoPlayer.objects = visionStore.enableDetect ? event.data : null
      } else {
        annotationPanel.value.drawAnnotations(event.data.boxes, event.data.scores, event.data.classes,
          event.data.objNum, event.data.scale)
        // drawObjectDetectResult(previewCtx,
        //   event.data.boxes, event.data.scores, event.data.classes,
        //   event.data.objNum, event.data.scale)
      }
      break
    case 'mask':
      console.log(event.data)

      let mask = new ImageData(preview.value.width, preview.value.height, event.data.masks[0])

      drawSegmentationResult(event.data.masks)
      previewCtx.putImageData(mask, 0, 0)
      break
    case 'face':
      if (videoPlayer.isOpen) {
        videoPlayer.face = visionStore.faceDetect ? event.data.face : null
      } else {
        drawTFFaceResult(previewCtx, event.data.face, 'none', visionStore.drawEigen, true)
      }
      captureCtx.clearRect(0, 0, capture.value.width, capture.value.height)
      if (visionStore.drawFaceMesh) {
        drawTFFaceResult(captureCtx, event.data.face, 'mesh', false, false, capture.value.height)
      }
      break
  }
}

onMounted(async () => {
  window.addEventListener('beforeunload', () => {
    videoPlayer?.close()
  })
  // test()
  // tensorTest()

  previewCtx = preview.value.getContext('2d', { willReadFrequently: true })
  offscreenCtx = offscreen.value.getContext('2d', { willReadFrequently: true })
  captureCtx = capture.value.getContext('2d', { willReadFrequently: true })

  trackerWorker.addEventListener("message", workerListener)

  imgProcessor = new ImageProcessor()
  imgProcessor.imgEnhance = visionStore.imgEnhance
  imgProcessor.intergrateMode = visionStore.intergrateMode
  imgProcessor.imgProcessParams = visionStore.imgParams.value

  videoPlayer = new VideoPlayer(preVideo.value, preview.value, offscreen.value, capture.value)
  videoPlayer.imgProcessor = imgProcessor
  videoPlayer.trackerWorker = trackerWorker

  window.cvNativeApi?.init()
  window.tfApi?.init('mediapipe-gpu')

})

async function onScan() {
  isScan.value = true
  let frame = drawImage()
  if (visionStore.faceDetect)
    trackerWorker.postMessage({ type: 'faceDetect', image: frame })

  if (visionStore.enableDetect) {
    trackerWorker.postMessage({ type: 'objDetect', image: frame })
    trackerWorker.postMessage({ type: 'objSegment', image: frame })
  }

}

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

async function openFolder() {

  window.mainApi?.openFile((file: string) => {
    videoPlayer.close()
    showControlBar.value = false
    var img = new Image()
    img.onload = async function () {

      let w = img.width, h = img.height
      if (w > previewParent.value.$el.clientWidth || h > (previewParent.value.$el.clientHeight - 50)) {
        const ratio = Math.min(previewParent.value.$el.clientWidth / w, (previewParent.value.$el.clientHeight - 50) / h)
        w = img.width * ratio
        h = img.height * ratio
      }
      offscreen.value.width = preview.value.width = w
      offscreen.value.height = preview.value.height = h

      canvasW.value = w
      canvasH.value = h

      offscreenCtx.clearRect(0, 0, offscreen.value.width, offscreen.value.height)
      offscreenCtx.drawImage(img, 0, 0, offscreen.value.width, offscreen.value.height)

      mask.value.width = w
      mask.value.height = h
      toImageBitmap = createCopyTextureToCanvas(mask.value)

      onScan()
    }
    img.src = file
  })
}

async function onConfirmName() {
  if (eigenName.value == null || eigenName.value.length == 0) {
    isEigenNameValid.value = false
    showNameInputDialog.value = true
    return
  }
  trackerWorker.postMessage({ type: 'faceCapture', name: eigenName.value })
  eigenName.value = null
  showNameInputDialog.value = false
}

function drawImage() {
  let imgData = offscreenCtx.getImageData(0, 0, offscreen.value.width, offscreen.value.height)
  imgProcessor.process(imgData)
  previewCtx.clearRect(0, 0, imgData.width, imgData.height)
  previewCtx.putImageData(imgData, 0, 0)
  return imgData
}

async function drawSegmentationResult(segmentationResult: MPMask[]) {
  // get the canvas dimensions
  const canvasWidth = preview.value.width
  const canvasHeight = preview.value.height

  // create segmentation mask
  const segmentationMask = segmentationResult[0]
  const segmentationMaskBitmap = await toImageBitmap(segmentationMask)

  previewCtx.save()
  previewCtx.fillStyle = 'white'
  previewCtx.clearRect(0, 0, canvasWidth, canvasHeight)
  previewCtx.drawImage(segmentationMaskBitmap, 0, 0, canvasWidth, canvasHeight)
  previewCtx.restore()

  previewCtx.save()
  previewCtx.globalCompositeOperation = 'source-out'
  previewCtx.fillRect(0, 0, canvasWidth, canvasHeight)
  previewCtx.restore()

  previewCtx.save()
  // scale, flip and draw the video to fit the canvas
  previewCtx.globalCompositeOperation = 'destination-atop'
  previewCtx.translate(canvasWidth, 0)
  previewCtx.scale(-1, 1)
  // previewCtx.drawImage(input, 0, 0, canvasWidth, canvasHeight)
  previewCtx.restore()
}

watch(() => visionStore.enableDetect, async (val, _) => {
  videoPlayer.enableObject = val
  if (val) {
    showLoading.value = true
    trackerWorker.postMessage({ type: 'initObjTracker', modelName: visionStore.detectModel })
  } else {
    trackerWorker.postMessage({ type: 'objDispose' })
  }
})

watch(() => visionStore.detectModel, async () => {
  showLoading.value = true
  trackerWorker.postMessage({ type: 'initObjTracker', modelName: visionStore.detectModel })
})

watch(() => visionStore.faceDetect, async (val, _) => {
  videoPlayer.enableFace = val
  if (val) {
    showLoading.value = true
    trackerWorker.postMessage({ type: 'initFaceDetector' })
  } else {
    trackerWorker.postMessage({ type: 'faceDispose' })
    videoPlayer.face = null
  }
})

watch(() => visionStore.imgEnhance, (val) => {
  imgProcessor.imgEnhance = val
  if (!videoPlayer.isOpen) { drawImage() }
})

watch(() => visionStore.intergrateMode, (val) => {
  imgProcessor.intergrateMode = val
})

watch(() => visionStore.imgParams,
  () => {
    imgProcessor.imgProcessParams = visionStore.imgParams.value
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
  width: 100%;
  height: calc(100% - 50px);
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  background-color: #2f3542;
  border-radius: 0 0 10px 10px;
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