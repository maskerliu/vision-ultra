<template>
  <van-row class="full-row">
    <van-cell-group ref="previewParent" inset style="width: 100%; text-align: center; margin: 30px 0 15px 0;">
      <van-cell>
        <template #title>
          <van-row justify="space-between">
            <van-row>
              <van-checkbox name="isGray" v-model="visionStore.isGray">
                <template #default>
                  <van-icon class="iconfont icon-contrast-enhance"
                    style="font-size: 1.2rem; font-weight: blod; margin-top: 4px;" />
                </template>
              </van-checkbox>
              <van-checkbox name="imgEnchance" v-model="visionStore.imgEnhance" style="margin-left: 15px;">
                <template #default>
                  <van-icon class="iconfont icon-clarity-enhance"
                    style="font-size: 1.2rem; font-weight: blod; margin-top: 4px;" />
                </template>
              </van-checkbox>
              <van-checkbox name="faceDect" v-model="visionStore.faceDetect" style="margin-left: 15px;">
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
          <van-button plain size="small" type="default" style="margin-left: 15px;" @click="openCamera">
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
import { createDetector, Face, FaceLandmarksDetector, SupportedModels } from '@tensorflow-models/face-landmarks-detection'
import { Point2, Rect } from '@u4/opencv4nodejs'
import { showNotify } from 'vant'
import { onMounted, ref, useTemplateRef, watch } from 'vue'
import { drawCVFaceResult, drawTFFaceResult, getFaceContour } from '../../common/DrawUtils'
import { VisionStore } from '../../store'
import { imag } from '@tensorflow/tfjs-core'

const visionStore = VisionStore()
const previewParent = useTemplateRef<any>('previewParent')
const preVideo = useTemplateRef<HTMLVideoElement>('preVideo')
const preview = useTemplateRef<HTMLCanvasElement>('preview')
const offscreen = useTemplateRef<HTMLCanvasElement>('offscreen')
const capture = useTemplateRef<HTMLCanvasElement>('capture')
const masklayer = useTemplateRef<HTMLCanvasElement>('masklayer')

let animationId: number
let previewCtx: CanvasRenderingContext2D
let offscreenCtx: CanvasRenderingContext2D
let captureCtx: CanvasRenderingContext2D
let masklayerCtx: CanvasRenderingContext2D

let frames = 0
let face: Rect = null, eyes: Array<Rect> = null, landmarks: Array<Point2> = null
let faceDector: FaceLandmarksDetector = null
let faces: Array<Face> = []
let imgParams: { [key: string]: any } = {

}

onMounted(async () => {
  window.addEventListener('beforeunload', () => {
    closeCamera()
  })

  previewCtx = preview.value.getContext('2d', { willReadFrequently: true })
  offscreenCtx = offscreen.value.getContext('2d', { willReadFrequently: true })
  captureCtx = capture.value.getContext('2d', { willReadFrequently: false })
  masklayerCtx = masklayer.value.getContext('2d', { willReadFrequently: false })
  previewCtx.imageSmoothingEnabled = true
  previewCtx.imageSmoothingQuality = 'high'

  if (!__IS_WEB__) {
    window.cvApi.init()
    window.tfApi.init('mediapipe-gpu')
  }

  faceDector = await createDetector(SupportedModels.MediaPipeFaceMesh, {
    runtime: 'mediapipe',
    solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@${VERSION}`,
    refineLandmarks: true,
    maxFaces: 1
  })

  imgParams['isGray'] = visionStore.isGray
  imgParams['equalizeHist'] = visionStore.equalizeHist
})

async function processFrame() {
  if (preVideo.value.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) return

  offscreen.value.width = preview.value.width = preVideo.value.videoWidth
  offscreen.value.height = preview.value.height = preVideo.value.videoHeight
  offscreenCtx.scale(-1, 1)
  offscreenCtx.translate(-offscreen.value.width, 0)
  offscreenCtx.drawImage(preVideo.value, 0, 0, offscreen.value.width, offscreen.value.height)

  let imageData = offscreenCtx.getImageData(0, 0, offscreen.value.width, offscreen.value.height)
  if (visionStore.enhance) {
    const { data, width, height } = window.cvApi.imgProcess(imageData, imageData.width, imageData.height, {
      isGray: visionStore.isGray,
      equalizeHist: visionStore.equalizeHist,
      brightness: visionStore.brightness,
      laplace: visionStore.laplace,
    })
    imageData = new ImageData(data as ImageDataArray, width, height)
  }

  if (visionStore.faceDetect) {
    await faceDect()
  } else {
    faces = []
    eyes = []
    landmarks = []
    face = null
  }

  offscreenCtx.putImageData(imageData, 0, 0)
  previewCtx.drawImage(offscreen.value,
    0, 0, imageData.width, imageData.height,
    0, 0, imageData.width, imageData.height)
  if (visionStore.faceRecMode == '1') {
    drawCVFaceResult(previewCtx, face, eyes, landmarks)
  } else {
    drawTFFaceResult(previewCtx, faces, true, true)
  }
}

async function faceDect() {
  let imageData = offscreenCtx.getImageData(0, 0, offscreen.value.width, offscreen.value.height)
  if (frames < 3) frames++
  else {
    frames = 0
    try {
      if (visionStore.faceRecMode == '1') {
        const result = window.cvApi.faceRecognize(imageData, imageData.width, imageData.height)
        face = result?.face
        eyes = result?.eyes
        landmarks = result?.landmarks
      } else {
        faces = await faceDector.estimateFaces(imageData)
      }
    } catch (e) {
      console.error(e, imageData)
    }
  }

  // offscreenCtx.putImageData(imageData, 0, 0)
  // previewCtx.drawImage(offscreen.value,
  //   0, 0, imageData.width, imageData.height,
  //   0, 0, imageData.width, imageData.height)

  // if (visionStore.faceRecMode == '1') {
  //   drawCVFaceResult(previewCtx, face, eyes, landmarks)
  // } else {
  //   drawTFFaceResult(previewCtx, faces, true, true)
  // }
}

async function openFolder() {
  if (!__IS_WEB__) {

    let timestamp = new Date().getMilliseconds()

    window.mainApi.openFile((file: string) => {
      console.log(`[${new Date().getMilliseconds()}]open file ${file} `)

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
  if (__IS_WEB__) return
  if (faces == null || faces.length == 0) {
    showNotify({ type: 'warning', message: '未检测到人脸...', duration: 500 })
    return
  }

  let path = getFaceContour(faces[0])
  captureCtx.clearRect(0, 0, capture.value.width, capture.value.height)
  masklayerCtx.clearRect(0, 0, masklayer.value.width, masklayer.value.height)
  capture.value.width = faces[0].box.width
  capture.value.height = faces[0].box.height
  masklayer.value.width = faces[0].box.width
  masklayer.value.height = faces[0].box.height

  let imageData = offscreenCtx.getImageData(faces[0].box.xMin, faces[0].box.yMin,
    faces[0].box.width, faces[0].box.height)

  // const { data, width, height } = window.cvApi.imgProcess(imageData, imageData.width, imageData.height, {
  //   isGray: visionStore.isGray,
  //   contrast: visionStore.contrast,
  //   brightness: visionStore.brightness,
  //   laplace: visionStore.laplace,
  //   enhance: visionStore.enhance
  // })
  // imageData = new ImageData(data as ImageDataArray, width, height)
  captureCtx.putImageData(imageData, 0, 0)
  masklayerCtx.beginPath()
  for (let i = 1; i < path.length; i++) {
    masklayerCtx.lineTo(path[i][0], path[i][1])
  }
  masklayerCtx.fillStyle = 'white'
  masklayerCtx.fill()
  let maskImgData = masklayerCtx.getImageData(0, 0, masklayer.value.width, masklayer.value.height)
  for (let i = 0; i < maskImgData.data.length; i += 4) {
    if (maskImgData.data[i + 3] == 0) {
      maskImgData.data[i + 3] = 255
    } else {
      maskImgData.data[i + 3] = 0
    }
  }

  for (let i = 0; i < imageData.data.length; i += 4) {
    if (maskImgData.data[i + 3] == 255) {
      imageData.data[i + 3] = 0
    }
  }
  captureCtx.putImageData(imageData, 0, 0)

  capture.value.toBlob(async (blob) => {
    let buffer = await blob.arrayBuffer()
    window.mainApi.saveFile('保存图片', `face-${new Date().getTime()}.png`, buffer, true)
    captureCtx.clearRect(0, 0, capture.value.width, capture.value.height)
  }, 'image/png')
}

function drawImage() {
  const imgData = offscreenCtx.getImageData(0, 0, offscreen.value.width, offscreen.value.height)

  let { data, width, height } = window.cvApi.imgProcess(imgData, imgData.width, imgData.height, visionStore.imgParams.getParams())
  var grayImg = new ImageData(data as ImageDataArray, width, height)
  previewCtx.putImageData(grayImg, 0, 0)
}

async function openCamera() {
  if (__IS_WEB__) return

  if (preVideo.value.srcObject) {
    previewCtx.clearRect(0, 0, preview.value.width, preview.value.height)
    offscreenCtx.clearRect(0, 0, offscreen.value.width, offscreen.value.height)
    closeCamera()
    preVideo.value.srcObject = null
    return
  }

  faceDector.reset()
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    preVideo.value.srcObject = stream

    animationId = requestAnimationFrame(function loop() {
      processFrame()
      animationId = requestAnimationFrame(loop)
    })
  } catch (e) {
    console.error(e)
  }
}

async function closeCamera() {
  if (animationId) cancelAnimationFrame(animationId)
  if (preVideo.value.srcObject) {
    (preVideo.value.srcObject as MediaStream).getTracks().forEach(track => track.stop())
  }

  offscreenCtx.clearRect(0, 0, offscreen.value.width, offscreen.value.height)
  previewCtx.clearRect(0, 0, preview.value.width, preview.value.height)
}

watch(() => visionStore.imgParams,
  (val) => {
    drawImage()
  },
  { deep: true }
)

watch(() => visionStore.enhance, (val) => {
  drawImage()
})

watch(() => visionStore.faceDetect, (val) => {
  console.log('faceDetect', val)
})

</script>
<style lang="css"></style>