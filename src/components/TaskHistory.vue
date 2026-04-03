<template>
  <div class="task-history">
    <div class="history-header">
      <div class="filter-bar">
        <el-select v-model="filterStatus" placeholder="状态筛选" clearable size="default" style="width:140px" @change="loadTasks">
          <el-option label="全部" value="" />
          <el-option label="排队中" value="queued" />
          <el-option label="生成中" value="running" />
          <el-option label="已完成" value="succeeded" />
          <el-option label="失败" value="failed" />
          <el-option label="已超时" value="expired" />
          <el-option label="已取消" value="cancelled" />
        </el-select>
        <el-button @click="loadTasks" :loading="loading">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
      <div class="task-count" v-if="total > 0">共 {{ total }} 条记录</div>
    </div>

    <div v-if="!apiKey" class="empty-state">
      <el-icon :size="48" color="var(--text-muted)"><Key /></el-icon>
      <p>请先在右上角设置 API Key</p>
    </div>

    <div v-else-if="loading && tasks.length === 0" class="empty-state">
      <el-icon :size="32" class="is-loading" color="var(--accent)"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <div v-else-if="tasks.length === 0" class="empty-state">
      <el-icon :size="48" color="var(--text-muted)"><VideoCamera /></el-icon>
      <p>暂无生成记录</p>
    </div>

    <div v-else class="task-grid">
      <div v-for="task in tasks" :key="task.id" class="task-card">
        <div class="card-header">
          <span class="task-model">{{ task.model }}</span>
          <el-tag :type="statusTagType(task.status)" size="small" effect="plain">
            {{ statusLabel(task.status) }}
          </el-tag>
        </div>

        <!-- 视频预览 -->
        <div class="card-video" v-if="task.status === 'succeeded' && task.content?.video_url">
          <video :src="task.content.video_url" controls class="task-video" />
        </div>
        <div v-else class="card-placeholder">
          <el-icon v-if="task.status === 'running'" :size="32" class="is-loading" color="var(--accent)"><Loading /></el-icon>
          <el-icon v-else-if="task.status === 'failed'" :size="32" color="var(--danger)"><WarningFilled /></el-icon>
          <el-icon v-else :size="32" color="var(--text-muted)"><VideoCamera /></el-icon>
        </div>

        <div class="card-info">
          <div class="info-row">
            <span class="info-label">任务ID</span>
            <span class="info-value mono">{{ task.id }}</span>
          </div>
          <div class="info-row" v-if="task.resolution">
            <span class="info-label">分辨率</span>
            <span class="info-value">{{ task.resolution }}</span>
          </div>
          <div class="info-row" v-if="task.ratio">
            <span class="info-label">宽高比</span>
            <span class="info-value">{{ task.ratio }}</span>
          </div>
          <div class="info-row" v-if="task.duration">
            <span class="info-label">时长</span>
            <span class="info-value">{{ task.duration }}秒</span>
          </div>
          <div class="info-row" v-if="task.usage?.total_tokens">
            <span class="info-label">Token消耗</span>
            <span class="info-value">{{ formatTokens(task.usage) }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">创建时间</span>
            <span class="info-value">{{ formatTime(task.created_at) }}</span>
          </div>
          <div class="info-row" v-if="task.error?.message">
            <span class="info-label">错误信息</span>
            <span class="info-value error-text">{{ task.error.message }}</span>
          </div>
        </div>

        <div class="card-actions">
          <el-button
            v-if="task.content?.video_url"
            type="primary"
            size="small"
            @click="downloadVideo(task.content.video_url)"
          >
            <el-icon><Download /></el-icon> 下载
          </el-button>
          <el-button
            v-if="['queued', 'succeeded', 'failed', 'expired'].includes(task.status)"
            type="danger"
            size="small"
            plain
            @click="handleDelete(task)"
          >
            {{ task.status === 'queued' ? '取消' : '删除' }}
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Refresh, VideoCamera, Download, Key, Loading, WarningFilled
} from '@element-plus/icons-vue'
import { listTasks, deleteTask, getTask } from '../api'

const props = defineProps({
  apiKey: { type: String, default: '' }
})

const tasks = ref([])
const total = ref(0)
const loading = ref(false)
const filterStatus = ref('')
let refreshTimer = null

async function loadTasks() {
  if (!props.apiKey) return
  loading.value = true
  try {
    const params = { page_size: 50 }
    if (filterStatus.value) params.status = filterStatus.value
    const result = await listTasks(props.apiKey, params)
    tasks.value = result.items || []
    total.value = result.total || 0
  } catch (err) {
    ElMessage.error('加载任务列表失败: ' + (err.response?.data?.error?.message || err.message))
  } finally {
    loading.value = false
  }
}

async function handleDelete(task) {
  const action = task.status === 'queued' ? '取消' : '删除'
  try {
    await ElMessageBox.confirm(`确定要${action}任务 ${task.id} 吗？`, '确认', {
      type: 'warning'
    })
    await deleteTask(props.apiKey, task.id)
    ElMessage.success(`${action}成功`)
    loadTasks()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error(`${action}失败`)
    }
  }
}

function downloadVideo(url) {
  const a = document.createElement('a')
  a.href = url
  a.download = `jimeng_${Date.now()}.mp4`
  a.target = '_blank'
  a.click()
}

function statusLabel(status) {
  const map = {
    queued: '排队中', running: '生成中', succeeded: '已完成',
    failed: '失败', expired: '已超时', cancelled: '已取消'
  }
  return map[status] || status
}

function statusTagType(status) {
  const map = {
    queued: 'info', running: 'warning', succeeded: 'success',
    failed: 'danger', expired: 'info', cancelled: 'info'
  }
  return map[status] || 'info'
}

function formatTokens(usage) {
  const total = usage.total_tokens || 0
  if (total >= 10000) {
    return (total / 10000).toFixed(1) + '万'
  }
  return total.toLocaleString()
}

function formatTime(timestamp) {
  if (!timestamp) return '-'
  return new Date(timestamp * 1000).toLocaleString('zh-CN')
}

// 自动轮询更新运行中的任务
function startAutoRefresh() {
  refreshTimer = setInterval(() => {
    const hasActive = tasks.value.some(t => ['queued', 'running'].includes(t.status))
    if (hasActive) {
      tasks.value.forEach(async (task, idx) => {
        if (['queued', 'running'].includes(task.status)) {
          try {
            const updated = await getTask(props.apiKey, task.id)
            tasks.value[idx] = updated
          } catch (e) { /* ignore */ }
        }
      })
    }
  }, 10000)
}

onMounted(() => {
  loadTasks()
  startAutoRefresh()
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<style scoped>
.task-history {
  padding: 24px;
  overflow-y: auto;
  height: 100%;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.filter-bar {
  display: flex;
  gap: 10px;
  align-items: center;
}

.task-count {
  font-size: 13px;
  color: var(--text-muted);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 80px 0;
  color: var(--text-muted);
}

.task-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.task-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.task-card:hover {
  box-shadow: var(--shadow);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-color);
}

.task-model {
  font-size: 12px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}

.card-video {
  background: #000;
}

.task-video {
  width: 100%;
  max-height: 200px;
}

.card-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 140px;
  background: var(--bg-input);
}

.card-info {
  padding: 10px 14px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 3px 0;
  font-size: 12px;
}

.info-label {
  color: var(--text-muted);
  flex-shrink: 0;
}

.info-value {
  color: var(--text-secondary);
  text-align: right;
  word-break: break-all;
}

.mono {
  font-family: monospace;
  font-size: 11px;
}

.error-text {
  color: var(--danger);
}

.card-actions {
  display: flex;
  gap: 8px;
  padding: 6px 14px 10px;
}
</style>
