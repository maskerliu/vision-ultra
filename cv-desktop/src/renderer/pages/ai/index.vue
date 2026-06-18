<template>
  <div class="ai-layout">
    <!-- 左侧会话栏 -->
    <aside class="ai-sidebar" :class="{ collapsed: sidebarCollapsed }">
      <van-row justify="space-between"
        style="position: relative; z-index: 100; padding: 10px 12px; font-size: 16px; -webkit-app-region: no-drag;">
        <van-icon class-prefix="iconfont" name="arrow-left" class="back-btn" v-show="!sidebarCollapsed"
          @click="goBack" />
        <van-icon class-prefix="iconfont" name="side-menu" class="collapse-btn"
          @click="sidebarCollapsed = !sidebarCollapsed" />
      </van-row>

      <van-button plain type="primary" size="small" style="margin: 10px; width: calc(100% - 20px);" @click="newSession">
        <van-icon v-if="sidebarCollapsed" class-prefix="iconfont" name="new-chat" />
        <span v-else>新会话</span>
      </van-button>

      <!-- 会话列表 -->
      <van-cell-group inset class="session-group" v-show="!sidebarCollapsed">
        <van-swipe-cell v-for="session in aiStore.sortedSessions" :key="session.id">
          <van-cell :title="session.title" :label="formatTime(session.updatedAt)"
            :class="{ 'active-cell': session.id === aiStore.activeSessionId }" title-class="van-ellipsis" clickable
            @click="selectSession(session)">
            <template #right-icon>
              <van-col class="cell-actions">
                <van-row><van-icon class-prefix="iconfont" name="edit" size="15"
                    @click.stop="startRename(session)" /></van-row>
                <van-row> <van-icon class-prefix="iconfont" name="delete" size="15"
                    @click.stop="confirmDelete(session)" />
                </van-row>
              </van-col>
            </template>
          </van-cell>
          <template #right>
            <van-button square type="danger" text="删除" @click="confirmDelete(session)" />
          </template>
        </van-swipe-cell>
        <van-empty v-if="!aiStore.sessions.length" description="暂无会话" image-size="60" />
      </van-cell-group>

      <!-- 折叠态：仅显示图标列表 -->
      <div v-show="sidebarCollapsed" class="collapsed-sessions">
        <div v-for="session in aiStore.sortedSessions" :key="session.id" class="collapsed-item"
          :class="{ active: session.id === aiStore.activeSessionId }" @click="selectSession(session)">
          <van-icon class-prefix="iconfont" name="ai-chat" size="20" />
        </div>
        <van-empty v-if="!aiStore.sessions.length" description="" image-size="30" />
      </div>

      <!-- 底部返回 -->
      <div class="sidebar-bottom">
        <van-icon v-show="!sidebarCollapsed" name="arrow-left" size="18" class="back-btn" @click="goBack" />
      </div>
    </aside>

    <!-- 主聊天区域 -->
    <main class="ai-main">
      <div v-if="!aiStore.activeSessionId" class="ai-welcome">
        <van-empty description="选择或创建一个会话开始聊天" />
        <van-button type="primary" round @click="newSession">新建会话</van-button>
      </div>
      <chat-panel v-else :key="aiStore.activeSessionId" />
    </main>

    <!-- 重命名弹窗 -->
    <van-dialog v-model:show="showRename" title="重命名会话" show-cancel-button @confirm="doRename">
      <van-field v-model="renameValue" placeholder="输入新名称" clearable autofocus />
    </van-dialog>
  </div>
</template>

<script setup lang="ts">
import { showConfirmDialog } from 'vant'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { AIStore } from '../../store'
import ChatPanel from './Chat.vue'

const router = useRouter()
const aiStore = AIStore()
const sidebarCollapsed = ref(false)
const showRename = ref(false)
const renameValue = ref('')
let editingSessionId = ''

onMounted(() => {
  aiStore.loadFromStorage()
})

function formatTime(ts: number) {
  const d = new Date(ts)
  const now = Date.now()
  const diff = now - ts
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return d.toTimeString().slice(0, 5)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function goBack() {
  router.back()
}

function newSession() {
  aiStore.createSession()
}

function selectSession(session: any) {
  aiStore.setActiveSession(session.id)
}

function confirmDelete(session: any) {
  showConfirmDialog({
    title: '删除会话',
    message: `确定删除"${session.title}"？`,
  })
    .then(() => aiStore.deleteSession(session.id))
    .catch(() => { })
}

function startRename(session: any) {
  editingSessionId = session.id
  renameValue.value = session.title
  showRename.value = true
}

function doRename() {
  const title = renameValue.value.trim()
  if (title && editingSessionId) {
    aiStore.renameSession(editingSessionId, title)
  }
  editingSessionId = ''
  renameValue.value = ''
}
</script>

<style scoped>
.ai-layout {
  display: flex;
  height: 100vh;
  background: var(--van-background);
  overflow: hidden;
}

/* ===== 左侧栏 ===== */
.ai-sidebar {
  width: 260px;
  display: flex;
  flex-direction: column;
  background: var(--van-gray-1);
  border-right: 1px solid var(--van-gray-3);
  transition: width 0.2s;
  flex-shrink: 0;
}

.ai-sidebar.collapsed {
  width: 56px;
}


.collapse-btn {
  color: var(--van-gray-5);
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 18px;
}

.collapse-btn:hover {
  background: var(--van-gray-3);
  color: var(--van-text-color);
}

.collapsed-add-btn {
  display: block;
  margin: 6px auto 0;
  color: var(--van-primary-color);
  cursor: pointer;
}

/* 会话列表 */
.session-group {
  flex: 1;
  overflow-y: auto;
  margin-top: 4px;
}

.session-cell-title {
  overflow: hidden;
  text-overflow: ellipsis;
  line-clamp: 1;
  white-space: nowrap;
  max-width: 160px;
}

.active-cell {
  --van-cell-background: var(--van-gray-3);
}

.cell-actions {
  display: flex;
  gap: 10px;
  opacity: 0;
  transition: opacity 0.15s;
}

:deep(.van-cell:hover) .cell-actions,
:deep(.active-cell) .cell-actions {
  opacity: 0.6;
}

.cell-actions .van-icon:hover {
  opacity: 1;
  color: var(--van-primary-color);
}

.swipe-del-btn {
  height: 100%;
}

/* 折叠态图标列表 */
.collapsed-sessions {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.collapsed-item {
  display: flex;
  justify-content: center;
  padding: 12px 0;
  cursor: pointer;
  color: var(--van-gray-5);
  border-radius: 8px;
  margin: 2px 6px;
}

.collapsed-item:hover,
.collapsed-item.active {
  color: var(--van-text-color);
  background: var(--van-gray-3);
}

/* 侧栏底部 */
.sidebar-bottom {
  padding: 10px 14px;
  border-top: 1px solid var(--van-gray-3);
}

.back-btn {
  color: var(--van-gray-5);
  cursor: pointer;
  padding: 4px;
}

.back-btn:hover {
  color: var(--van-text-color);
}

.ai-sidebar.collapsed .sidebar-bottom {
  display: flex;
  justify-content: center;
  padding: 10px 0;
}

/* ===== 主区域 ===== */
.ai-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.ai-welcome {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}
</style>
