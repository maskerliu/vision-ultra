<template>
  <canvas ref="live2d" width="400" height="400"
    style="position: absolute; right: 5px; bottom: 8px; z-index: 100; "></canvas>
</template>
<script lang="ts" setup>

import { Face, TFace, Vector } from 'kalidokit'
import Live2DCubismModel, { Live2DModelOptions } from 'live2d-renderer'
import { onMounted, useTemplateRef } from 'vue'

const lerp = Vector.lerp
const live2d = useTemplateRef<HTMLCanvasElement>('live2d')

let liveModel: Live2DCubismModel

defineExpose({ animateLive2DModel })

onMounted(async () => {
  let options: Live2DModelOptions = {
    autoAnimate: false,
    scale: 1,
    randomMotion: false,
    // enablePan: false,
    doubleClickReset: false,
    enablePose: false,
    appendYOffset: 0,
    cubismCorePath: 'static/live2dcubismcore.min.js',
  }

  liveModel = new Live2DCubismModel(live2d.value, options)
  await liveModel.load('./static/hiyori_free_zh/hiyori_free_t08.model3.json') // Load model3.json

})

function animateLive2DModel(face: TFace) {
  try {
    rigFace(face, 0.5)
  } catch (err) {
    console.error(err)
  }

}

function rigFace(result: TFace, lerpAmount = 0.7) {

  // liveModel.eyeBlink = undefined

  const dampener = 0.3
  let Params: Array<{ name: string, value: number, lerp?: number }> = [
    { name: 'ParamEyeBallX', value: result.pupil.x, },
    { name: 'ParamEyeBallY', value: result.pupil.y },
    { name: 'ParamAngleX', value: result.head.degrees.y },
    { name: 'ParamAngleY', value: result.head.degrees.x },
    { name: 'ParamAngleZ', value: result.head.degrees.z },
    { name: 'ParamBodyAngleX', value: result.head.degrees.y * dampener },
    { name: 'ParamBodyAngleY', value: result.head.degrees.x * dampener },
    { name: 'ParamBodyAngleZ', value: result.head.degrees.z * dampener },
    // { name: 'ParamMouthOpenY', value: result.lips.openY, lerp: 0.3 },
  ]

  for (let param of Params) {
    // console.log(param.name, liveModel.getParameterValue(param.name))
    liveModel.setParameter(param.name,
      lerp(param.value, liveModel.getParameterValue(param.name), param.lerp ? param.lerp : lerpAmount)
    )
  }

  // Simple example without winking.
  // Interpolate based on old blendshape, then stabilize blink with `Kalidokit` helper function.
  let stabilizedEyes = Face.stabilizeBlink(
    {
      l: lerp(result.eye.l, liveModel.getParameterValue("ParamEyeLOpen"), 0.7),
      r: lerp(result.eye.r, liveModel.getParameterValue("ParamEyeROpen"), 0.7)
    },
    result.head.y
  )
  // eye blink
  liveModel.setParameter("ParamEyeLOpen", stabilizedEyes.l)
  liveModel.setParameter("ParamEyeROpen", stabilizedEyes.r)

  // Adding 0.3 to ParamMouthForm to make default more of a "smile"
  liveModel.setParameter("ParamMouthForm",
    0.3 + lerp(result.mouth.x, liveModel.getParameterValue("ParamMouthForm"), 0.3)
  )

  // liveModel.motionManager.update = () => {
  //   // disable default blink animation

  // }
}
</script>
<style scoped></style>