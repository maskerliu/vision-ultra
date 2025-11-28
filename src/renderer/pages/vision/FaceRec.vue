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
              <van-checkbox v-model="visionStore.drawFaceMesh" style="margin-left: 15px;">
                <template #default>
                  <van-icon class="iconfont icon-face-mesh"
                    style="font-size: 1.2rem; font-weight: blod; margin-top: 4px;" />
                </template>
              </van-checkbox>
            </van-row>
            <van-radio-group v-model="visionStore.faceRecMode" direction="horizontal">
              <van-radio name="1" :disabled="isWeb">
                <van-icon class="iconfont icon-opencv" style="font-size: 1.5rem;" />
              </van-radio>
              <van-radio name="2">
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
          <van-button plain size="small" type="success" :loading="isScan" style="margin-left: 15px;"
            @click="onFaceScan">
            <template #icon>
              <van-icon class="iconfont icon-scan" />
            </template>
          </van-button>
          <van-button plain size="small" type="primary" style="margin-left: 15px;" @click="onCollect">
            <template #icon>
              <van-icon class="iconfont icon-face-rec" />
            </template>
          </van-button>
          <van-button plain size="small" type="default" style="margin-left: 15px;" @click="onClickCamera">
            <template #icon>
              <van-icon class="iconfont icon-camera" />
            </template>
          </van-button>
        </template>
      </van-cell>

      <canvas ref="preview" style="margin-top: 15px;"></canvas>
      <canvas ref="offscreen" style="display: none;"></canvas>
      <div class="eigen-face">
        <canvas ref="capture"></canvas>
      </div>
      <canvas ref="masklayer" style="display: none;"></canvas>
      <video ref="preVideo" autoplay style="display: none;"></video>
    </van-cell-group>

    <van-dialog v-model:show="showNameInputDialog" :title="$t('faceRec.nameInput')" show-cancel-button
      @confirm="onConfirmName">
      <van-field v-model="eigenName" :placeholder="$t('faceRec.nameInput')"
        :error-message="$t('faceRec.nameInputError')" :error="!isEigenNameValid" />
    </van-dialog>
  </van-row>
</template>
<script lang="ts" setup>

import { VERSION } from '@mediapipe/face_mesh'
import { createDetector, SupportedModels } from '@tensorflow-models/face-landmarks-detection'
import * as tf from '@tensorflow/tfjs'
import { onMounted, ref, useTemplateRef, watch } from 'vue'
import { baseDomain } from '../../../common'
import { Camera } from '../../common/Camera'
import { FaceDetector } from '../../common/FaceDetector'
import { ImageProcessor } from '../../common/ImageProcessor'
import { VisionStore } from '../../store'
import { showNotify } from 'vant'

const visionStore = VisionStore()
const previewParent = useTemplateRef<any>('previewParent')
const preVideo = useTemplateRef<HTMLVideoElement>('preVideo')
const preview = useTemplateRef<HTMLCanvasElement>('preview')
const offscreen = useTemplateRef<HTMLCanvasElement>('offscreen')
const capture = useTemplateRef<HTMLCanvasElement>('capture')
const masklayer = useTemplateRef<HTMLCanvasElement>('masklayer')

const showNameInputDialog = ref(false)
const eigenName = ref('')
const recFace = ref<string>()
const isScan = ref(false)
const isEigenNameValid = ref(true)
const isWeb = window.isWeb

let previewCtx: CanvasRenderingContext2D
let offscreenCtx: CanvasRenderingContext2D
let imgProcessor: ImageProcessor = new ImageProcessor()
let faceDetector: FaceDetector
let camera: Camera = null
let scanTask: any
let count = 0


function tensorTest() {
  let angle = 90 * Math.PI / 180
  let cos = Math.cos(angle)
  let sin = Math.sin(angle)
  let martix = tf.tensor([[cos, -sin], [sin, cos]])

  let tmp = tf.tensor2d([[1, 0], [3, 0]])
  tmp.print()
  tf.matMul(tmp, martix).print()
}

function test() {
  let data = '0.3476848006248474, 0.7408292293548584, 0.374585896730423, 0.6007864475250244, 0.36658036708831787, 0.6411869525909424'
  let arr = data.split(',')

  let arr2d = []
  for (let i = 0; i < arr.length; i += 2) {
    arr2d.push(Uint32Array.from(arr))
  }

  console.log(arr2d)
}

onMounted(async () => {
  window.addEventListener('beforeunload', () => {
    camera?.close()
  })
  // test()
  // tensorTest()

  previewCtx = preview.value.getContext('2d', { willReadFrequently: true })
  offscreenCtx = offscreen.value.getContext('2d', { willReadFrequently: true })

  imgProcessor.imgEnhance = visionStore.imgEnhance
  imgProcessor.imgProcessMode = visionStore.imgProcessMode
  imgProcessor.imgProcessParams = visionStore.imgParams.value

  faceDetector = new FaceDetector(previewCtx, capture.value, masklayer.value)
  faceDetector.drawFace = visionStore.drawFaceMesh
  faceDetector.faceDetect = visionStore.faceDetect
  faceDetector.faceRecMode = visionStore.faceRecMode as any
  faceDetector.imgProcessor = imgProcessor
  faceDetector.dector = await createDetector(SupportedModels.MediaPipeFaceMesh, {
    runtime: 'mediapipe',
    solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@${VERSION}`,
    refineLandmarks: true,
    maxFaces: 1
  })

  camera = new Camera(preVideo.value, preview.value, offscreen.value)
  camera.imgProcessor = imgProcessor
  camera.faceDetector = faceDetector


  window.cvNativeApi?.init()
  window.tfApi?.init('mediapipe-gpu')

})

async function onFaceScan() {
  if (isScan.value) {
    showNotify({ type: 'warning', message: '正在扫描中，请稍后' })
    return
  }
  isScan.value = true
  scanTask = setInterval(() => {
    drawImage()
    faceDetector?.detect(offscreenCtx.getImageData(0, 0, offscreen.value.width, offscreen.value.height))
    count++
    if (count > 10) {
      clearInterval(scanTask)
      count = 0
      isScan.value = false
    }
  }, 100)

}

async function onCollect() {
  let recResult = await faceDetector?.faceRec()
  if (recResult == null) {
    recFace.value = null
  } else {
    recFace.value = baseDomain() + recResult.snap
  }
}

async function onClickCamera() {
  camera?.open()
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
      previewCtx.clearRect(0, 0, preview.value.width, preview.value.height)
      offscreenCtx.clearRect(0, 0, offscreen.value.width, offscreen.value.height)
      offscreenCtx.drawImage(img, 0, 0, offscreen.value.width, offscreen.value.height)
      drawImage()
      faceDetector.detect(offscreenCtx.getImageData(0, 0, offscreen.value.width, offscreen.value.height))
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
  faceDetector?.faceCapture(offscreenCtx, eigenName.value)
  eigenName.value = null
  showNameInputDialog.value = false
}

function drawImage() {
  const imgData = offscreenCtx.getImageData(0, 0, offscreen.value.width, offscreen.value.height)
  imgProcessor.process(imgData)
  previewCtx.clearRect(0, 0, imgData.width, imgData.height)
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

watch(() => visionStore.imgEnhance, (val) => {
  imgProcessor.imgEnhance = val
})

watch(() => visionStore.imgProcessMode, (val) => {
  imgProcessor.imgProcessMode = val
})

watch(() => visionStore.imgParams,
  (val) => {
    imgProcessor.imgProcessParams = visionStore.imgParams.value
    if (!camera.isOpen) { drawImage() }
  },
  { deep: true }
)

watch(() => visionStore.imgEnhance, (val) => {
  if (!camera.isOpen) { drawImage() }
  imgProcessor.imgEnhance = val
})

</script>
<style lang="css">
.eigen-face {
  width: 90px;
  height: 100px;
  padding: 5px;
  object-fit: contain;
  position: absolute;
  top: 100px;
  right: 15px;
  border-radius: 12px;
  background-color: #2f3542;
  z-index: 2000;
}
</style>