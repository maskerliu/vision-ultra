<template>
  <div class="apm-panel" ref="apmPanel">
  </div>
</template>
<script lang="ts" setup>

import * as echarts from 'echarts'
import { onMounted, useTemplateRef } from 'vue'

const apmPanel = useTemplateRef<HTMLElement>('apmPanel')

// FPS计算变量
let fps = 0
let frameCount = 0
let last = performance.now()
const fpsHistory = []
const maxHistoryLength = 20

let fpsData = []
let fpsChart: echarts.ECharts
// 性能统计
let minFps = Infinity
let maxFps = 0
onMounted(() => {
  // updateFps()
  fpsChart = echarts.init(apmPanel.value)
  const option = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      formatter: function (params) {
        const time = new Date(params[0].value[0])
        const fps = params[0].value[1]
        return `${time.getMinutes().toString().padStart(2, "0")}:${time
          .getSeconds()
          .toString()
          .padStart(2, "0")}<br/>FPS: ${fps.toFixed(1)}`
      },
      backgroundColor: "rgba(0,0,0,0.8)",
      borderColor: "#0072ff",
      textStyle: { color: "#fff" },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "10%",
      top: "10%",
      containLabel: true,
    },
    xAxis: {
      type: "time",
      boundaryGap: false,
      axisLine: { lineStyle: { color: "#666" } },
      axisLabel: { color: "#aaa" },
      splitLine: {
        show: true,
        lineStyle: { color: "rgba(255,255,255,0.1)" },
      },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 120,
      axisLine: { lineStyle: { color: "#666" } },
      axisLabel: { color: "#aaa" },
      splitLine: {
        show: true,
        lineStyle: { color: "rgba(255,255,255,0.1)" },
      },
      splitArea: {
        show: true,
        areaStyle: {
          color: [
            "rgba(255, 65, 108, 0.1)",
            "rgba(247, 151, 30, 0.1)",
            "rgba(33, 147, 176, 0.1)",
            "rgba(0, 176, 155, 0.1)",
          ],
        },
      },
    },
    series: [
      {
        name: "FPS",
        type: "line",
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 3, color: "#00c6ff" },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(0, 198, 255, 0.4)" },
            { offset: 1, color: "rgba(0, 198, 255, 0.05)" },
          ]),
        },
        data: fpsData,
      },
      {
        name: "目标帧率",
        type: "line",
        smooth: true,
        showSymbol: false,
        lineStyle: {
          width: 1,
          color: "rgba(255,255,255,0.3)",
          type: "dashed",
        },
        data: [],
      },
    ],
    visualMap: {
      show: false,
      dimension: 1,
      pieces: [
        { gt: 55, lte: 120, color: "#00b09b" },
        { gt: 45, lte: 55, color: "#2193b0" },
        { gt: 30, lte: 45, color: "#f7971e" },
        { gt: 0, lte: 30, color: "#ff416c" },
      ],
    },
  }
  fpsChart.setOption(option)

  updateFps()
})

// 更新FPS计算
function updateFps() {
  frameCount++
  const now = performance.now()

  // 每100毫秒计算一次FPS
  if (now - last >= 100) {
    fps = (frameCount * 1000) / (now - last)

    // 更新统计数据
    if (fps < minFps) minFps = fps
    if (fps > maxFps) maxFps = fps

    // 添加到历史记录
    fpsHistory.push(fps)
    fpsData.push([now % 10, fps])
    if (fpsHistory.length > maxHistoryLength) {
      fpsData.shift()
    }

    // 重置计数器
    frameCount = 0
    last = now

    const targetData = fpsData.map((point) => [point[0], 60])
    // 重绘面板
    fpsChart.setOption({
      series: [{ data: fpsData }, { data: targetData }],
    })
  }

  // 继续循环
  requestAnimationFrame(updateFps)
}
</script>
<style scoped>
.apm-panel {
  position: absolute;
  top: 37px;
  right: 15rem;
  width: 210px;
  height: 110px;
  z-index: 1000;
  background-color: #00000088;
  border: 1px solid #f1f2f699;
  border-radius: 5px;
  box-shadow: 0px 12px 8px -12px #000;
}
</style>