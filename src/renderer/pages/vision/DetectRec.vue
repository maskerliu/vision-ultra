<template>
  <van-row class="full-row" style="position: relative;">
    <van-cell-group ref="previewParent" inset style="width: 100%; text-align: center; margin: 30px 0 0 0;">
      <van-cell>
        <template #title>
          <van-row justify="space-between">
            <van-row>
              <van-checkbox v-model="visionStore.imgEnhance" style="margin-left: 15px;">
                <template #default>
                  <van-icon class="iconfont icon-clarity-enhance"
                    style="font-size: 1.2rem; font-weight: blod; margin-top: 4px;" />
                </template>
              </van-checkbox>
              <van-checkbox v-model="visionStore.faceDetect" style="margin-left: 15px;">
                <template #default>
                  <van-icon class="iconfont icon-face-enhance"
                    style="font-size: 1.2rem; font-weight: blod; margin-top: 4px;" />
                </template>
              </van-checkbox>
              <van-checkbox v-model="visionStore.drawFaceMesh" style="margin-left: 15px;"
                :disabled="!visionStore.faceDetect">
                <template #default>
                  <van-icon class="iconfont icon-mesh" style="font-size: 1.2rem; font-weight: blod; margin-top: 4px;" />
                </template>
              </van-checkbox>
              <van-checkbox v-model="visionStore.drawEigen" style="margin-left: 15px;"
                :disabled="!visionStore.faceDetect">
                <template #default>
                  <van-icon class="iconfont icon-eigen"
                    style="font-size: 1.2rem; font-weight: blod; margin-top: 4px;" />
                </template>
              </van-checkbox>
            </van-row>
            <van-radio-group v-model="visionStore.faceRecMode" direction="horizontal">
              <van-radio name="opencv" :disabled="isWeb">
                <van-icon class="iconfont icon-opencv" style="font-size: 1.5rem;" />
              </van-radio>
              <van-radio name="tfjs">
                <van-icon class="iconfont icon-tensorflow" style="font-size: 1.5rem;" />
              </van-radio>
            </van-radio-group>
          </van-row>
        </template>
        <template #right-icon>
          <van-image fit="cover" radius="10" width="32" height="32" :src="recFace" />

          <van-button plain size="small" type="primary" style="margin-left: 15px;" @click="openFolder">
            <template #icon>
              <van-icon class="iconfont icon-open" />
            </template>
          </van-button>

          <van-button plain size="small" type="danger" style="margin-left: 15px;" @click="onCapture">
            <template #icon>
              <van-icon class="iconfont icon-capture" />
            </template>
          </van-button>
          <van-button plain size="small" type="success" :loading="isScan" style="margin-left: 15px;" @click="onScan">
            <template #icon>
              <van-icon class="iconfont icon-face-rec" />
            </template>
          </van-button>
          <van-button plain size="small" type="primary" style="margin-left: 15px;" @click="showLiveStreamInput = true">
            <template #icon>
              <van-icon class="iconfont icon-live-stream" />
            </template>
          </van-button>
          <van-button plain size="small" type="default" style="margin-left: 15px;" @click="onClickCamera">
            <template #icon>
              <van-icon class="iconfont icon-camera" />
            </template>
          </van-button>
        </template>
      </van-cell>
      <div ref="eigenFace" class="eigen-face" v-show="visionStore.drawEigen && visionStore.faceDetect">
        <canvas ref="capture" width="120" height="140"></canvas>
        <canvas ref="masklayer" width="120" height="140"
          style="position: absolute; top: 5px; left: 5px; z-index: 3000; display: none;"></canvas>
      </div>
      <media-controller audio style="position: relative; text-align: center; margin-top: 15px;">
        <canvas ref="preview"></canvas>
        <canvas ref="offscreen" style="display: none;"></canvas>
        <video ref="preVideo" slot="media" autoplay style="display: none;"></video>
        <media-control-bar style="position: absolute; bottom: 0px; left: 0px; right: 0px;">
          <media-play-button></media-play-button>
          <media-time-display showduration></media-time-display>
          <media-time-range></media-time-range>
          <media-playback-rate-button></media-playback-rate-button>
          <media-mute-button></media-mute-button>
          <media-volume-range></media-volume-range>
        </media-control-bar>
      </media-controller>
    </van-cell-group>

    <van-dialog v-model:show="showNameInputDialog" :title="$t('faceRec.nameInput')" show-cancel-button
      @confirm="onConfirmName">
      <van-field v-model="eigenName" :placeholder="$t('faceRec.nameInput')"
        :error-message="$t('faceRec.nameInputError')" :error="!isEigenNameValid" />
    </van-dialog>

    <van-popup v-model:show="showLiveStreamInput" position="center" :style="{ width: '50%' }" round>
      <van-field center v-model="liveStreamUrl">
        <template #left-icon>
          <van-icon class="iconfont icon-stream-url" />
        </template>
        <template #right-icon>
          <van-button type="primary" plain size="small" @click="onLiveStream">确认</van-button>
        </template>
      </van-field>
      <van-row style="padding: 15px 5px 5px 15px;">
        <van-tag plain round closeable size="large" v-for="value in urlHistories"
          style="margin: 0 10px 10px 0; max-width: calc(50% - 30px);">
          <div style="max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ value }}
          </div>
        </van-tag>
      </van-row>
    </van-popup>
  </van-row>
</template>
<script lang="ts" setup>

import 'media-chrome'
import { onMounted, ref, useTemplateRef, watch } from 'vue'
import { baseDomain } from '../../../common'
import { drawCVObjectTrack } from '../../common/DrawUtils'
import { FaceDetector } from '../../common/FaceDetector'
import { ImageProcessor } from '../../common/ImageProcessor'
import { ObjectTracker } from '../../common/ObjectTracker'
import { VideoPlayer } from '../../common/VideoPlayer'
import { VisionStore } from '../../store'
import { FilesetResolver, ObjectDetector } from '@mediapipe/tasks-vision'
// import {
//   MediaController, MediaControlBar, MediaPlayButton,
//   MediaTimeDisplay, MediaTimeRange, MediaPlaybackRateButton,
//   MediaMuteButton, MediaVolumeRange
// } from 'media-chrome'


const visionStore = VisionStore()
const previewParent = useTemplateRef<any>('previewParent')
const preVideo = useTemplateRef<HTMLVideoElement>('preVideo')
const preview = useTemplateRef<HTMLCanvasElement>('preview')
const offscreen = useTemplateRef<HTMLCanvasElement>('offscreen')
const eigenFace = useTemplateRef<HTMLDivElement>('eigenFace')
const capture = useTemplateRef<HTMLCanvasElement>('capture')
const masklayer = useTemplateRef<HTMLCanvasElement>('masklayer')

const showNameInputDialog = ref(false)
const showLiveStreamInput = ref(false)
const eigenName = ref('')
const liveStreamUrl = ref(`https://scpull05.scjtonline.cn/scgro5/68A0ED86C9D221420010BAA2B1F7EC64.m3u8`)
const urlHistories = ref<Array<string>>([
  'https://scpull05.scjtonline.cn/scgro5/68A0ED86C9D221420010BAA2B1F7EC64.m3u8',
  'https://scpull05.scjtonline.cn/scgro5/68A0ED86C9D221420010BAA2B1F7EC64.m3u8',
  'https://scpull05.scjtonline.cn/scgro5/68A0ED86C9D221420010BAA2B1F7EC64.m3u8',
  'https://scpull05.scjtonline.cn/scgro5/68A0ED86C9D221420010BAA2B1F7EC64.m3u8',
  'https://scpull05.scjtonline.cn/scgro5/68A0ED86C9D221420010BAA2B1F7EC64.m3u8',
])
const recFace = ref<string>()
const isScan = ref(false)
const isEigenNameValid = ref(true)
const isWeb = window.isWeb

let previewCtx: CanvasRenderingContext2D
let offscreenCtx: CanvasRenderingContext2D
let imgProcessor: ImageProcessor
let faceDetector: FaceDetector
let objDetector: ObjectDetector
let objTracker: ObjectTracker
let videoPlayer: VideoPlayer = null
let scanTask: any
let count = 0
let imgData: ImageData = null

onMounted(async () => {
  window.addEventListener('beforeunload', () => {
    videoPlayer?.close()
  })
  // test()
  // tensorTest()

  previewCtx = preview.value.getContext('2d', { willReadFrequently: true })
  offscreenCtx = offscreen.value.getContext('2d', { willReadFrequently: true })

  imgProcessor = new ImageProcessor()
  imgProcessor.imgEnhance = visionStore.imgEnhance
  imgProcessor.imgProcessMode = visionStore.imgProcessMode
  imgProcessor.imgProcessParams = visionStore.imgParams.value

  faceDetector = new FaceDetector(previewCtx, capture.value, masklayer.value)
  faceDetector.drawFace = visionStore.drawFaceMesh
  faceDetector.enable = visionStore.faceDetect
  faceDetector.faceRecMode = visionStore.faceRecMode as any

  objTracker = new ObjectTracker(previewCtx)
  objTracker.enable = visionStore.enableYolo

  // const filesetResolver = await FilesetResolver.forVisionTasks(
  //   __DEV__ ? 'node_modules/@mediapipe/tasks-vision/wasm' : baseDomain() + '/static/tasks-vision/wasm')
  // objDetector = await ObjectDetector.createFromOptions(filesetResolver, {
  //   baseOptions: {
  //     // TODO change task to object detector
  //     modelAssetPath: `${__DEV__ ? '' : baseDomain()}/static/face_landmarker.task`,
  //     delegate: 'GPU'
  //   },
  //   maxResults: 5,
  //   scoreThreshold: 0.5
  // })

  try {
    await faceDetector.init()
    await objTracker.init()
  } catch (err) {
    console.log(err)
  }

  videoPlayer = new VideoPlayer(preVideo.value, preview.value, offscreen.value)
  videoPlayer.imgProcessor = imgProcessor
  videoPlayer.faceDetector = faceDetector
  videoPlayer.objTracker = objTracker

  window.cvNativeApi?.init()
  window.tfApi?.init('mediapipe-gpu')

})

async function onScan() {
  isScan.value = true

  let frame = drawImage()
  faceDetector?.detect(frame)
  faceDetector?.updateUI()

  objTracker?.detect(frame)
  objTracker?.updateUI()

  isScan.value = false
}

async function onLiveStream() {
  videoPlayer?.open(liveStreamUrl.value, false)
  showLiveStreamInput.value = false
}

async function onClickCamera() {
  videoPlayer?.open()
}

async function openFolder() {

  window.mainApi?.openFile((file: string) => {
    var img = new Image()
    img.onload = function () {
      let w = img.width, h = img.height
      if (w > previewParent.value.$el.clientWidth || h > (previewParent.value.$el.clientHeight - 82)) {
        const ratio = Math.min(previewParent.value.$el.clientWidth / w, (previewParent.value.$el.clientHeight - 82) / h)
        w = img.width * ratio
        h = img.height * ratio
      }
      offscreen.value.width = preview.value.width = w
      offscreen.value.height = preview.value.height = h
      offscreenCtx.clearRect(0, 0, offscreen.value.width, offscreen.value.height)
      offscreenCtx.drawImage(img, 0, 0, offscreen.value.width, offscreen.value.height)
      onScan()
    }
    img.src = file
  })
}

async function onCapture() {
  showNameInputDialog.value = true
  // faceDetector?.faceCapture(offscreenCtx)
}

function onConfirmName() {
  if (eigenName.value == null || eigenName.value.length == 0) {
    isEigenNameValid.value = false
    showNameInputDialog.value = true
    return
  }
  faceDetector?.faceCapture(previewCtx, eigenName.value)
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

watch(() => visionStore.faceDetect, async (val) => {
  faceDetector.enable = val
  faceDetector.faceRecMode = visionStore.faceRecMode as any

  if (val) await faceDetector.init()
  else faceDetector.dispose()
})

watch(() => visionStore.drawFaceMesh, (val) => {
  faceDetector.drawFace = val
})

watch(() => visionStore.drawEigen, (val) => {
  faceDetector.drawEigen = val
})

watch(() => visionStore.faceRecMode, (val) => {
  faceDetector.faceRecMode = val as any
})

watch(() => visionStore.imgEnhance, (val) => {
  imgProcessor.imgEnhance = val
})

watch(() => visionStore.imgProcessMode, (val) => {
  imgProcessor.imgProcessMode = val
})

watch(() => visionStore.imgParams,
  (val) => {
    imgProcessor.imgProcessParams = visionStore.imgParams.value
    if (!videoPlayer.isOpen) { drawImage() }
  },
  { deep: true }
)

watch(() => visionStore.enableYolo, async (val, _) => {
  objTracker.enable = val
  if (val) {
    await objTracker?.init(visionStore.yoloModel)
  } else {
    objTracker?.dispose()
  }
})

watch(() => visionStore.yoloModel, async () => {
  if (visionStore.enableYolo) {
    await objTracker?.init(visionStore.yoloModel)
  }
})

watch(() => visionStore.imgEnhance, (val) => {
  if (!videoPlayer.isOpen) { drawImage() }
  imgProcessor.imgEnhance = val
})

</script>
<style lang="css">
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