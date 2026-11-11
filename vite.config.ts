import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// 每次构建给 Service Worker 注入唯一缓存名，activate 时旧缓存整批清掉，避免发布后仍见旧页面
function stampServiceWorker() {
  return {
    name: 'stamp-service-worker',
    apply: 'build' as const,
    closeBundle() {
      const path = resolve(process.cwd(), 'dist/sw.js')
      if (!existsSync(path)) return
      const src = readFileSync(path, 'utf8')
      writeFileSync(path, src.replace('__BUILD_ID__', Date.now().toString(36)))
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), stampServiceWorker()],
})