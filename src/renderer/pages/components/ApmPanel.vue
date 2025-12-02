<template>
  <div class="apm-panel">
    <canvas ref="apmPanel" width="200" height="100" style="margin: 5px;"></canvas>
  </div>
</template>
<script lang="ts" setup>
import { onMounted, useTemplateRef } from 'vue'

const apmPanel = useTemplateRef<HTMLCanvasElement>('apmPanel')

// FPS计算变量
let fps = 0
let frameCount = 0
let lastTime = performance.now()
const fpsHistory = []
const maxHistoryLength = 20

// 性能统计
let minFps = Infinity
let maxFps = 0
onMounted(() => {
  updateFps()
})

function drawFpsPanel(canvas: HTMLCanvasElement) {
  if (!canvas) return
  let ctx = canvas.getContext('2d', { willReadFrequently: true })
  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // 绘制网格线
  ctx.strokeStyle = '#ecf0f1'
  ctx.lineWidth = 0.5

  // 水平网格线
  for (let i = 0; i < 5; i++) {
    const y = (canvas.height - 4) - (i * (canvas.height - 4) / 5) - 2
    ctx.beginPath()
    ctx.moveTo(20, y + 0.5)
    ctx.lineTo(canvas.width - 10, y + 0.5)
    ctx.stroke()

    // 绘制FPS值
    ctx.fillStyle = 'white'
    ctx.font = '8px sans-serif'
    ctx.fillText(String(i * 20), 5, y + 3)
  }

  // 绘制FPS数据线
  if (fpsHistory.length > 1) {
    ctx.strokeStyle = '#16a085'
    ctx.fillStyle = '#16a085'
    ctx.lineWidth = 2
    ctx.beginPath()

    const sliceWidth = (canvas.width - 30) / (maxHistoryLength)

    for (let i = 0; i < fpsHistory.length; i++) {
      const x = i * sliceWidth + 20
      // 将FPS值映射到画布高度（假设最大FPS为100）
      const y = canvas.height - (fpsHistory[i] / 100 * canvas.height)
      ctx.rect(x, y - 4, sliceWidth - 0.5, canvas.height - y)
      // if (i === 0) {
      //   // ctx.moveTo(x, y+2 + 0.5)
      //   ctx.rect(x, y, sliceWidth - 0.5, canvas.height - y + 0.5)
      //   // ctx.arc(x, y, 5, 0, Math.PI * 2, false)
      // } else {
      //   // ctx.lineTo(x, y + 0.5)
      //   ctx.rect(x, y, sliceWidth - 0.5, canvas.height - y + 0.5)
      //   // ctx.arc(x, y, 5, 0, Math.PI * 2, false)
      // }
    }

    ctx.fill()
  }

  // 绘制当前FPS值
  ctx.fillStyle = '#2ecc71'
  ctx.font = '10px sans-serif'
  ctx.fillText(`FPS: ${fps.toFixed(1)}`, 20, 15)

  // 绘制性能指示器
  let indicatorColor = '#2ecc71' // 绿色 - 良好
  if (fps < 30) {
    indicatorColor = '#e74c3c' // 红色 - 差
  } else if (fps < 50) {
    indicatorColor = '#f1c40f' // 橙色 - 中等
  }

  // 绘制指示圆点
  ctx.fillStyle = indicatorColor
  ctx.beginPath()
  ctx.arc(canvas.width - 20, 10, 5, 0, Math.PI * 2)
  ctx.fill()
}

// 更新FPS计算
function updateFps() {
  frameCount++
  const currentTime = performance.now()

  // 每100毫秒计算一次FPS
  if (currentTime - lastTime >= 80) {
    fps = (frameCount * 1000) / (currentTime - lastTime)

    // 更新统计数据
    if (fps < minFps) minFps = fps
    if (fps > maxFps) maxFps = fps

    // 添加到历史记录
    fpsHistory.push(fps)
    if (fpsHistory.length > maxHistoryLength) {
      fpsHistory.shift()
    }

    // 重置计数器
    frameCount = 0
    lastTime = currentTime

    // 重绘面板
    drawFpsPanel(apmPanel.value)
  }

  // 继续循环
  requestAnimationFrame(updateFps)
}
</script>
<style scoped>
.apm-panel {
  position: absolute;
  top: 120px;
  left: 0;
  width: 210px;
  height: 110px;
  z-index: 1000;
  background-color: #2c3e5077;
  border: 2px solid #f1f2f699;
  border-radius: 10px;
}
</style>