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
import { imgProcess } from '../../common/CVApi'
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
let captureCtx: CanvasRenderingContext2D
let masklayerCtx: CanvasRenderingContext2D

let camera: Camera = null

onMounted(async () => {
  window.addEventListener('beforeunload', () => {
    camera?.closeCamera()
  })

  previewCtx = preview.value.getContext('2d', { willReadFrequently: true })
  offscreenCtx = offscreen.value.getContext('2d', { willReadFrequently: true })

  captureCtx = capture.value.getContext('2d', { willReadFrequently: false })
  masklayerCtx = masklayer.value.getContext('2d', { willReadFrequently: false })

  camera = new Camera(preVideo.value, preview.value, offscreen.value, capture.value, masklayer.value)
  camera.imgEnhance = visionStore.imgEnhance
  camera.imgProcessMode = visionStore.imgProcessMode
  camera.imgProcessParams = visionStore.imgParams.getParams()
  camera.faceDetect = visionStore.faceDetect
  camera.faceRecMode = visionStore.faceRecMode as any

  camera.faceDector = await createDetector(SupportedModels.MediaPipeFaceMesh, {
    runtime: 'mediapipe',
    solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@${VERSION}`,
    refineLandmarks: true,
    maxFaces: 1
  })

  if (!__IS_WEB__) {
    window.cvNativeApi.init()
    window.tfApi.init('mediapipe-gpu')
  }
})

async function processImage(image: ImageData) {
  if (!visionStore.imgEnhance) return

  switch (visionStore.imgProcessMode) {
    case '1': {
      imgProcess(image, image.width, image.height, visionStore.imgParams.getParams())
      break
    }
    case '2': {
      let data = window.cvWasmApi.imgProcess(image, image.width, image.height, visionStore.imgParams.getParams())
      for (let i = 0; i < data.length; i++)
        image.data[i] = data[i]
      break
    }
    case '3': {
      let data = window.cvNativeApi.imgProcess(image, image.width, image.height, visionStore.imgParams.getParams())
      for (let i = 0; i < data.length; i++)
        image.data[i] = data[i]
      break
    }
  }
}

async function onClickCamera() {
  camera?.openCamera()
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
  camera.faceCapture()
}

function drawImage() {
  const imgData = offscreenCtx.getImageData(0, 0, offscreen.value.width, offscreen.value.height)
  processImage(imgData)
  previewCtx.putImageData(imgData, 0, 0)
}

watch(() => visionStore.faceDetect, async (val) => {
  camera.faceDetect = val
  camera.faceRecMode = visionStore.faceRecMode as any
})

watch(() => visionStore.faceRecMode, (val) => {
  camera.faceRecMode = val as any
})

watch(() => visionStore.imgProcessMode, (val) => {
  camera.imgProcessMode = val
})

watch(() => visionStore.imgParams,
  (val) => {
    drawImage()
    camera.imgProcessParams = visionStore.imgParams.getParams()
  },
  { deep: true }
)

watch(() => visionStore.imgEnhance, (val) => {
  drawImage()
  camera.imgEnhance = val
})

</script>
<style lang="css"></style>