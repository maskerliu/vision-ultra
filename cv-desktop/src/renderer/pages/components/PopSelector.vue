<template>
  <van-popover v-model:show="show" :show-arrow="false" placement="bottom-end" overlay>
    <template #reference>
      <div class="van-ellipsis" style="cursor: pointer; max-width: 100px; margin-top: 5px;">{{ label }}</div>
    </template>
    <van-col class="model-container" :style="{ height, width }">
      <van-cell v-for="model in models" :key="model.name" center clickable :title="$t(`cvControl.model.${model.name}`)"
        title-class="van-ellipsis" @click="onSelect(model)">
        <template #right-icon>
          <van-tag v-if="model.name === label" plain>使用中</van-tag>
        </template>
      </van-cell>
    </van-col>
  </van-popover>
</template>
<script lang="ts" setup>

import type { ModelInfo } from '@shared/index'
import { ref } from 'vue'

defineProps({
  label: {
    type: String,
    default: '',
  },
  models: {
    type: Array as () => ModelInfo[],
    default: () => [],
  },
  width: {
    type: String,
    default: '288px',
  },
  height: {
    type: String,
    default: '260px',
  },
})

const show = ref(false)

const emit = defineEmits<{
  (e: 'onSelected', model: ModelInfo): void
}>()
function onSelect(model: ModelInfo) {
  show.value = false
  emit('onSelected', model)
}
</script>

<style scoped>
.model-container {
  overflow: hidden scroll;
  padding: 10px 0 10px 4px;
  background-color: var(--van-gray-1);
}
</style>