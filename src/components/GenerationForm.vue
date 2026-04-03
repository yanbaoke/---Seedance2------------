<template>
  <div class="generation-form">
    <!-- 聊天内容区 -->
    <div class="main-area" ref="chatArea">
      <!-- 无消息时：空状态 -->
      <div v-if="messages.length === 0 && !generating" class="empty-state">
        <div class="empty-icon">🎬</div>
        <div class="empty-title">使用官方api接口，开启你的新创作</div>
        <div class="empty-title">为漫剧公司定制版本，公司子账号分配，公司资产管理，不受人员离职影响。接口速度更快。</div>
        <div class="empty-title">多账号，团队管理商业化版本，工作流定制请扫描下方微信二维码联系</div>
        <img src="/3.png" alt="微信二维码" style="width:160px;margin-top:8px;border-radius:8px" />
      </div>

      <!-- 消息列表 -->
      <div class="chat-messages" v-if="messages.length > 0">
        <div
          v-for="msg in messages"
          :key="msg.id"
          :class="['chat-msg', msg.role]"
        >
          <!-- 头像 -->
          <div class="msg-avatar">
            <div v-if="msg.role === 'user'" class="avatar avatar-user">你</div>
            <div v-else class="avatar avatar-bot">AI</div>
          </div>
          <!-- 消息体 -->
          <div class="msg-body">
            <!-- 用户消息 -->
            <template v-if="msg.role === 'user'">
              <div class="msg-text">{{ msg.content }}</div>
              <div v-if="msg.images && msg.images.length" class="msg-images">
                <img v-for="(img, i) in msg.images" :key="i" :src="img" class="msg-img-thumb" />
              </div>
              <div class="msg-meta">{{ msg.modelName }} · {{ msg.ratio }} · {{ msg.duration }}s · {{ msg.resolution }}</div>
            </template>
            <!-- 助手回复 -->
            <template v-else>
              <!-- 任务创建中 -->
              <div v-if="msg.loading" class="reply-loading">
                <el-icon :size="18" class="is-loading" color="var(--accent)"><Loading /></el-icon>
                <span>任务创建中...</span>
              </div>
              <!-- 任务状态 -->
              <template v-if="msg.task">
                <div class="reply-status">
                  <el-tag :type="statusTagType(msg.task.status)" size="small" effect="plain">
                    {{ statusLabel(msg.task.status) }}
                  </el-tag>
                  <span class="task-id-text">任务ID: {{ msg.task.id }}</span>
                </div>
                <!-- 视频 -->
                <div v-if="msg.task.status === 'succeeded' && msg.task.content?.video_url" class="reply-video">
                  <video :src="msg.task.content.video_url" controls class="result-video" />
                  <el-button type="primary" size="small" class="download-btn" @click="downloadVideo(msg.task.content.video_url)">
                    <el-icon><Download /></el-icon> 下载视频
                  </el-button>
                </div>
                <!-- 排队/生成中 -->
                <div v-else-if="['queued', 'running'].includes(msg.task.status)" class="reply-pending">
                  <el-icon :size="22" class="is-loading" color="var(--accent)"><Loading /></el-icon>
                  <span>{{ msg.task.status === 'queued' ? '排队中，请稍候...' : '正在生成视频...' }}</span>
                </div>
                <!-- 失败 -->
                <div v-else-if="msg.task.status === 'failed'" class="reply-error">
                  <el-icon :size="18" color="var(--danger)"><WarningFilled /></el-icon>
                  <span>{{ msg.task.error?.message || '生成失败，请重试' }}</span>
                </div>
                <!-- 超时/取消 -->
                <div v-else-if="['expired', 'cancelled'].includes(msg.task.status)" class="reply-error">
                  <el-icon :size="18" color="var(--warning)"><WarningFilled /></el-icon>
                  <span>{{ statusLabel(msg.task.status) }}</span>
                </div>
              </template>
              <!-- 错误 -->
              <div v-if="msg.error" class="reply-error">
                <el-icon :size="18" color="var(--danger)"><WarningFilled /></el-icon>
                <span>{{ msg.error }}</span>
              </div>
            </template>
          </div>
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
import { ref, reactive, computed, watch, onUnmounted, nextTick, onMounted } from 'vue'
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

const STORAGE_KEY = 'jimeng_chat_messages'
const TASK_CTX_KEY = 'jimeng_task_context'

const generating = ref(false)
const messages = ref(loadMessages())
const chatArea = ref(null)
const fileInput = ref(null)
const showRefDialog = ref(false)
let uploadTarget = { type: '', index: -1 }
let pollTimer = null
let msgIdCounter = messages.value.length > 0
  ? Math.max(...messages.value.map(m => m.id))
  : 0

// 从 localStorage 恢复消息
function loadMessages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (e) { /* ignore */ }
  return []
}

// 保存消息到 localStorage
function saveMessages() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.value))
  } catch (e) { /* ignore */ }
}

// 监听消息变化自动保存
watch(messages, saveMessages, { deep: true })

// 保存/读取任务上下文（提示词、图片、参数）
function saveTaskContext(taskId, ctx) {
  try {
    const all = JSON.parse(localStorage.getItem(TASK_CTX_KEY) || '{}')
    all[taskId] = ctx
    localStorage.setItem(TASK_CTX_KEY, JSON.stringify(all))
  } catch (e) { /* ignore */ }
}

const modes = [
  { value: 'text2video', label: '文生视频' },
  { value: 'first_frame', label: '图生视频-首帧' },
  { value: 'first_last_frame', label: '图生视频-首尾帧' },
  { value: 'reference', label: '参考图生视频' }
]

const modelList = [
  { value: 'doubao-seedance-2-0-fast-260128', name: 'Seedance 2.0 Fast', desc: '高性价比，音视文图均可参考(暂不支持真人人脸)', isNew: true },
  { value: 'doubao-seedance-2-0-260128', name: 'Seedance 2.0', desc: '全能王者，音视文图均可参考(暂不支持真人人脸)', isNew: false },
  { value: 'doubao-seedance-1-5-pro-251215', name: 'Seedance 1.5 Pro', desc: '音画同出，全新体验', isNew: false },
  { value: 'doubao-seedance-1-0-pro-250428', name: 'Seedance 1.0', desc: '效果最佳，画质超清', isNew: false },
  { value: 'doubao-seedance-1-0-pro-fast-250428', name: 'Seedance 1.0 Fast', desc: 'Pro级表现，加量不加价', isNew: false }
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

function scrollToBottom() {
  nextTick(() => {
    if (chatArea.value) {
      chatArea.value.scrollTop = chatArea.value.scrollHeight
    }
  })
}

async function handleGenerate() {
  if (!props.apiKey) {
    ElMessage.error('请先设置 API Key')
    return
  }
  if (!canGenerate.value) return

  generating.value = true

  // 收集用户消息中的图片
  const userImages = []
  if (['first_frame', 'first_last_frame'].includes(form.mode) && form.firstFramePreview) {
    userImages.push(form.firstFramePreview)
  }
  if (form.mode === 'first_last_frame' && form.lastFramePreview) {
    userImages.push(form.lastFramePreview)
  }
  if (form.mode === 'reference') {
    form.refImages.forEach(img => { if (img.preview) userImages.push(img.preview) })
  }

  // 用户消息
  const userMsg = {
    id: ++msgIdCounter,
    role: 'user',
    content: form.prompt || '(无文字描述)',
    images: userImages,
    modelName: modelShortName.value,
    ratio: form.ratio === 'adaptive' ? '自适应' : form.ratio,
    duration: form.duration,
    resolution: form.resolution
  }
  messages.value.push(userMsg)

  // 助手回复占位
  const botMsg = {
    id: ++msgIdCounter,
    role: 'assistant',
    loading: true,
    task: null,
    error: ''
  }
  messages.value.push(botMsg)
  scrollToBottom()

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
    botMsg.loading = false
    botMsg.task = { id: result.id, status: 'queued' }
    // 保存任务上下文，供历史页面查询
    saveTaskContext(result.id, {
      prompt: form.prompt || '',
      images: userImages,
      mode: form.mode,
      model: form.model,
      modelName: modelShortName.value,
      ratio: form.ratio === 'adaptive' ? '自适应' : form.ratio,
      duration: form.duration,
      resolution: form.resolution,
      seed: form.seed,
      generateAudio: form.generateAudio,
      cameraFixed: form.cameraFixed,
      watermark: form.watermark,
      createdAt: Date.now()
    })
    scrollToBottom()
    startPolling(result.id, botMsg.id)
  } catch (err) {
    botMsg.loading = false
    botMsg.error = err.response?.data?.error?.message || err.message || '创建任务失败'
    scrollToBottom()
  } finally {
    generating.value = false
  }
}

function startPolling(taskId, botMsgId) {
  stopPolling()
  pollTimer = setInterval(async () => {
    try {
      const task = await getTask(props.apiKey, taskId)
      const botMsg = messages.value.find(m => m.id === botMsgId)
      if (botMsg) botMsg.task = task
      scrollToBottom()
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

onMounted(() => {
  // 恢复未完成任务的轮询
  messages.value.forEach(msg => {
    if (msg.role === 'assistant' && msg.task && ['queued', 'running'].includes(msg.task.status)) {
      startPolling(msg.task.id, msg.id)
    }
  })
  scrollToBottom()
})

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
  justify-content: flex-start;
  overflow-y: auto;
  padding: 24px 24px 12px;
}

.main-area:has(.empty-state) {
  justify-content: center;
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

/* 聊天消息列表 */
.chat-messages {
  width: 100%;
  max-width: 800px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 12px;
}

.chat-msg {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.chat-msg.user {
  flex-direction: row-reverse;
}

.msg-avatar {
  flex-shrink: 0;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
}

.avatar-user {
  background: var(--accent);
  color: #fff;
}

.avatar-bot {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.msg-body {
  max-width: 70%;
  min-width: 0;
}

.chat-msg.user .msg-body {
  align-items: flex-end;
}

/* 用户消息气泡 */
.msg-text {
  background: var(--accent);
  color: #fff;
  padding: 10px 14px;
  border-radius: 16px 16px 4px 16px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
  white-space: pre-wrap;
}

.msg-images {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 6px;
}

.msg-img-thumb {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.msg-meta {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
  text-align: right;
}

/* 助手回复区域 */
.reply-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-input);
  padding: 10px 14px;
  border-radius: 16px 16px 16px 4px;
  font-size: 13px;
  color: var(--text-secondary);
}

.reply-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.reply-status .task-id-text {
  font-size: 11px;
  color: var(--text-muted);
  font-family: monospace;
}

.reply-video {
  background: var(--bg-input);
  padding: 12px;
  border-radius: 16px 16px 16px 4px;
}

.reply-video .result-video {
  width: 100%;
  max-height: 400px;
  border-radius: 8px;
  background: #000;
}

.reply-video .download-btn {
  margin-top: 8px;
}

.reply-pending {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-input);
  padding: 14px 16px;
  border-radius: 16px 16px 16px 4px;
  font-size: 13px;
  color: var(--text-secondary);
}

.reply-error {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-input);
  padding: 10px 14px;
  border-radius: 16px 16px 16px 4px;
  font-size: 13px;
  color: var(--text-secondary);
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
