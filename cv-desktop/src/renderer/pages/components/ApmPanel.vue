<template>
  <div class="apm-panel" ref="apmPanel"></div>
</template>
<script lang="ts" setup>

import * as echarts from 'echarts'
import { onMounted, useTemplateRef } from 'vue'
import { CommonStore } from '../../store'

const apmPanel = useTemplateRef<HTMLElement>('apmPanel')
let fps = 0
let frameCount = 0
let last = performance.now()
const maxHistoryLength = 10
let xAxisData = []
let fpsData = []
let fpsChart: echarts.ECharts
let minFps = Infinity
let maxFps = 0


const commonStore = CommonStore()

onMounted(() => {
  fpsChart = echarts.init(apmPanel.value)

  const option = {

    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const fps = params[0].value
        return `fps: ${fps.toFixed(1)}`
      },
      backgroundColor: 'rgba(5,5,5,0.5)',
      textStyle: { color: '#fff', fontSize: 10 },
      padding: [2, 5, 2, 5]
    },
    grid: {
      left: '5%', right: '5%', bottom: '5%', top: '10%', containLabel: true,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#666' } },
      axisLabel: { color: '#aaa', fontSize: 7, },
      splitLine: {
        show: true,
        lineStyle: { color: 'rgba(255,255,255,0.1)' },
      },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 80,
      axisLine: { lineStyle: { color: '#666' } },
      axisLabel: { color: '#aaa', fontSize: 7 },
      splitLine: {
        show: true,
        lineStyle: { color: 'rgba(255,255,255,0.1)' },
      },
      splitArea: {
        show: true,
        areaStyle: {
          color: [
            'rgba(255, 00, 00, 0.2)',
            'rgba(247, 151, 30, 0.2)',
            'rgba(00, 176, 30, 0.2)',
            'rgba(0, 176, 30, 0.4)',
          ],
        },
      },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 1, color: '#00c6ff' },
      }
    ],

  }
  fpsChart.setOption(option)

  if (commonStore.showApm) {
    updateFps()
  }
})

function updateFps() {
  frameCount++
  const now = performance.now()
  if (now - last >= 200) {
    fps = Math.floor((frameCount * 1000) / (now - last))
    if (fps < minFps) minFps = fps
    if (fps > maxFps) maxFps = fps
    xAxisData.push(Math.floor(now % 1000))
    fpsData.push(fps)
    if (fpsData.length > maxHistoryLength) {
      fpsData.shift()
      xAxisData.shift()
    }
    frameCount = 0
    last = now
    fpsChart.setOption({
      xAxis: { data: xAxisData },
      series: [{ data: fpsData }]
    })
  }

  if (commonStore.showApm) {
    requestAnimationFrame(updateFps)
  }
}
</script>
<style scoped>
.apm-panel {
  position: absolute;
  top: 40px;
  right: 5px;
  width: 210px;
  height: 110px;
  z-index: 1000;
  background-color: #000000AA;
  /* border: 1px solid #f1f2f6; */
  border-radius: 6px;
  box-shadow: 0px 12px 8px -12px #000;
}
</style>