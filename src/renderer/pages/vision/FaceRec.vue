<template>
  <van-row class="full-row">
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
              <van-checkbox v-model="visionStore.drawFaceMesh" style="margin-left: 15px;">
                <template #default>
                  <van-icon class="iconfont icon-face-mesh"
                    style="font-size: 1.2rem; font-weight: blod; margin-top: 4px;" />
                </template>
              </van-checkbox>
            </van-row>
            <van-radio-group v-model="visionStore.faceRecMode" direction="horizontal">
              <van-radio name="1">
                <van-icon class="iconfont icon-opencv" style="font-size: 1.5rem;" />
              </van-radio>
              <van-radio name="2">
                <van-icon class="iconfont icon-tensorflow" style="font-size: 1.5rem;" />
              </van-radio>
            </van-radio-group>
          </van-row>
        </template>
        <template #right-icon>
          <van-button plain size="small" type="primary" @click="openFolder">
            <template #icon>
              <van-icon class="iconfont icon-open" />
            </template>
          </van-button>

          <van-button plain size="small" type="danger" style="margin-left: 15px;" @click="onCapture">
            <template #icon>
              <van-icon class="iconfont icon-capture" />
            </template>
          </van-button>
          <van-button plain size="small" type="default" style="margin-left: 15px;" @click="onClickCamera">
            <template #icon>
              <van-icon class="iconfont icon-camera" />
            </template>
          </van-button>
        </template>
      </van-cell>
      <canvas ref="preview"></canvas>
      <canvas ref="offscreen" style="display: none;"></canvas>
      <canvas ref="capture" style="display: none;"></canvas>
      <canvas ref="masklayer" style="display: none;"></canvas>
      <video ref="preVideo" autoplay style="display: none;"></video>
    </van-cell-group>
  </van-row>
</template>
<script lang="ts" setup>

import { VERSION } from '@mediapipe/face_mesh'
import { createDetector, SupportedModels } from '@tensorflow-models/face-landmarks-detection'
import { onMounted, useTemplateRef, watch } from 'vue'
import { Camera } from '../../common/Camera'
import { FaceDetector } from '../../common/FaceDetector'
import { ImageProcessor } from '../../common/ImageProcessor'
import { VisionStore } from '../../store'

const visionStore = VisionStore()
const previewParent = useTemplateRef<any>('previewParent')
const preVideo = useTemplateRef<HTMLVideoElement>('preVideo')
const preview = useTemplateRef<HTMLCanvasElement>('preview')
const offscreen = useTemplateRef<HTMLCanvasElement>('offscreen')
const capture = useTemplateRef<HTMLCanvasElement>('capture')
const masklayer = useTemplateRef<HTMLCanvasElement>('masklayer')

let previewCtx: CanvasRenderingContext2D
let offscreenCtx: CanvasRenderingContext2D
let imgProcessor: ImageProcessor = new ImageProcessor()
let faceDetector: FaceDetector
let camera: Camera = null

onMounted(async () => {
  window.addEventListener('beforeunload', () => {
    camera?.close()
  })

  previewCtx = preview.value.getContext('2d', { willReadFrequently: true })
  offscreenCtx = offscreen.value.getContext('2d', { willReadFrequently: true })

  imgProcessor.imgEnhance = visionStore.imgEnhance
  imgProcessor.imgProcessMode = visionStore.imgProcessMode
  imgProcessor.imgProcessParams = visionStore.imgParams.getParams()

  faceDetector = new FaceDetector(previewCtx, capture.value, masklayer.value)
  faceDetector.drawFace = visionStore.drawFaceMesh
  faceDetector.faceDetect = visionStore.faceDetect
  faceDetector.faceRecMode = visionStore.faceRecMode as any
  faceDetector.dector = await createDetector(SupportedModels.MediaPipeFaceMesh, {
    runtime: 'mediapipe',
    solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@${VERSION}`,
    refineLandmarks: true,
    maxFaces: 1
  })

  camera = new Camera(preVideo.value, preview.value, offscreen.value)
  camera.imgProcessor = imgProcessor
  camera.faceDetector = faceDetector

  if (!__IS_WEB__) {
    window.cvNativeApi?.init()
    window.tfApi?.init('mediapipe-gpu')
  }
})

async function onClickCamera() {
  camera?.open()
}

async function openFolder() {
  if (!__IS_WEB__) {
    window.mainApi.openFile((file: string) => {
      var img = new Image()
      img.onload = function () {
        let w = img.width, h = img.height
        if (w > previewParent.value.$el.offsetWidth || h > previewParent.value.$el.offsetHeight) {
          const ratio = Math.min(previewParent.value.$el.offsetWidth / w, previewParent.value.$el.offsetHeight / h)
          w = img.width * ratio
          h = img.height * ratio
        }

        offscreen.value.width = preview.value.width = w
        offscreen.value.height = preview.value.height = h
        previewCtx.save()
        previewCtx.clearRect(0, 0, preview.value.width, preview.value.height)
        offscreenCtx.clearRect(0, 0, offscreen.value.width, offscreen.value.height)
        offscreenCtx.drawImage(img, 0, 0, offscreen.value.width, offscreen.value.height)
        drawImage()
      }
      img.src = file
    })
  }
}

async function onCapture() {
  faceDetector?.faceCapture(offscreenCtx)
}

function drawImage() {
  const imgData = offscreenCtx.getImageData(0, 0, offscreen.value.width, offscreen.value.height)
  imgProcessor.process(imgData)
  previewCtx.putImageData(imgData, 0, 0)
}

watch(() => visionStore.faceDetect, async (val) => {
  faceDetector.faceDetect = val
  faceDetector.faceRecMode = visionStore.faceRecMode as any
})

watch(() => visionStore.drawFaceMesh, (val) => {
  faceDetector.drawFace = val 
})

watch(() => visionStore.faceRecMode, (val) => {
  faceDetector.faceRecMode = val as any
})

watch(() => visionStore.imgProcessMode, (val) => {
  imgProcessor.imgProcessMode = val
})

watch(() => visionStore.imgParams,
  (val) => {
    if (!camera.isOpen()) { drawImage() }
    imgProcessor.imgProcessParams = visionStore.imgParams.getParams()
  },
  { deep: true }
)

watch(() => visionStore.imgEnhance, (val) => {
  if (!camera.isOpen()) { drawImage() }
  imgProcessor.imgEnhance = val
})

</script>
<style lang="css"></style>