<template>
  <van-row>
    <van-cell-group inset title="OpenCV" style="text-align: center;">
      <van-cell title="OpenCV">
        <template #right-icon>
          <van-button plain size="small" type="primary" @click="openCamera">
            <template #icon>
              <van-icon class="iconfont icon-camera" style="color: var(--van-gray-8)" />
            </template>
          </van-button>
        </template>
      </van-cell>
      <canvas ref="preview"></canvas>
      <canvas ref="offscreen" style="display: none;"></canvas>
      <video ref="preVideo" autoplay style="display: none;"></video>
    </van-cell-group>
  </van-row>
</template>
<script lang="ts" setup>

import { Point2, Rect } from '@u4/opencv4nodejs'
import { onMounted, useTemplateRef } from 'vue'

const preVideo = useTemplateRef<HTMLVideoElement>('preVideo')
const preview = useTemplateRef<HTMLCanvasElement>('preview')
const offscreen = useTemplateRef<HTMLCanvasElement>('offscreen')

let animationId: number
let previewCtx: CanvasRenderingContext2D
let offscreenCtx: CanvasRenderingContext2D
let frames = 0
let face: Rect = null, eyes: Array<Rect> = null, landmarks: Array<Point2> = null

onMounted(async () => {
  window.addEventListener('beforeunload', () => {
    closeCamera()
  })

  previewCtx = preview.value.getContext('2d', { willReadFrequently: true })
  offscreenCtx = offscreen.value.getContext('2d', { willReadFrequently: true })

  previewCtx.imageSmoothingEnabled = true
  previewCtx.imageSmoothingQuality = 'high'

  if (!__IS_WEB__) {
    window.cv.init()
  }

})


function processFrame() {
  if (preVideo.value.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) return

  offscreen.value.width = preview.value.width = preVideo.value.videoWidth * 0.5
  offscreen.value.height = preview.value.height = preVideo.value.videoHeight * 0.5

  offscreenCtx.drawImage(preVideo.value, 0, 0, offscreen.value.width, offscreen.value.height)

  const imageData = offscreenCtx.getImageData(0, 0, offscreen.value.width, offscreen.value.height)

  if (frames < 3) frames++
  else {
    frames = 0
    try {
      const result = window.cv.faceRecognize(imageData, imageData.width, imageData.height)
      face = result?.face
      eyes = result?.eyes
      landmarks = result?.landmarks
    } catch (e) {
      console.error(e, imageData)
    }
  }
  offscreenCtx.putImageData(imageData, 0, 0)
  previewCtx.drawImage(offscreen.value, 0, 0, imageData.width, imageData.height, 0, 0, imageData.width, imageData.height)

  updateFaceRec(previewCtx, face, eyes, landmarks)

  previewCtx.scale(-1, 1)
}

function updateFaceRec(context: CanvasRenderingContext2D, face: Rect, eyes: Array<Rect>, landmarks?: Array<Point2>) {
  if (face == null) return
  context.beginPath()
  context.strokeStyle = '#2ecc71'
  context.lineWidth = 3
  context.strokeRect(face.x, face.y, face.width, face.height)
  context.closePath()

  eyes?.forEach((eye) => {
    context.beginPath()
    context.strokeStyle = '#e74c3c'
    context.lineWidth = 2
    context.ellipse(eye.x + face.x + eye.width / 2, eye.y + face.y + eye.height / 2, eye.width / 2, eye.height / 2, 0, 0, Math.PI * 2)
    context.stroke()
    context.closePath()
  })

  landmarks?.forEach((landmark) => {
    context.beginPath()
    context.fillStyle = '#8e44ad'
    context.arc(landmark.x, landmark.y, 2, 0, Math.PI * 2)
    context.fill()
    context.closePath()
  })
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
}

</script>
<style lang="css"></style>