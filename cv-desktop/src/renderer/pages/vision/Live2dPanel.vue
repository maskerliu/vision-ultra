<template>
  <van-col style="position: absolute; right: 5px; bottom: 0; z-index: 2000; ">
    <van-list style="height: 200px; overflow: hidden scroll;" v-if="showControl">
      <slider-field :label="param.substring(5, param.length)" v-for="(param, idx) in params?.ids"
        v-model:sliderValue="values[idx]" :min="params.minimumValues[idx]" :max="params.maximumValues[idx]"
        :step="(Math.abs(params.maximumValues[idx] - params.minimumValues[idx]) / 100) || 0.01" />
    </van-list>
    <canvas ref="live2d" width="400" height="400"></canvas>
  </van-col>

</template>
<script lang="ts" setup>

import { Face, TFace, Vector } from 'kalidokit'
import Live2DCubismModel, { Live2DModelOptions } from 'live2d-renderer'
import { onMounted, ref, useTemplateRef, watch } from 'vue'
import SliderField from '../components/SliderField.vue'

const lerp = Vector.lerp
const live2d = useTemplateRef<HTMLCanvasElement>('live2d')

let liveModel: Live2DCubismModel

const params = ref<{
  count: number
  ids: string[]
  maximumValues: Float32Array
  minimumValues: Float32Array
  opacities: Float32Array
  values: Float32Array
}>()

const values = ref<Array<number>>([])

const showControl = ref(false)

defineExpose({ animateLive2DModel })

onMounted(async () => {
  let options: Live2DModelOptions = {
    cubismCorePath: 'static/live2dcubismcore.min.js',
    autoAnimate: true,
    autoInteraction: false,
    tapInteraction: false,
    enableMotion: false,
    randomMotion: false,
    enablePan: false,
    doubleClickReset: false,
    enablePose: true,
    enableEyeblink: false,
    scale: 4,
    y: 100,
    appendYOffset: 0,
  }

  liveModel = new Live2DCubismModel(live2d.value, options)
  await liveModel.load('./static/hiyori/Hiyori.model3.json')
  // await liveModel.load('./static/hibiki/hibiki.model3.json')

  params.value = liveModel.parameters
  values.value = new Array<number>(params.value.count)
  for (let i = 0; i < params.value.count; ++i) {
    values.value[i] = Number(params.value.values[i].toFixed(2))
    liveModel.setParameter(params.value.ids[i], values.value[i])
  }
  liveModel.update()
  liveModel.startRandomMotion("Idle_0", 2, null, null)

})


function animateLive2DModel(face: TFace) {
  try {
    rigFace(face, 0.5)
    liveModel.update()
  } catch (err) {
    console.error(err)
  }
}

function rigFace(result: TFace, lerpAmount = 0.7) {
  const dampener = 0.3
  let Params: Array<{ name: string, value: number, lerp?: number }> = [
    { name: 'ParamEyeBallX', value: result.pupil.x, },
    { name: 'ParamEyeBallY', value: result.pupil.y },
    { name: 'ParamAngleX', value: result.head.degrees.x },
    { name: 'ParamAngleY', value: result.head.degrees.y },
    { name: 'ParamAngleZ', value: -result.head.degrees.z },
    { name: 'ParamBodyAngleX', value: result.head.degrees.y * dampener },
    { name: 'ParamBodyAngleY', value: result.head.degrees.x * dampener },
    { name: 'ParamBodyAngleZ', value: -result.head.degrees.z * dampener },
  ]

  for (let param of Params) {
    liveModel.setParameter(param.name,
      lerp(param.value, liveModel.getParameterValue(param.name), param.lerp ? param.lerp : lerpAmount)
    )
  }

  let stabilizedEyes = Face.stabilizeBlink(
    {
      l: lerp(result.eye.l, liveModel.getParameterValue('ParamEyeLOpen'), 0.4),
      r: lerp(result.eye.r, liveModel.getParameterValue('ParamEyeROpen'), 0.4)
    },
    result.head.y
  )
  liveModel.setParameter('ParamEyeLOpen', stabilizedEyes.l)
  liveModel.setParameter('ParamEyeROpen', stabilizedEyes.r)

  liveModel.setParameter('ParamMouthOpenY',
    0.1 + lerp(result.mouth.x, liveModel.getParameterValue('ParamMouthOpenY'), 0.5)
  )
}

watch(() => values.value, () => {
  for (let i = 0; i < params.value.values.length; ++i) {
    liveModel.setParameter(params.value.ids[i], Number(values.value[i].toFixed(2)))
  }
  liveModel.update()
}, { deep: true })

</script>
<style scoped></style>