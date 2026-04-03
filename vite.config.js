import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/jimeng-Seedance2-vue-html/',
  server: {
    port: 3000
  }
})
