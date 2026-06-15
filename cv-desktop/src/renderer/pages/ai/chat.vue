<template>
  <div class="chat-panel">
    <van-cell class="chat-header" :title="aiStore.activeSession?.title || '聊天'" center>
      <template #right-icon>
        <van-button size="small" icon="delete-o" round plain type="danger" @click="clearSession" />
      </template>
    </van-cell>

    <div class="chat-body">
      <deep-chat :key="chatKey" :demo="false" :images="imageConfig" :mixedFiles="mixedFileConfig"
        :connect="connectConfig" :messageStyles="messageConfig" :submitButtonStyles="submitStyle"
        :inputAreaStyle="inputAreaStyle" :textInput="textInputConfig" :customButtons="customButtonConfig"
        :dropupStyles="dropupStyles" :attachmentContainerStyle="attachContainerStyle" :history="aiStore.activeHistory"
        :chatStyle="chatStyle" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { showConfirmDialog } from 'vant'
import { computed, ref, watch } from 'vue'
import { AIStore } from '../../store'

const aiStore = AIStore()
const chatKey = ref(0)

watch(() => aiStore.activeSessionId, () => {
  chatKey.value++
})

/* ========== 样式配置 ========== */
const chatStyle = {
  position: 'relative',
  container: { padding: '5px' },
  backgroundColor: 'transparent',
  borderRadius: '0',
  border: '0 solid #e2e2e2',
  width: '100%',
  height: '100%',
}

const messageConfig = {
  default: {
    shared: {
      outerContainer: {
        backgroundColor: 'lightgray',
        height: 'calc(100% - 110px)',
      },

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
        maxWidth: '100%',
        width: '100%',
      },
    },
  },
  height: 'calc(100% - 100px)',
}

// 输入区外层容器 — DeepSeek 风格圆角卡片
const inputAreaStyle = {
  position: 'absolute',
  bottom: '0',
  left: '0',
  right: '0',
  backgroundColor: '#f4f6f8',
  borderRadius: '12px',
  border: '1px solid #e5e8eb',
  margin: '5px',
  alignSelf: 'center',
  width: 'calc(100% - 10px)',
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
      marginBottom: '20px',
      padding: '0px 6px 12px 6px',
      color: 'var(--van-text-color)',
      fontSize: '15px',
      border: 'none',
      borderRadius: '12px',
      backgroundColor: 'transparent',
    },
  },
  placeholder: { text: '发送消息...' },
  background: 'transparent',
  margin: '0'
}

// 附件按钮容器
const attachContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  top: '-3.8em',
}

// 提交按钮：圆形蓝色箭头
const submitSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`
const submitStyle = {
  position: 'inside-end' as const,
  submit: {
    styles: {
      container: {
        default: {
          width: '2rem',
          height: '2rem',
          borderRadius: '50%',
          backgroundColor: '#4d6bfe',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
        hover: {
          backgroundColor: '#3b5bdb',
        },
      },
      svg: {
        content: submitSvg,
        styles: {
          default: {
            width: '2rem',
            height: '2rem',
            filter: 'brightness(0) invert(1)',
          },
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
              borderRadius: '20px',
              padding: '4px 12px',
              margin: '0 0 -5px -0.6rem',
              fontSize: '13px',
            },
          },
          text: {
            content: aiStore.model,
            // styles: { default: { color: '#333', fontWeight: '500' } },
          },
        },
      },
    },
  },
])

// 文件上传 + 号按钮 dropup
const imageConfig = { files: { acceptedFormats: 'image/*' } }
const mixedFileConfig = { files: { acceptedFormats: '.pdf,.doc,.docx,.txt,.md,.csv,.json,.xml,.zip' } }

const dropupStyles = {
  button: {
    styles: {
      default: {
        container: {
          default: {
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: '1px solid #e5e8eb',
            backgroundColor: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 10px',
            padding: '0',
          },
        },
        svg: {
          styles: {
            default: { width: '40px', height: '40px' },
          },
        },
      },
    },
  },
  menu: {
    container: {
      border: '1px solid #e5e8eb',
      borderRadius: '12px',
      padding: '6px',
      backgroundColor: '#fff',
      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    },
    text: { color: '#333', fontSize: '14px' },
    item: {
      padding: '10px 16px',
      borderRadius: '8px',
      border: 'none',
      hover: { backgroundColor: '#f0f2f5' },
    },
    iconContainer: { marginRight: '10px' },
  },
}

/* ========== 连接配置 ========== */
const connectConfig = {
  stream: false,
  handler: chatHandler,
}

/* ========== 核心 Handler ========== */
async function chatHandler(body: any, signals: any) {
  let ollamaMessages: any[] = []
  const sessionId = aiStore.activeSessionId

  if (body instanceof FormData) {
    const text = (body.get('message') || body.get('text') || '') as string
    const files = body.getAll('files') as File[]

    if (text || files.length) {
      const msg: any = { role: 'user', content: text || '' }
      if (files.length) {
        const imageFiles = files.filter((f) => f.type?.startsWith('image/'))
        const otherFiles = files.filter((f) => !f.type?.startsWith('image/'))
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
        if (otherFiles.length) {
          const names = otherFiles.map((f) => `📎 ${f.name}`).join('\n')
          msg.content = [msg.content, names].filter(Boolean).join('\n')
        }
      }
      ollamaMessages.push(msg)
      aiStore.addMessage(sessionId, {
        role: 'user',
        text: text + (files.length ? ` [${files.length}个文件]` : ''),
        files: files.map((f) => ({ name: f.name, type: f.type })),
      })
    }
  } else {
    const messages = Array.isArray(body) ? body : body.messages || (body.text ? [body] : [])
    for (const msg of messages) {
      ollamaMessages.push({
        role: msg.role === 'ai' ? 'assistant' : msg.role || 'user',
        content: msg.text || msg.content || '',
      })
    }
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user' || !m.role)
    if (lastUserMsg) {
      aiStore.addMessage(sessionId, {
        role: 'user',
        text: lastUserMsg.text || lastUserMsg.content || '',
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

    if (text) {
      aiStore.addMessage(sessionId, { role: 'ai', text })
    }

    return new Response(JSON.stringify({ text, role: 'ai', overwrite: false }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return { error: `请求失败: ${err.message}` }
  }
}

/* ========== 事件处理 ========== */
function clearSession() {
  showConfirmDialog({
    title: '清空会话',
    message: '确定清空当前会话的所有消息？',
  }).then(() => {
    aiStore.clearSession(aiStore.activeSessionId)
    chatKey.value++
  }).catch(() => { })
}
</script>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
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
  display: block;
  height: 100%;
}
</style>
