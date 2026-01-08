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
      <div ref="eigenFace" class="eigen-face" v-show="visionStore.faceDetect">
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
import { Col, showNotify } from 'vant'
import { inject, onMounted, Ref, ref, useTemplateRef, watch } from 'vue'
import { CVLabel, ImageProcessor, MarkColors, ModelType, VideoPlayer, WorkerCMD } from '../../common'
import { drawTFFaceResult } from '../../common/DrawUtils'
import ImageProcessorWorker from '../../imgProcessor.worker?worker'
import { CommonStore, VisionStore } from '../../store'
import TrackerWorker from '../../tracker.worker?worker'
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

let trackerWorker: Worker
let imgProcessorWorker: Worker

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
const isScan = ref(false)
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
let imgProcessor: ImageProcessor
let videoPlayer: VideoPlayer = null

const trackerWorkerListener = (event: MessageEvent) => {
  showLoading.value = event.data.loading
  isScan.value = false

  if (event.data.error) {
    showNotify({ type: 'danger', message: event.data.error.message, duration: 1500 })
    return
  }

  switch (event.data.type) {
    case 'object':
      if (videoPlayer.isOpen) {
        videoPlayer.objects = visionStore.enableObjRec ? event.data : null
      } else {
        annotationPanel.value.drawAnnotations(event.data.boxes,
          event.data.scores, event.data.classes,
          event.data.objNum, event.data.scale)
        // drawObjectDetectResult(previewCtx,
        //   event.data.boxes, event.data.scores, event.data.classes,
        //   event.data.objNum, event.data.scale)
      }
      break
    case 'mask':
      console.log(event.data)
      annotationPanel.value.drawAnnotations(event.data.boxes,
        event.data.scores, event.data.classes,
        event.data.objNum, event.data.scale)

      drawOverlay(event.data.overlay, event.data.width, event.data.height, event.data.scale)

      drawMask(event.data.boxes, event.data.classes, event.data.masks,
        event.data.objNum, event.data.width, event.data.height)

      break
    case 'face':
      if (videoPlayer.isOpen) {
        videoPlayer.face = visionStore.faceDetect ? event.data.face : null
      } else {
        drawTFFaceResult(previewCtx, event.data.face, 'none', visionStore.drawEigen, true)
      }

      live2dPanel.value?.animateLive2DModel(event.data.tface)
      captureCtx.clearRect(0, 0, capture.value.width, capture.value.height)
      if (visionStore.drawFaceMesh) {
        drawTFFaceResult(captureCtx, event.data.face, 'mesh', false, false, capture.value.height)
      }
      break
  }
}

const imgProcessorWorkerListener = (event: MessageEvent) => {
  showLoading.value = event.data.loading
}

function drawMask(boxes: Float16Array, classes: Uint8Array, masks: Array<Uint8Array>,
  objNum: number, width: number, height: number) {
  let ratio = 640 / 160
  let length = 0
  let offset = 0
  let contours = []
  if (width == null || width == 0 || height == null || height == 0) return
  const imageData = new ImageData(width, height)
  for (let i = 0; i < objNum; ++i) {
    let label: CVLabel = annotationPanel.value.getLabel(classes[i])
    let [r, g, b] = MarkColors.hexToRgb(label.color)
    let i4 = i * 4
    const y1 = Math.round(boxes[i4] / ratio)
    const x1 = Math.round(boxes[i4 + 1] / ratio)
    const y2 = Math.round(boxes[i4 + 2] / ratio)
    const x2 = Math.round(boxes[i4 + 3] / ratio)
    length = (y2 - y1) * (x2 - x1)
    offset += length
    for (let row = x1; row < x2; ++row)
      for (let col = y1; col < y2; ++col) {
        let id = col * width + row
        let absId = (col - y1) * (x2 - x1) + row - x1
        imageData.data[id * 4] = 255 - r
        imageData.data[id * 4 + 1] = 255 - g
        imageData.data[id * 4 + 2] = 155 - b
        imageData.data[id * 4 + 3] += masks[i][absId] == 0 ? 0 : 200
      }

    let points = imgProcessor.findContours(masks[i], x2 - x1, y2 - y1,)
    if (points.length < 3) continue

    points.forEach(p => {
      p[0] += x1
      p[1] += y1
    })
    contours.push(points)
  }

  mask.value.width = width
  mask.value.height = height
  maskCtx.clearRect(0, 0, mask.value.width, mask.value.height)
  maskCtx.putImageData(imageData, 0, 0)

  let sacle = Math.max(preview.value.width, preview.value.height) / Math.max(width, height)
  previewCtx.save()
  previewCtx.scale(sacle, sacle)
  previewCtx.drawImage(maskCtx.canvas, 0, 0)
  previewCtx.restore()

  contours.forEach(points => {
    points.forEach(p => {
      p[0] *= sacle
      p[1] *= sacle
    })
  })

  for (let i = 0; i < contours.length; ++i) {
    let points = contours[i]
    let label: CVLabel = annotationPanel.value.getLabel(classes[i])
    let [r, g, b] = MarkColors.hexToRgb(label.color)
    previewCtx.beginPath()
    previewCtx.moveTo(points[0][0], points[0][1])
    for (let j = 1; j < points.length; ++j) {
      previewCtx.lineTo(points[j][0], points[j][1])
    }
    previewCtx.closePath()
    previewCtx.lineWidth = 2
    previewCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.8)`
    previewCtx.stroke()
  }
}

function drawOverlay(overlay: Uint8Array, width: number, height: number, scale: [number, number]) {
  if (overlay == null) return

  let labels = new Map()
  let imageData = new ImageData(width, height)
  for (let row = 0; row < imageData.width; ++row) {
    for (let col = 0; col < imageData.height; ++col) {
      let idx = row * imageData.height + col
      let id = overlay[idx]
      if (id == undefined) {
        // console.log('undefined', row, col, idx)
        continue
      }
      if (!labels.has(id)) {
        let label: CVLabel = annotationPanel.value.getLabel(id)
        if (label == null) {
          // console.log(id, 'not found')
          label = { id: id, name: 'unknown', color: '#0000FF' }
        }
        labels.set(label.id, label)
      }

      let l = labels.get(id)
      let [r, g, b] = MarkColors.hexToRgb(l.color)
      imageData.data[idx * 4] = r
      imageData.data[idx * 4 + 1] = g
      imageData.data[idx * 4 + 2] = b
      imageData.data[idx * 4 + 3] = 200
    }
  }

  mask.value.width = width
  mask.value.height = height
  maskCtx.clearRect(0, 0, mask.value.width, mask.value.height)
  maskCtx.putImageData(imageData, 0, 0)

  previewCtx.save()
  previewCtx.scale(scale[0], scale[1])
  previewCtx.drawImage(maskCtx.canvas, 0, 0)
  previewCtx.restore()
}

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

  // imgProcessor = new ImageProcessor()
  // imgProcessor.imgProcessParams = visionStore.imgParams.value
  // await imgProcessor.init(visionStore.intergrateMode)

  videoPlayer = new VideoPlayer(preVideo.value, preview.value, offscreen.value, capture.value)
  videoPlayer.imgProcessor = imgProcessor
})

function initTrackerWorker() {
  if (trackerWorker != null) return
  trackerWorker = new TrackerWorker()
  trackerWorker.addEventListener("message", trackerWorkerListener)
  videoPlayer.trackerWorker = trackerWorker
}

function disposeTrackerWorker() {
  if (visionStore.enableObjRec || visionStore.faceDetect) return
  trackerWorker?.terminate()
  trackerWorker = null
}

function initImgProcessorWorker() {
  if (imgProcessorWorker != null) return
  imgProcessorWorker = new ImageProcessorWorker()
  imgProcessorWorker.postMessage({
    cmd: WorkerCMD.initImageProcessor,
    mode: visionStore.intergrateMode,
    params: JSON.stringify(visionStore.imgParams.value)
  })
  imgProcessorWorker.addEventListener("message", imgProcessorWorkerListener)
  videoPlayer.imgProcessorWorker = imgProcessorWorker
  // videoPlayer.imgProcessorWorker = imgProcessorWorker
}


function disposeImgProcessorWorker() {
  if (imgProcessorWorker != null) {
    imgProcessorWorker.terminate()
    imgProcessorWorker = null
  }
}


async function onScan() {
  isScan.value = true
  let frame = drawImage()
  let cmds = []
  if (visionStore.faceDetect) cmds.push(WorkerCMD.faceDetect)
  if (visionStore.enableObjRec) cmds.push(WorkerCMD.objRec)
  if (cmds.length > 0) trackerWorker.postMessage({ cmd: cmds, image: frame })
  else { isScan.value = false }
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
      if (w > previewParent.value.$el.clientWidth || h > (previewParent.value.$el.clientHeight - 67)) {
        const ratio = Math.min(previewParent.value.$el.clientWidth / w, (previewParent.value.$el.clientHeight - 67) / h)
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
  trackerWorker?.postMessage({ cmd: WorkerCMD.faceCapture, name: eigenName.value })
  eigenName.value = null
  showNameInputDialog.value = false
}

function drawImage() {
  let imgData = offscreenCtx.getImageData(0, 0, offscreen.value.width, offscreen.value.height)
  if (visionStore.imgEnhance) {
    imgProcessor?.process(imgData)
    imgProcessorWorker?.postMessage({ cmd: WorkerCMD.imageProcess, image: imgData })
  }
  previewCtx.clearRect(0, 0, imgData.width, imgData.height)
  previewCtx.putImageData(imgData, 0, 0)
  return imgData
}

watch(() => visionStore.intergrateMode, async (val, _) => {
  await imgProcessor?.init(val)

  if (visionStore.imgEnhance) {
    disposeImgProcessorWorker()
    initImgProcessorWorker()
  }
})

watch(() => visionStore.enableObjRec, async (val, _) => {
  videoPlayer.enableObject = val
  if (val) {
    initTrackerWorker()
    showLoading.value = true
    trackerWorker.postMessage({
      cmd: WorkerCMD.initObjTracker,
      model: JSON.stringify(visionStore.objRecModel)
    })
  } else {
    trackerWorker.postMessage({ cmd: WorkerCMD.dispose, modelTypes: [ModelType.Detect] })
    disposeTrackerWorker()
  }
})

watch(() => visionStore.objRecModel, async () => {
  showLoading.value = true
  trackerWorker.postMessage({
    cmd: WorkerCMD.initObjTracker,
    model: JSON.stringify(visionStore.objRecModel)
  })
})

watch(() => visionStore.faceDetect, async (val, _) => {
  videoPlayer.enableFace = val
  if (val) {
    showLoading.value = true
    initTrackerWorker()
    trackerWorker.postMessage({ cmd: WorkerCMD.initFaceDetector })
  } else {
    trackerWorker.postMessage({ cmd: WorkerCMD.dispose, modelTypes: [ModelType.Face] })
    disposeTrackerWorker()
    videoPlayer.face = null
  }
})

watch(() => visionStore.imgEnhance, async (val) => {
  if (!val) {
    imgProcessor?.dispose()
    disposeImgProcessorWorker()
  } else {
    initImgProcessorWorker()
    showLoading.value = true
    await imgProcessor?.init(visionStore.intergrateMode)
    showLoading.value = false
  }

  if (!videoPlayer.isOpen) { drawImage() }
})

watch(() => visionStore.intergrateMode, async (val) => {
  if (visionStore.imgEnhance) {
    await imgProcessor?.init(val)

    initImgProcessorWorker()
    imgProcessorWorker?.postMessage({
      cmd: WorkerCMD.updateOptions,
      options: JSON.stringify(visionStore.imgParams.value)
    })
  }
})

watch(() => visionStore.imgParams,
  () => {
    imgProcessorWorker?.postMessage({
      cmd: WorkerCMD.updateOptions,
      options: JSON.stringify(visionStore.imgParams.value)
    })

    // imgProcessor.imgProcessParams = visionStore.imgParams.value

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