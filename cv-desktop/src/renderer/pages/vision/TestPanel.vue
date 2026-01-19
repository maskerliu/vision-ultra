<template>
  <div class="whiteboard-container">
    <!-- 工具栏 -->
    <div class="toolbar">
      <button v-for="tool in tools" :key="tool" @click="currentTool = tool" :class="{ active: currentTool === tool }">
        {{ tool }}
      </button>
      <button @click="clearCanvas">清空白板</button>
    </div>

    <!-- 画布区域 -->
    <div class="canvas-wrapper">
      <canvas ref="fabricCanvas" width="800" height="600"></canvas>
    </div>
  </div>
</template>

<script setup>

import * as fabric from 'fabric' // 引入 Fabric.js[citation:2]
import { onMounted, ref, watch } from 'vue'

// 定义可用工具
const tools = ['矩形', '线段', '多边形', '圆', '椭圆']
const currentTool = ref('矩形')
const fabricCanvas = ref('fabricCanvas')
// 用于存储 Fabric.js 画布实例和绘图过程中的临时变量
let canvas = null
let isDrawing = false
let startPoint = null // 鼠标按下的起始点
let currentShape = null // 当前正在绘制的图形对象
let polygonPoints = [] // 用于存储多边形的多个点

// 初始化画布
const initCanvas = () => {
  canvas = new fabric.Canvas(fabricCanvas.value, {
    backgroundColor: '#f8f9fa',
    isDrawingMode: false, // 禁用自由画笔模式
  })

  // 监听鼠标按下事件，开始绘制
  canvas.on('mouse:down', (options) => {
    if (currentTool.value === '多边形') {
      handlePolygonMouseDown(options)
    } else {
      handleDrawingStart(options)
    }
  })

  // 监听鼠标移动事件，实时更新图形
  canvas.on('mouse:move', (options) => {
    if (isDrawing && currentTool.value !== '多边形') {
      handleDrawingMove(options)
    }
  })

  // 监听鼠标松开事件，结束绘制
  canvas.on('mouse:up', () => {
    if (isDrawing && currentTool.value !== '多边形') {
      handleDrawingEnd()
    }
  })
}

// 处理矩形、线段、圆、椭圆的鼠标按下
const handleDrawingStart = (options) => {
  isDrawing = true
  const pointer = canvas.getPointer(options.e)
  startPoint = { x: pointer.x, y: pointer.y }

  // 根据当前工具创建初始图形对象
  switch (currentTool.value) {
    case '矩形':
      currentShape = new fabric.Rect({
        left: startPoint.x,
        top: startPoint.y,
        width: 0,
        height: 0,
        fill: 'transparent',
        stroke: '#0000ff',
        strokeWidth: 2,
      })
      break
    case '线段':
      currentShape = new fabric.Line(
        [startPoint.x, startPoint.y, startPoint.x, startPoint.y],
        {
          stroke: '#ff0000',
          strokeWidth: 2,
        }
      )
      break
    case '圆':
      currentShape = new fabric.Circle({
        left: startPoint.x,
        top: startPoint.y,
        radius: 0,
        fill: 'transparent',
        stroke: '#00aa00',
        strokeWidth: 2,
      })
      break
    case '椭圆':
      currentShape = new fabric.Ellipse({
        left: startPoint.x,
        top: startPoint.y,
        rx: 0,
        ry: 0,
        fill: 'transparent',
        stroke: '#aa00aa',
        strokeWidth: 2,
      })
      break
  }

  if (currentShape) {
    canvas.add(currentShape)
  }
}

// 处理矩形、线段、圆、椭圆的鼠标移动
const handleDrawingMove = (options) => {
  if (!currentShape || !startPoint) return

  const pointer = canvas.getPointer(options.e)
  const width = pointer.x - startPoint.x
  const height = pointer.y - startPoint.y

  switch (currentTool.value) {
    case '矩形':
      currentShape.set({
        width: Math.abs(width),
        height: Math.abs(height),
        left: width > 0 ? startPoint.x : pointer.x,
        top: height > 0 ? startPoint.y : pointer.y,
      })
      break
    case '线段':
      currentShape.set({ x2: pointer.x, y2: pointer.y })
      break
    case '圆':
      // 半径取宽高绝对值的最大值
      const radius = Math.max(Math.abs(width), Math.abs(height)) / 2
      currentShape.set({ radius: radius })
      // 调整圆心位置，使其始终从起点向外扩张
      currentShape.set({
        left: startPoint.x - (width < 0 ? -radius : radius),
        top: startPoint.y - (height < 0 ? -radius : radius),
      })
      break
    case '椭圆':
      currentShape.set({
        rx: Math.abs(width) / 2,
        ry: Math.abs(height) / 2,
        left: startPoint.x - (width < 0 ? -Math.abs(width) / 2 : Math.abs(width) / 2),
        top: startPoint.y - (height < 0 ? -Math.abs(height) / 2 : Math.abs(height) / 2),
      })
      break
  }
  canvas.renderAll() // 重新渲染画布以更新图形[citation:10]
}

// 处理矩形、线段、圆、椭圆的鼠标松开
const handleDrawingEnd = () => {
  isDrawing = false
  startPoint = null
  currentShape = null
}

// 处理多边形的鼠标按下（多边形需要多点绘制）
const handlePolygonMouseDown = (options) => {
  const pointer = canvas.getPointer(options.e)
  polygonPoints.push({ x: pointer.x, y: pointer.y })

  // 如果已有多于一个点，则绘制临时的线段
  if (polygonPoints.length > 1) {
    const lastPoint = polygonPoints[polygonPoints.length - 2]
    const line = new fabric.Line(
      [lastPoint.x, lastPoint.y, pointer.x, pointer.y],
      {
        stroke: '#666',
        strokeWidth: 1,
        selectable: false,
        evented: false,
      }
    )
    canvas.add(line)
    canvas.renderAll()
  }

  // 绘制一个点作为标记
  const pointCircle = new fabric.Circle({
    left: pointer.x - 3,
    top: pointer.y - 3,
    radius: 3,
    fill: '#ff9900',
    selectable: false,
    evented: false,
  })
  canvas.add(pointCircle)
}

// 完成多边形绘制（例如，可以通过双击或点击特定按钮触发）
const completePolygon = () => {
  if (polygonPoints.length < 3) {
    alert('多边形至少需要三个顶点')
    return
  }
  const polygon = new fabric.Polygon(polygonPoints, {
    fill: 'transparent',
    stroke: '#ff9900',
    strokeWidth: 2,
  })
  canvas.add(polygon)

  // 清理临时点和线段
  canvas.getObjects().forEach((obj) => {
    if (obj.type === 'line' || (obj.type === 'circle' && obj.radius === 3)) {
      canvas.remove(obj)
    }
  })
  canvas.renderAll()
  polygonPoints = [] // 重置点数组
}

// 清空白板
const clearCanvas = () => {
  if (canvas) {
    canvas.clear()
    canvas.backgroundColor = '#f8f9fa' // 重新设置背景色
  }
  polygonPoints = [] // 同时清空多边形点数组
}

// 监听工具切换，如果切出“多边形”模式，则清理未完成的绘制
watch(currentTool, (newTool) => {
  if (newTool !== '多边形') {
    // 清理未完成的多边形临时图形
    canvas.getObjects().forEach((obj) => {
      if (obj.type === 'line' || (obj.type === 'circle' && obj.radius === 3)) {
        canvas.remove(obj)
      }
    })
    canvas.renderAll()
    polygonPoints = []
  }
})

// 组件挂载时初始化画布
onMounted(() => {
  initCanvas()
})

// 注意：在真实项目中，你需要在组件卸载时调用 `canvas.dispose()` 来释放资源。
</script>

<style scoped>
.whiteboard-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.toolbar {
  padding: 10px;
  background: #eee;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.toolbar button {
  padding: 8px 16px;
  border: 1px solid #ccc;
  background: white;
  cursor: pointer;
  border-radius: 4px;
}

.toolbar button.active {
  background-color: #007bff;
  color: white;
  border-color: #0056b3;
}

.canvas-wrapper {
  flex: 1;
  overflow: auto;
  padding: 10px;
}

#fabric-canvas {
  border: 1px solid #ccc;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
</style>