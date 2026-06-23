<template>
  <div class="chat-panel">
    <van-cell class="chat-header" :title="aiStore.activeSession?.title || '聊天'" center />
    <div class="chat-body">
      <deep-chat ref="deepChatRef" :demo="false" :images="imageConfig" :mixedFiles="mixedFileConfig"
        :connect="connectConfig" :messageStyles="messageConfig" :submitButtonStyles="submitStyle"
        :inputAreaStyle="inputAreaStyle" :textInput="textInputConfig" :customButtons="customButtonConfig"
        :dropupStyles="dropupStyles" :attachmentContainerStyle="attachContainerStyle" :chatStyle="chatStyle"
        :history="localHistory" :auxiliaryStyle="imageAuxiliaryStyle" />
    </div>
  </div>
</template>

<script lang="ts" setup>

import { AIStore } from '@renderer/store'
import 'deep-chat'
import { computed, onMounted, ref, watch } from 'vue'

const aiStore = AIStore()
const deepChatRef = ref<any>(null)
const localHistory = ref<any[]>([])


/* ========== 样式配置 ========== */
const chatStyle = {
  position: 'relative',
  backgroundColor: 'transparent',
  borderRadius: '0',
  border: '0 solid #e2e2e2',
  width: '100%',
  height: '100%',
}

const messageConfig = {
  default: {
    shared: {
      outerContainer: {},
      text: { color: 'var(--van-text-color)' }
    },
    user: {
      bubble: {
        color: 'var(--van-text-color)',
        backgroundColor: 'lightblue',
        borderRadius: '0',
        maxWidth: '80%',
      },
    },
    ai: {
      bubble: {
        color: 'var(--van-text-color)',
        backgroundColor: '#e2e2e255',
        borderRadius: '4px',
        maxWidth: '90%',
        width: '90%',
      },
    },
  },
}

const inputAreaStyle = {
  borderRadius: '12px',
  border: '1px solid #e5e8eb',
  width: '80%',
  marginBottom: '12px',
}

const textInputConfig = {
  styles: {
    container: {
      padding: '4px 0',
      backgroundColor: 'transparent',
      flex: '1',
      margin: '0 0 40px 0',
      border: 'none',
      boxShadow: 'none'
    },
    text: {
      padding: '10px 6px 12px 8px',
      color: 'var(--van-text-color)',
      fontSize: 'var(--van-font-size-lg)',
      border: 'none',
      borderRadius: '12px',
      backgroundColor: 'transparent',
    },
  },
  placeholder: { text: '发送消息...' },
  background: 'transparent',
  margin: '0'
}

const attachContainerStyle = {
  top: '-3.8em',
}

const submitStyle = {
  position: 'inside-end',
  submit: {
    styles: {
      container: {
        default: {
          borderRadius: '20px',
          backgroundColor: '#4d6bfe',
          border: '1px solid #4d6bfe',
          marginRight: '10px',
        },
        hover: {
          backgroundColor: 'var(--van-primary-color)',
        },
      },
    },
  },
}

// 自定义按钮：模型名（右侧）
const customButtonConfig = computed(() => [
  {
    position: 'inside-start' as const,
    styles: {
      button: {
        default: {
          container: {
            default: {
              border: '1px solid #e5e8eb',
              borderRadius: '15px',
              padding: '4px 12px',
              margin: '0 0 0 35px',
              fontSize: '13px',
            },
          },
          text: {
            content: aiStore.model,
          },
        },
      },
    },
  },
  {
    position: 'inside-start' as const,
    styles: {
      button: {
        default: {
          container: {
            default: {
              border: '1px solid #e5e8eb',
              borderRadius: '15px',
              padding: '4px 12px',
              margin: '0 0 0 155px',
              fontSize: '13px',
            },
          },
          text: {
            content: '智能搜索',
          },
        },
      },
    },
  },
])

const imageConfig = {
  files: { acceptedFormats: 'image/*' },
}

const mixedFileConfig = {
  files: { acceptedFormats: '.pdf,.doc,.docx,.txt,.md,.csv,.json,.xml,.zip' },
}

// 注入 deep-chat shadow DOM 的辅助样式（用于控制图片显示大小等 shadow 内样式）
const imageAuxiliaryStyle = `
  .file-message img {
    max-width: 100%;
    max-height: 360px;
    width: auto;
    height: auto;
    object-fit: contain;
    border-radius: 8px;
    display: block;
  }
`
const dropupStyles = {
  button: {
    position: 'inside-start',
    styles: {
      default: {
        container: {
          default: {
            padding: '10px',
            borderRadius: '50%',
            border: '1px solid #e5e8eb',
          },
        },
      },
    },
  },
  menu: {
    container: {
      border: '1px solid #e5e8eb',
      borderRadius: '6px',
      backgroundColor: 'var(--van-gray-1)',
    },
    text: { color: 'var(--van-text-color)', fontSize: '14px' },
    item: {
      padding: '10px 16px',
      borderRadius: '8px',
      border: 'none',
      hover: { backgroundColor: 'var(--van-gray-2)' },
    },
    iconContainer: { marginRight: '10px' },
  },
}

/* ========== 连接配置 ========== */
const connectConfig = {
  handler: chatHandler,
}

onMounted(() => {
  localHistory.value = aiStore.activeSession?.history || []
})

watch(() => aiStore.activeSessionId, (id) => {
  localHistory.value = aiStore.activeSession?.history || []
})

// 将 deep-chat 内部消息同步回 store（handler 返回后延迟执行）
function syncToStore() {
  setTimeout(() => {
    const dc = deepChatRef.value
    if (!dc?.getMessages) return
    const msgs = dc.getMessages()
    const id = aiStore.activeSessionId
    if (!id || !msgs?.length) return
    const session = aiStore.sessions.find((s) => s.id === id)
    if (session) {
      session.history = msgs
      session.updatedAt = Date.now()
      aiStore.saveToStorage()
    }
  }, 200)
}

/* ========== 核心 Handler ========== */
async function chatHandler(body: any, signals: any) {
  let ollamaMessages: any[] = []

  if (body instanceof FormData) {
    let text = ''
    let files: File[] = []

    body.forEach((value: any, key: string) => {
      if (key === 'message1' || key === 'text' || key === 'content') {
        try { text = JSON.parse(value).text || value } catch { text = value }
      }
      if (key === 'files') {
        files = body.getAll('files') as File[]
      }
    })

    if (text || files.length) {
      const msg: any = { role: 'user', content: text }
      if (files.length) {
        const imageFiles = files.filter((f) => f.type?.startsWith('image/'))
        if (imageFiles.length) {
          msg.images = await Promise.all(
            imageFiles.map(
              (f) =>
                new Promise<string>((resolve) => {
                  const reader = new FileReader()
                  reader.onload = () =>
                    resolve((reader.result as string).replace(/^data:image\/\w+;base64,/, ''))
                  reader.readAsDataURL(f)
                })
            )
          )
        }
      }
      ollamaMessages.push(msg)
    }
  } else {
    const messages = Array.isArray(body) ? body : body.messages || (body.text ? [body] : [])
    for (const msg of messages) {
      ollamaMessages.push({
        role: msg.role === 'ai' ? 'assistant' : msg.role || 'user',
        content: msg.text || msg.content || '',
      })
    }
  }

  if (!ollamaMessages.length) {
    return { error: '没有有效的消息内容' }
  }

  try {
    const res = await fetch(`${aiStore.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: aiStore.model,
        messages: ollamaMessages,
        stream: false,
        options: { temperature: 0.7 },
      }),
      signal: signals?.signal,
    })

    if (!res.ok) throw new Error(`Ollama error: ${res.status}`)
    const data = await res.json()
    const text = data.message?.content || ''
    signals.onResponse({ text, role: 'ai' })
    syncToStore()
  } catch (err: any) {
    console.error('[chat] handler error:', err)
    signals.onResponse({ error: `请求失败: ${err.message}` })
  }
}
</script>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  /* background: var(--background-color); */
}

.chat-header {
  flex-shrink: 0;
}

.chat-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.chat-body :deep(deep-chat) {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.chat-body :deep(deep-chat) .dc-chat-container {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}

.chat-body :deep(deep-chat) .dc-messages-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.chat-body :deep(deep-chat) .dc-input-container {
  flex-shrink: 0;
}

.chat-body :deep(deep-chat) .dc-input-outer-container {
  margin-top: auto;
}
</style>
