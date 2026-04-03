<template>
  <div class="generation-form">
    <!-- 中间内容区 -->
    <div class="main-area">
      <!-- 无任务时：空状态 -->
      <div v-if="!currentTask && !generating" class="empty-state">
        <div class="empty-icon">🎬</div>
        <div class="empty-title">使用官方api接口，开启你的新创作</div>
        <div class="empty-title">为漫剧公司定制版本，公司子账号分配，公司资产管理，不受人员离职影响。接口速度更快。</div>
        <div class="empty-title">多账号，团队管理商业化版本，工作流定制请扫描下方微信二维码联系</div>
        <img src="/3.png" alt="微信二维码" style="width:160px;margin-top:8px;border-radius:8px" />
      </div>

      <!-- 生成中 -->
      <div v-if="generating" class="loading-state">
        <el-icon :size="40" class="is-loading" color="var(--accent)"><Loading /></el-icon>
        <p class="loading-text">任务创建中...</p>
      </div>

      <!-- 任务状态展示 -->
      <div v-if="currentTask" class="task-result-area">
        <div class="result-header">
          <el-tag :type="statusTagType(currentTask.status)" size="default" effect="plain">
            {{ statusLabel(currentTask.status) }}
          </el-tag>
          <span class="task-id-text">任务ID: {{ currentTask.id }}</span>
        </div>

        <!-- 视频预览 -->
        <div v-if="currentTask.status === 'succeeded' && currentTask.content?.video_url" class="video-result">
          <video :src="currentTask.content.video_url" controls class="result-video" />
          <el-button type="primary" class="download-btn" @click="downloadVideo(currentTask.content.video_url)">
            <el-icon><Download /></el-icon> 下载视频
          </el-button>
        </div>

        <!-- 排队/生成中 -->
        <div v-else-if="['queued', 'running'].includes(currentTask.status)" class="pending-state">
          <el-icon :size="48" class="is-loading" color="var(--accent)"><Loading /></el-icon>
          <p>{{ currentTask.status === 'queued' ? '排队中，请稍候...' : '正在生成视频...' }}</p>
        </div>

        <!-- 失败 -->
        <div v-else-if="currentTask.status === 'failed'" class="error-state">
          <el-icon :size="40" color="var(--danger)"><WarningFilled /></el-icon>
          <p class="error-msg">{{ currentTask.error?.message || '生成失败，请重试' }}</p>
        </div>

        <!-- 超时/取消 -->
        <div v-else-if="['expired', 'cancelled'].includes(currentTask.status)" class="error-state">
          <el-icon :size="40" color="var(--warning)"><WarningFilled /></el-icon>
          <p>{{ statusLabel(currentTask.status) }}</p>
        </div>
      </div>
    </div>

    <!-- 底部输入栏 -->
    <div class="bottom-bar">
      <div class="bottom-bar-inner">
        <!-- 图片预览条 -->
        <div v-if="hasUploadedImages" class="image-preview-bar">
          <template v-if="['first_frame', 'first_last_frame'].includes(form.mode)">
            <div v-if="form.firstFramePreview" class="preview-thumb">
              <img :src="form.firstFramePreview" />
              <div class="thumb-remove" @click="removeImage('firstFrame')"><el-icon :size="12"><Close /></el-icon></div>
              <span class="thumb-label">首帧</span>
            </div>
            <div v-if="form.mode === 'first_last_frame' && form.lastFramePreview" class="preview-thumb">
              <img :src="form.lastFramePreview" />
              <div class="thumb-remove" @click="removeImage('lastFrame')"><el-icon :size="12"><Close /></el-icon></div>
              <span class="thumb-label">尾帧</span>
            </div>
          </template>
          <template v-if="form.mode === 'reference'">
            <div v-for="(img, idx) in form.refImages.filter(i => i.preview)" :key="idx" class="preview-thumb">
              <img :src="img.preview" />
              <div class="thumb-remove" @click="removeRefImage(form.refImages.indexOf(img))"><el-icon :size="12"><Close /></el-icon></div>
              <span class="thumb-label">参考{{ idx + 1 }}</span>
            </div>
          </template>
        </div>

        <!-- 输入框区域（白色圆角容器） -->
        <div class="input-container">
          <!-- 上部：输入行 -->
          <div class="input-row">
            <!-- 左侧：上传按钮 -->
            <div class="input-left">
              <div class="add-btn" @click="triggerUpload('firstFrame')" title="上传图片">
                <el-icon :size="22"><Plus /></el-icon>
              </div>
            </div>
            <!-- 中间：文本输入 -->
            <div class="input-center">
              <el-input
                v-model="form.prompt"
                type="textarea"
                :autosize="{ minRows: 2, maxRows: 6 }"
                placeholder="描述你想生成的视频内容，支持中英文..."
                resize="none"
                @keydown.enter.exact.prevent="handleGenerate"
              />
            </div>
            <!-- 右侧：发送按钮 -->
            <div class="input-right">
              <button
                class="send-btn"
                :class="{ disabled: !canGenerate || generating }"
                :disabled="!canGenerate || generating"
                @click="handleGenerate"
              >
                <el-icon v-if="generating" :size="20" class="is-loading"><Loading /></el-icon>
                <el-icon v-else :size="20"><TopRight /></el-icon>
              </button>
            </div>
          </div>
          <!-- 底部标签设置行（含在输入框内） -->
          <div class="tag-row">
          <!-- 模式标签 -->
          <el-popover placement="top" :width="180" trigger="click">
            <template #reference>
              <span class="tag-pill active">
                <el-icon :size="14"><VideoCamera /></el-icon>
                {{ modeLabel }}
              </span>
            </template>
            <div class="tag-options">
              <div v-for="m in modes" :key="m.value" :class="['tag-option', { selected: form.mode === m.value }]" @click="form.mode = m.value; onModeChange(m.value)">
                {{ m.label }}
              </div>
            </div>
          </el-popover>

          <!-- 模型标签 -->
          <el-popover placement="top" :width="300" trigger="click">
            <template #reference>
              <span class="tag-pill">
                {{ modelShortName }}
              </span>
            </template>
            <div class="model-selector">
              <div class="model-selector-title">选择模型</div>
              <div
                v-for="m in modelList"
                :key="m.value"
                :class="['model-card', { selected: form.model === m.value }]"
                @click="form.model = m.value"
              >
                <div class="model-card-icon">
                  <el-icon :size="18"><VideoCamera /></el-icon>
                </div>
                <div class="model-card-info">
                  <div class="model-card-name">
                    {{ m.name }}
                    <span v-if="m.isNew" class="model-new-tag">NEW</span>
                  </div>
                  <div class="model-card-desc">{{ m.desc }}</div>
                </div>
                <el-icon v-if="form.model === m.value" class="model-check" :size="16"><Check /></el-icon>
              </div>
            </div>
          </el-popover>

          <!-- 比例与清晰度 -->
          <el-popover placement="top" :width="280" trigger="click">
            <template #reference>
              <span class="tag-pill">{{ form.ratio === 'adaptive' ? '自适应' : form.ratio }} · {{ form.resolution }}</span>
            </template>
            <div class="ratio-res-panel">
              <div class="panel-section">
                <div class="panel-section-title">画面比例</div>
                <div class="panel-grid">
                  <div :class="['panel-grid-item', { selected: form.ratio === 'adaptive' }]" @click="form.ratio = 'adaptive'">
                    <div class="ratio-icon adaptive"></div>
                    <span>自适应</span>
                  </div>
                  <div :class="['panel-grid-item', { selected: form.ratio === '16:9' }]" @click="form.ratio = '16:9'">
                    <div class="ratio-icon r16-9"></div>
                    <span>16:9</span>
                  </div>
                  <div :class="['panel-grid-item', { selected: form.ratio === '9:16' }]" @click="form.ratio = '9:16'">
                    <div class="ratio-icon r9-16"></div>
                    <span>9:16</span>
                  </div>
                  <div :class="['panel-grid-item', { selected: form.ratio === '4:3' }]" @click="form.ratio = '4:3'">
                    <div class="ratio-icon r4-3"></div>
                    <span>4:3</span>
                  </div>
                  <div :class="['panel-grid-item', { selected: form.ratio === '3:4' }]" @click="form.ratio = '3:4'">
                    <div class="ratio-icon r3-4"></div>
                    <span>3:4</span>
                  </div>
                  <div :class="['panel-grid-item', { selected: form.ratio === '1:1' }]" @click="form.ratio = '1:1'">
                    <div class="ratio-icon r1-1"></div>
                    <span>1:1</span>
                  </div>
                  <div :class="['panel-grid-item', { selected: form.ratio === '21:9' }]" @click="form.ratio = '21:9'">
                    <div class="ratio-icon r21-9"></div>
                    <span>21:9</span>
                  </div>
                </div>
              </div>
              <div class="panel-divider"></div>
              <div class="panel-section">
                <div class="panel-section-title">清晰度</div>
                <div class="panel-grid">
                  <div :class="['panel-grid-item', { selected: form.resolution === '480p' }]" @click="form.resolution = '480p'">480p</div>
                  <div :class="['panel-grid-item', { selected: form.resolution === '720p' }]" @click="form.resolution = '720p'">720p</div>
                  <div v-if="!isLiteModel" :class="['panel-grid-item', { selected: form.resolution === '1080p' }]" @click="form.resolution = '1080p'">1080p</div>
                </div>
              </div>
            </div>
          </el-popover>

          <!-- 时长标签 -->
          <el-popover placement="top" :width="100" trigger="click">
            <template #reference>
              <span class="tag-pill">{{ form.duration }}s</span>
            </template>
            <div class="tag-options">
              <div v-for="d in durationOptions" :key="d" :class="['tag-option', { selected: form.duration === d }]" @click="form.duration = d">
                {{ d }}s
              </div>
            </div>
          </el-popover>

          <!-- 更多设置 -->
          <el-popover placement="top" :width="300" trigger="click">
            <template #reference>
              <span class="tag-pill more">
                <el-icon :size="14"><Setting /></el-icon>
                更多
              </span>
            </template>
            <div class="more-settings">
              <div class="setting-item">
                <span>种子 Seed</span>
                <el-input-number v-model="form.seed" :min="-1" :max="4294967295" size="small" style="width: 140px" controls-position="right" />
              </div>
              <div class="setting-item">
                <span>生成音频</span>
                <el-switch v-model="form.generateAudio" size="small" />
              </div>
              <div class="setting-item">
                <span>固定镜头</span>
                <el-switch v-model="form.cameraFixed" size="small" />
              </div>
              <div class="setting-item">
                <span>添加水印</span>
                <el-switch v-model="form.watermark" size="small" />
              </div>
            </div>
          </el-popover>
        </div>
        </div>
      </div>
    </div>

    <!-- 隐藏的文件输入 -->
    <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="handleFileChange" />

    <!-- 参考图上传弹窗 -->
    <el-dialog v-model="showRefDialog" title="添加参考图片" width="500px" :append-to-body="true">
      <div class="ref-upload-grid">
        <div v-for="(img, idx) in form.refImages" :key="idx" class="ref-upload-item">
          <div class="ref-upload-box" @click="triggerUpload('ref', idx)">
            <img v-if="img.preview" :src="img.preview" class="ref-preview-img" />
            <template v-else>
              <el-icon :size="28" color="var(--text-muted)"><Plus /></el-icon>
              <span>上传图片</span>
            </template>
          </div>
          <div class="ref-remove" @click="removeRefImage(idx)" v-if="img.preview">
            <el-icon><Close /></el-icon>
          </div>
        </div>
        <div v-if="form.refImages.length < maxRefImages" class="ref-upload-item">
          <div class="ref-upload-box add" @click="addRefSlot">
            <el-icon :size="28" color="var(--text-muted)"><Plus /></el-icon>
            <span>添加</span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showRefDialog = false">完成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Plus, Close, VideoCamera, Download, WarningFilled,
  Picture, Setting, Loading, TopRight, Check
} from '@element-plus/icons-vue'
import { createTask, getTask } from '../api'

const props = defineProps({
  apiKey: { type: String, default: '' }
})

const form = reactive({
  mode: 'text2video',
  model: 'doubao-seedance-2-0-260128',
  prompt: '',
  resolution: '720p',
  ratio: 'adaptive',
  duration: 5,
  seed: -1,
  generateAudio: true,
  cameraFixed: false,
  watermark: false,
  firstFrameBase64: '',
  firstFramePreview: '',
  lastFrameBase64: '',
  lastFramePreview: '',
  refImages: [{ base64: '', preview: '' }]
})

const generating = ref(false)
const currentTask = ref(null)
const fileInput = ref(null)
const showRefDialog = ref(false)
let uploadTarget = { type: '', index: -1 }
let pollTimer = null

const modes = [
  { value: 'text2video', label: '文生视频' },
  { value: 'first_frame', label: '图生视频-首帧' },
  { value: 'first_last_frame', label: '图生视频-首尾帧' },
  { value: 'reference', label: '参考图生视频' }
]

const modelList = [
  { value: 'doubao-seedance-2-0-fast-260128', name: 'Seedance 2.0 Fast', desc: '高性价比，快速生成高质量视频', isNew: true },
  { value: 'doubao-seedance-2-0-260128', name: 'Seedance 2.0 限免版', desc: '旗舰模型，画质与动作表现优异', isNew: false },
  { value: 'doubao-seedance-1-5-pro-251215', name: 'Seedance 1.5 Pro', desc: '均衡之选，兼顾质量与速度', isNew: false },
  { value: 'doubao-seedance-1-0-pro-250428', name: 'Seedance 1.0', desc: '稳定可靠的经典模型', isNew: false },
  { value: 'doubao-seedance-1-0-pro-fast-250428', name: 'Seedance 1.0 Fast', desc: '快速出片，适合预览', isNew: false },
  { value: 'doubao-seedance-1-0-lite-t2v-250428', name: 'Seedance 1.0 Lite (文生)', desc: '轻量文生视频模型', isNew: false },
  { value: 'doubao-seedance-1-0-lite-i2v-250428', name: 'Seedance 1.0 Lite (图生)', desc: '轻量图生视频模型', isNew: false }
]

const modeLabel = computed(() => {
  const m = modes.find(m => m.value === form.mode)
  return m ? m.label : '文生视频'
})

const modelShortName = computed(() => {
  if (form.model.includes('2-0-fast')) return 'Seedance 2.0 Fast'
  if (form.model.includes('2-0')) return 'Seedance 2.0'
  if (form.model.includes('1-5')) return 'Seedance 1.5 Pro'
  if (form.model.includes('1-0-pro-fast')) return 'Seedance 1.0 Pro Fast'
  if (form.model.includes('1-0-pro')) return 'Seedance 1.0 Pro'
  if (form.model.includes('lite-t2v')) return 'Lite (文生)'
  if (form.model.includes('lite-i2v')) return 'Lite (图生)'
  return form.model
})

const isLiteModel = computed(() => form.model.includes('lite'))
const maxRefImages = computed(() => form.model.includes('2-0') ? 9 : 4)

const durationMin = computed(() => {
  if (form.model.includes('1-0') && !form.model.includes('lite')) return 2
  if (form.model.includes('lite')) return 2
  return 4
})

const durationMax = computed(() => {
  if (form.model.includes('2-0')) return 15
  return 12
})

const durationOptions = computed(() => {
  const arr = []
  for (let i = durationMin.value; i <= durationMax.value; i++) arr.push(i)
  return arr
})

const hasUploadedImages = computed(() => {
  if (['first_frame', 'first_last_frame'].includes(form.mode)) {
    return !!form.firstFramePreview || !!form.lastFramePreview
  }
  if (form.mode === 'reference') {
    return form.refImages.some(i => i.preview)
  }
  return false
})

const canGenerate = computed(() => {
  if (!props.apiKey) return false
  if (form.mode === 'text2video') return form.prompt.trim().length > 0
  if (form.mode === 'first_frame') return !!form.firstFrameBase64
  if (form.mode === 'first_last_frame') return !!form.firstFrameBase64 && !!form.lastFrameBase64
  if (form.mode === 'reference') return form.refImages.some(img => img.base64)
  return false
})

watch(() => form.model, () => {
  if (form.duration < durationMin.value) form.duration = durationMin.value
  if (form.duration > durationMax.value) form.duration = durationMax.value
})

function onModeChange(mode) {
  if (mode === 'reference') {
    showRefDialog.value = true
  }
}

function triggerUpload(type, index = -1) {
  uploadTarget = { type, index }
  fileInput.value?.click()
}

function handleFileChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 30 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过30MB')
    return
  }
  const reader = new FileReader()
  reader.onload = (ev) => {
    const dataUrl = ev.target.result
    if (uploadTarget.type === 'firstFrame') {
      form.firstFrameBase64 = dataUrl
      form.firstFramePreview = dataUrl
    } else if (uploadTarget.type === 'lastFrame') {
      form.lastFrameBase64 = dataUrl
      form.lastFramePreview = dataUrl
    } else if (uploadTarget.type === 'ref') {
      if (uploadTarget.index < form.refImages.length) {
        form.refImages[uploadTarget.index].base64 = dataUrl
        form.refImages[uploadTarget.index].preview = dataUrl
      }
    }
  }
  reader.readAsDataURL(file)
  e.target.value = ''
}

function removeImage(field) {
  if (field === 'firstFrame') {
    form.firstFrameBase64 = ''
    form.firstFramePreview = ''
  } else {
    form.lastFrameBase64 = ''
    form.lastFramePreview = ''
  }
}

function removeRefImage(idx) {
  form.refImages.splice(idx, 1)
  if (form.refImages.length === 0) {
    form.refImages.push({ base64: '', preview: '' })
  }
}

function addRefSlot() {
  if (form.refImages.length < maxRefImages.value) {
    form.refImages.push({ base64: '', preview: '' })
  }
}

function buildContent() {
  const content = []
  if (form.prompt.trim()) {
    content.push({ type: 'text', text: form.prompt.trim() })
  }
  if (form.mode === 'first_frame' && form.firstFrameBase64) {
    content.push({ type: 'image_url', image_url: { url: form.firstFrameBase64 }, role: 'first_frame' })
  }
  if (form.mode === 'first_last_frame') {
    if (form.firstFrameBase64) {
      content.push({ type: 'image_url', image_url: { url: form.firstFrameBase64 }, role: 'first_frame' })
    }
    if (form.lastFrameBase64) {
      content.push({ type: 'image_url', image_url: { url: form.lastFrameBase64 }, role: 'last_frame' })
    }
  }
  if (form.mode === 'reference') {
    form.refImages.forEach(img => {
      if (img.base64) {
        content.push({ type: 'image_url', image_url: { url: img.base64 }, role: 'reference_image' })
      }
    })
  }
  return content
}

async function handleGenerate() {
  if (!props.apiKey) {
    ElMessage.error('请先设置 API Key')
    return
  }
  if (!canGenerate.value) return

  generating.value = true
  currentTask.value = null

  try {
    const params = {
      model: form.model,
      content: buildContent(),
      resolution: form.resolution,
      ratio: form.ratio,
      duration: form.duration,
      seed: form.seed,
      generate_audio: form.generateAudio,
      camera_fixed: form.cameraFixed,
      watermark: form.watermark
    }

    const result = await createTask(props.apiKey, params)
    currentTask.value = { id: result.id, status: 'queued' }
    ElMessage.success('任务创建成功')
    startPolling(result.id)
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message || '创建任务失败'
    ElMessage.error(msg)
  } finally {
    generating.value = false
  }
}

function startPolling(taskId) {
  stopPolling()
  pollTimer = setInterval(async () => {
    try {
      const task = await getTask(props.apiKey, taskId)
      currentTask.value = task
      if (['succeeded', 'failed', 'expired', 'cancelled'].includes(task.status)) {
        stopPolling()
        if (task.status === 'succeeded') {
          ElMessage.success('视频生成成功！')
        } else {
          ElMessage.error(`任务${statusLabel(task.status)}`)
        }
      }
    } catch (err) {
      console.error('轮询失败:', err)
    }
  }, 5000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
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

function downloadVideo(url) {
  const a = document.createElement('a')
  a.href = url
  a.download = `jimeng_${Date.now()}.mp4`
  a.target = '_blank'
  a.click()
}

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped>
.generation-form {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* 中间主区域 */
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
  padding: 40px 24px;
}

.empty-state {
  text-align: center;
  color: var(--text-muted);
}

.empty-icon {
  font-size: 56px;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.empty-subtitle {
  font-size: 14px;
}

.loading-state {
  text-align: center;
  color: var(--text-secondary);
}

.loading-text {
  margin-top: 12px;
  font-size: 14px;
}

/* 任务结果区 */
.task-result-area {
  width: 100%;
  max-width: 720px;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.task-id-text {
  font-size: 12px;
  color: var(--text-muted);
  font-family: monospace;
}

.video-result {
  text-align: center;
}

.result-video {
  width: 100%;
  max-height: 450px;
  border-radius: var(--radius);
  background: #000;
}

.download-btn {
  margin-top: 16px;
}

.pending-state {
  text-align: center;
  padding: 60px 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.pending-state p {
  margin-top: 16px;
}

.error-state {
  text-align: center;
  padding: 60px 0;
  color: var(--text-secondary);
}

.error-state p {
  margin-top: 12px;
  font-size: 14px;
}

.error-msg {
  color: var(--danger) !important;
}

/* 底部输入栏 */
.bottom-bar {
  background: var(--bg-primary);
  padding: 16px 0 24px;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
}

.bottom-bar-inner {
  width: 100%;
  max-width: 800px;
  padding: 0 32px;
}

.image-preview-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.preview-thumb {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.preview-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  cursor: pointer;
}

.thumb-label {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 10px;
  color: #fff;
  background: rgba(0, 0, 0, 0.4);
  padding: 1px 0;
}

/* 输入框容器 */
.input-container {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 14px 16px 10px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  transition: border-color 0.2s;
}

.input-container:focus-within {
  border-color: var(--accent);
}

.input-row {
  display: flex;
  align-items: flex-end;
  gap: 4px;
}

.input-left {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 0 4px;
}

.add-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.add-btn:hover {
  background: var(--bg-input);
  color: var(--accent);
}

.input-center {
  flex: 1;
  min-width: 0;
}

.input-center :deep(.el-textarea__inner) {
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
  padding: 10px 8px;
  font-size: 15px;
  line-height: 1.6;
}

.input-right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding-left: 4px;
}

.send-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent);
  color: #fff;
  transition: all 0.2s;
}

.send-btn:hover {
  opacity: 0.85;
  transform: scale(1.05);
}

.send-btn.disabled {
  background: var(--bg-input);
  color: var(--text-muted);
  cursor: not-allowed;
}

.send-btn.disabled:hover {
  opacity: 1;
  transform: none;
}

/* 标签设置行 */
.tag-row {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
  align-items: center;
  flex-wrap: wrap;
}

.tag-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 14px;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-input);
  border: 1px solid transparent;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;
  white-space: nowrap;
}

.tag-pill:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.tag-pill.active {
  color: var(--accent);
  border-color: rgba(124, 92, 252, 0.3);
  background: rgba(124, 92, 252, 0.05);
}

/* 标签下拉选项 */
.tag-options {
  padding: 4px 0;
}

.tag-group-title {
  padding: 6px 12px 4px;
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 600;
}

.tag-option {
  padding: 7px 12px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 6px;
  margin: 1px 4px;
  transition: all 0.15s;
}

.tag-option:hover {
  background: var(--bg-input);
  color: var(--text-primary);
}

.tag-option.selected {
  color: var(--accent);
  font-weight: 500;
  background: rgba(124, 92, 252, 0.06);
}

/* 模型选择器卡片 */
.model-selector {
  padding: 0;
}

.model-selector-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  padding: 8px 4px 10px;
}

.model-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid transparent;
}

.model-card:hover {
  background: var(--bg-input);
}

.model-card.selected {
  background: rgba(124, 92, 252, 0.04);
  border-color: rgba(124, 92, 252, 0.2);
}

.model-card-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--bg-input);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  flex-shrink: 0;
}

.model-card.selected .model-card-icon {
  background: rgba(124, 92, 252, 0.1);
  color: var(--accent);
}

.model-card-info {
  flex: 1;
  min-width: 0;
}

.model-card-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.model-card.selected .model-card-name {
  color: var(--accent);
}

.model-new-tag {
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: #4a90ff;
  padding: 1px 6px;
  border-radius: 4px;
  line-height: 1.4;
}

.model-card-desc {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.model-check {
  color: var(--accent);
  flex-shrink: 0;
}

/* 比例与清晰度面板 */
.ratio-res-panel {
  padding: 4px 0;
}

.panel-section {
  padding: 0 4px;
}

.panel-section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 8px;
  padding: 0 4px;
}

.panel-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.panel-grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 56px;
  padding: 8px 6px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: #fff;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
}

.panel-grid-item:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.panel-grid-item.selected {
  border-color: var(--accent);
  background: rgba(124, 92, 252, 0.06);
  color: var(--accent);
  font-weight: 500;
}

.panel-divider {
  height: 1px;
  background: var(--border-color);
  margin: 12px 4px;
}

.ratio-icon {
  border: 1.5px solid currentColor;
  border-radius: 3px;
  background: transparent;
}

.ratio-icon.adaptive {
  width: 28px;
  height: 20px;
  border-style: dashed;
}

.ratio-icon.r16-9 {
  width: 28px;
  height: 16px;
}

.ratio-icon.r9-16 {
  width: 16px;
  height: 28px;
}

.ratio-icon.r4-3 {
  width: 24px;
  height: 18px;
}

.ratio-icon.r3-4 {
  width: 18px;
  height: 24px;
}

.ratio-icon.r1-1 {
  width: 22px;
  height: 22px;
}

.ratio-icon.r21-9 {
  width: 30px;
  height: 13px;
}

/* 更多设置弹窗 */
.more-settings {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-secondary);
}

/* 参考图弹窗 */
.ref-upload-grid {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.ref-upload-item {
  position: relative;
}

.ref-upload-box {
  width: 100px;
  height: 100px;
  border: 2px dashed var(--border-color);
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-muted);
  overflow: hidden;
  transition: border-color 0.2s;
}

.ref-upload-box:hover {
  border-color: var(--accent);
}

.ref-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ref-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  cursor: pointer;
  font-size: 12px;
}
</style>
