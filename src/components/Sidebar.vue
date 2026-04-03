<template>
  <div class="sidebar">
    <div class="sidebar-logo">
      <span class="logo-text">即梦</span>
    </div>
    <nav class="sidebar-nav">
      <div
        v-for="item in menus"
        :key="item.key"
        :class="['nav-item', { active: activeMenu === item.key }]"
        @click="$emit('select', item.key)"
        :title="item.label"
      >
        <el-icon :size="20"><component :is="item.icon" /></el-icon>
        <span class="nav-label">{{ item.label }}</span>
      </div>
    </nav>
    <div class="sidebar-bottom">
      <el-popover placement="right-end" :width="320" trigger="click">
        <template #reference>
          <div :class="['nav-item', { active: false }]" title="设置 API Key">
            <el-icon :size="20"><Key /></el-icon>
            <span class="nav-label">{{ apiKey ? 'Key ✓' : '设置' }}</span>
          </div>
        </template>
        <div class="api-key-popover">
          <div class="popover-title">API Key 设置</div>
          <el-input
            :model-value="apiKey"
            @update:model-value="$emit('update:api-key', $event)"
            :type="showApiKey ? 'text' : 'password'"
            placeholder="请输入火山方舟 API Key"
            clearable
          >
            <template #suffix>
              <el-icon class="toggle-vis" @click="showApiKey = !showApiKey">
                <View v-if="!showApiKey" />
                <Hide v-else />
              </el-icon>
            </template>
          </el-input>
          <p class="popover-hint">
            API Key 保存在浏览器本地存储中。
            <a href="https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey" target="_blank">获取 API Key</a>
          </p>
        </div>
      </el-popover>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Key, View, Hide, VideoCamera, Clock } from '@element-plus/icons-vue'

defineProps({
  activeMenu: { type: String, default: 'generate' },
  apiKey: { type: String, default: '' }
})

defineEmits(['select', 'update:api-key'])

const showApiKey = ref(false)

const menus = [
  { key: 'generate', label: '生成', icon: VideoCamera },
  { key: 'history', label: '历史', icon: Clock }
]
</script>

<style scoped>
.sidebar {
  width: 72px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  padding-top: 16px;
}

.sidebar-logo {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.logo-text {
  font-size: 16px;
  font-weight: 700;
  background: var(--accent-gradient);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  padding: 0 8px;
}

.sidebar-bottom {
  margin-top: auto;
  width: 100%;
  padding: 0 8px 16px;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 10px 0;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--text-muted);
  transition: all 0.2s;
  user-select: none;
}

.nav-item:hover {
  background: var(--bg-hover);
  color: var(--text-secondary);
}

.nav-item.active {
  background: rgba(124, 92, 252, 0.1);
  color: var(--accent);
}

.nav-label {
  font-size: 11px;
  font-weight: 500;
}

.api-key-popover {
  padding: 4px 0;
}

.popover-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
  color: var(--text-primary);
}

.popover-hint {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 8px;
  line-height: 1.5;
}

.popover-hint a {
  color: var(--accent);
  text-decoration: none;
}

.toggle-vis {
  cursor: pointer;
}
</style>
