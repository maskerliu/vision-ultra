import { defineStore } from 'pinia'

export interface ChatMessage {
  role: 'user' | 'ai'
  text: string
  files?: any[]
}

export interface ChatSession {
  id: string
  title: string
  history: ChatMessage[]
  createdAt: number
  updatedAt: number
}

const STORAGE_KEY = 'ai_chat_sessions'

export const AIStore = defineStore('AI', {
  state: () => ({
    sessions: [] as ChatSession[],
    activeSessionId: '',
    ollamaUrl: 'http://localhost:11434',
    model: 'glm-ocr',
    loading: false,
  }),

  getters: {
    activeSession: (state) =>
      state.sessions.find((s) => s.id === state.activeSessionId),

    activeHistory: (state) =>
      state.sessions.find((s) => s.id === state.activeSessionId)?.history ?? [],

    sortedSessions: (state) =>
      [...state.sessions].sort((a, b) => b.updatedAt - a.updatedAt),
  },

  actions: {
    createSession(title?: string) {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
      const session: ChatSession = {
        id,
        title: title || '新会话',
        history: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      this.sessions.unshift(session)
      this.activeSessionId = id
      this.saveToStorage()
      return session
    },

    deleteSession(id: string) {
      const idx = this.sessions.findIndex((s) => s.id === id)
      if (idx !== -1) {
        this.sessions.splice(idx, 1)
        if (this.activeSessionId === id) {
          this.activeSessionId = this.sessions[0]?.id || ''
        }
        this.saveToStorage()
      }
    },

    renameSession(id: string, title: string) {
      const session = this.sessions.find((s) => s.id === id)
      if (session) {
        session.title = title
        session.updatedAt = Date.now()
        this.saveToStorage()
      }
    },

    setActiveSession(id: string) {
      if (this.sessions.some((s) => s.id === id)) {
        this.activeSessionId = id
      }
    },

    addMessage(sessionId: string, msg: ChatMessage) {
      const session = this.sessions.find((s) => s.id === sessionId)
      if (session) {
        session.history.push(msg)
        session.updatedAt = Date.now()
        // 首条用户消息作为会话标题
        if (session.history.filter((m) => m.role === 'user').length === 1) {
          const title = msg.text.slice(0, 30) + (msg.text.length > 30 ? '…' : '')
          session.title = title || '新会话'
        }
        this.saveToStorage()
      }
    },

    clearSession(id: string) {
      const session = this.sessions.find((s) => s.id === id)
      if (session) {
        session.history = []
        session.updatedAt = Date.now()
        this.saveToStorage()
      }
    },

    loadFromStorage() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (raw) {
          this.sessions = JSON.parse(raw)
        }
        const savedActive = window.localStorage.getItem('ai_active_session')
        if (savedActive && this.sessions.some((s) => s.id === savedActive)) {
          this.activeSessionId = savedActive
        } else {
          this.activeSessionId = this.sessions[0]?.id || ''
        }
        // migrate old fields
        const url = window.localStorage.getItem('ai_ollama_url')
        if (url) this.ollamaUrl = url
        const model = window.localStorage.getItem('ai_model')
        if (model) this.model = model
      } catch {
        this.sessions = []
      }
    },

    saveToStorage() {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.sessions))
        window.localStorage.setItem('ai_active_session', this.activeSessionId)
        window.localStorage.setItem('ai_ollama_url', this.ollamaUrl)
        window.localStorage.setItem('ai_model', this.model)
      } catch { /* quota exceeded, ignore */ }
    },
  },
})
