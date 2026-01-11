<template>
  <van-field :label="label" :input-align="inputAlign">
    <template #input>
      <van-slider :bar-height="barHeight" :min="min" :max="max" :step="step" v-model="value" @change="onValueChanged">
        <template #button>
          <van-button plain class="slider-button"> {{ value }} </van-button>
        </template>
      </van-slider>
    </template>
  </van-field>
</template>
<script lang="ts" setup>

import { FieldTextAlign } from 'vant'
import { onMounted, ref } from 'vue'

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

const value = ref(0)

onMounted(() => {
  value.value = sliderValue.value
})


function onValueChanged() {
  sliderValue.value = value.value
}

</script>
<style scoped>
.slider-button {
  width: 24px;
  height: 20px;
  padding: 0;
  margin-bottom: 7px;
}
</style>