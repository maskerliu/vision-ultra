<template>
  <van-row class="full-row">
    <van-cell-group ref="previewParent" inset style="width: 100%; text-align: center; margin: 30px 0 15px 0;">
      <van-cell>
        <template #title>
          <van-row justify="space-between">
            <van-checkbox-group size="mini" direction="horizontal">
              <van-checkbox shape="square" name="5010" icon-size="1rem" v-model="visionStore.isGray">
                <van-icon class="iconfont icon-gray" style="font-size: 1.1rem; font-weight: blod;" />
              </van-checkbox>
              <van-checkbox shape="square" name="5020" icon-size="1rem" v-model="visionStore.imgEnhance">
                <van-icon class="iconfont icon-image-enhance" style="font-size: 1.rem; font-weight: blod" />
              </van-checkbox>
              <van-checkbox shape="square" name="5030" icon-size="1rem" v-model="visionStore.faceRec">
                <van-icon class="iconfont icon-face-rec" style="font-size: 1.rem; font-weight: blod" />
              </van-checkbox>
            </van-checkbox-group>
            <div style="padding: 1px 0;">
              <van-icon class="iconfont icon-open left-panel-icon" @click="openFolder" />
            </div>
          </van-row>
        </template>
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
import { onMounted, useTemplateRef, watch } from 'vue'
import { VisionStore } from '../../store'
import { off } from 'process'

const visionStore = VisionStore()
const previewParent = useTemplateRef<any>('previewParent')
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

  console.log('preivew parent height', previewParent.value.$el.offsetHeight)
})

function processFrame() {
  if (preVideo.value.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) return

  offscreen.value.width = preview.value.width = preVideo.value.videoWidth
  offscreen.value.height = preview.value.height = preVideo.value.videoHeight
  offscreenCtx.scale(-1, 1)
  offscreenCtx.translate(-offscreen.value.width, 0)
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


  if (landmarks.length == 68) {
    drawMutliLine(context, landmarks, 0, 17) // Jaw
    drawMutliLine(context, landmarks, 17, 22) // Left brow
    drawMutliLine(context, landmarks, 22, 27) // Right brow
    drawMutliLine(context, landmarks, 27, 31) // Nose
    drawMutliLine(context, landmarks, 31, 36) // Nose bottom
    drawMutliLine(context, landmarks, 36, 42, true) // Left eye
    drawMutliLine(context, landmarks, 42, 48, true) // Right eye
    drawMutliLine(context, landmarks, 48, 60, true) // Outer lip
    drawMutliLine(context, landmarks, 60, 68, true) // Inner lip
  } else {
    landmarks?.forEach((landmark) => {
      context.beginPath()
      context.fillStyle = '#8e44ad'
      context.arc(landmark.x, landmark.y, 2, 0, Math.PI * 2)
      context.fill()
      context.closePath()
    })
  }
  landmarks?.forEach((landmark) => {
    context.beginPath()
    context.fillStyle = '#8e44ad'
    context.arc(landmark.x, landmark.y, 2, 0, Math.PI * 2)
    context.fill()
    context.closePath()
  })
}

function drawMutliLine(context: CanvasRenderingContext2D, points: Array<Point2>, start: number, end: number, closed: boolean = false) {
  context.beginPath()
  context.strokeStyle = '#2980b9'
  context.lineWidth = 4
  context.moveTo(points[start].x, points[start].y)
  for (let i = start; i < end; ++i) {
    context.lineTo(points[i].x, points[i].y)
  }
  if (closed) {
    context.lineTo(points[start].x, points[start].y)
  }
  context.stroke()
  context.closePath()
}

function onOpenFileResult(data:string) {

  console.log(data)
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

function drawImage() {
  const imageData = offscreenCtx.getImageData(0, 0, offscreen.value.width, offscreen.value.height)
  let { data, width, height } = window.cv.imgProcess(imageData, imageData.width, imageData.height, {
    isGray: visionStore.isGray,
    contrast: visionStore.contrast,
    brightness: visionStore.brightness,
    laplace: visionStore.laplace,
    enhance: visionStore.enhance
  })
  var grayImg = new ImageData(data as ImageDataArray, width, height)
  previewCtx.putImageData(grayImg, 0, 0)
}

watch(() => visionStore.isGray, (val) => {
  drawImage()
})

watch(() => visionStore.enhance, (val) => {
  drawImage()
})

watch(() => visionStore.contrast, (val) => {
  drawImage()
})

watch(() => visionStore.laplace, (val) => {
  drawImage()
})

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