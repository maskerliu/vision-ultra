<!-- src/renderer/pages/components/McpClient.vue -->
<template>
  <div>
    <t-chatbot :chat-service-config="chatServiceConfig" />
  </div>
</template>

<script setup lang="ts">
import type { AIMessageContent, ChatServiceConfig, SSEChunkData } from '@tdesign-vue-next/chat'
import { onMounted } from 'vue'

const chatServiceConfig: ChatServiceConfig = {
  // 对话服务地址
  endpoint: 'https://1257786608-9i9j1kpa67.ap-guangzhou.tencentscf.com/sse/normal',
  // 开启流式传输
  stream: true,
  // 解析后端返回的数据，转换为组件所需格式
  onMessage: (chunk: SSEChunkData): AIMessageContent => {
    const { ...rest } = chunk.data as any
    return {
      type: 'markdown',
      data: rest?.msg || '',
    }
  },
}

onMounted(async () => {
  // await initializeMcp()
})

</script>

<style scoped></style>