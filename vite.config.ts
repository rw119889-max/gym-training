import { defineConfig, type Plugin } from 'vite'
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

// dev / serve 模式同样要替换 __BUILD_ID__：public/sw.js 会被原样直出，占位符留着不换的话
// 缓存名恒为 gym-training-__BUILD_ID__，activate 的"清旧缓存"永不触发，
// cache-first 的静态资源就会长期驻留，线上表现是版本号卡在首次访问时的值。
// 每个 dev 进程启动取一次时间戳：同一进程内 sw.js 字节稳定（不触发无谓的 install），
// 进程重启（含云端重新发布）后缓存名变化，旧缓存自动整批清除。
function stampServiceWorkerDev(): Plugin {
  const buildId = Date.now().toString(36)
  return {
    name: 'stamp-service-worker-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url || '').split('?')[0]
        if (pathname !== '/sw.js') return next()
        const file = resolve(process.cwd(), 'public/sw.js')
        if (!existsSync(file)) return next()
        const body = readFileSync(file, 'utf8').replace('__BUILD_ID__', buildId)
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
        // 浏览器对 sw.js 有独立的更新检查，禁掉 HTTP 缓存避免中间层干扰
        res.setHeader('Cache-Control', 'no-store')
        res.end(body)
      })
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), stampServiceWorker(), stampServiceWorkerDev()],
  // 云端发布时服务由平台注入 PORT，Vite dev 默认只监听 5173 会启动超时
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 5173,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 4173,
    allowedHosts: true,
  },
})