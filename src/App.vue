<template>
  <div class="app-layout">
    <Sidebar
      :active-menu="activeMenu"
      :api-key="apiKey"
      @select="handleMenuSelect"
      @update:api-key="val => apiKey = val"
    />
    <div class="app-main">
      <div class="app-content">
        <GenerationForm v-if="activeMenu === 'generate'" :api-key="apiKey" />
        <TaskHistory v-else-if="activeMenu === 'history'" :api-key="apiKey" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import Sidebar from './components/Sidebar.vue'
import GenerationForm from './components/GenerationForm.vue'
import TaskHistory from './components/TaskHistory.vue'

const apiKey = ref(localStorage.getItem('jimeng_api_key') || '')
const activeMenu = ref('generate')

watch(apiKey, (val) => {
  localStorage.setItem('jimeng_api_key', val)
})

function handleMenuSelect(key) {
  activeMenu.value = key
}
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-primary);
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.app-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
