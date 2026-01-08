<template>
  <van-field :label="label" :input-align="inputAlign">
    <template #input>
      <van-slider :bar-height="barHeight" :min="min" :max="max" :step="step" v-model="sliderValue">
        <template #button>
          <van-button plain class="slider-button"> {{ sliderValue }} </van-button>
        </template>
      </van-slider>
    </template>
  </van-field>
</template>
<script lang="ts" setup>

import { FieldTextAlign } from 'vant'

const { label = '', inputAlign = 'center', barHeight = '4px', min = 1, max = 100, step = 1 } = defineProps<{
  label?: string | number,
  inputAlign?: FieldTextAlign,
  barHeight?: string,
  min?: number,
  max?: number,
  step?: number,
}>()

const sliderValue = defineModel('sliderValue', {
  required: true,
  default: 0,
  type: Number
})

</script>
<style scoped>
.slider-button {
  width: 26px;
  height: 26px;
  padding: 0;
}
</style>