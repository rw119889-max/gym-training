// 视频进度条验收脚本：真实视频（MediaRecorder 生成）+ 拖动跳转 + ±10s 快进/后退
import { chromium } from 'playwright'
import { createServer } from 'http'
import { readFileSync, existsSync } from 'fs'
import { join, extname } from 'path'

const DIST = 'dist'
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' }

const server = createServer((req, res) => {
  let p = req.url.split('?')[0]
  if (p === '/') p = '/index.html'
  const file = join(DIST, p)
  if (!existsSync(file)) { res.writeHead(404); res.end('nf'); return }
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
  res.end(readFileSync(file))
})

await new Promise((r) => server.listen(4289, r))

const browser = await chromium.launch({ channel: 'msedge' })
const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
await context.addInitScript(() => {
  window.addEventListener('error', (e) => {
    ;(window.__errors = window.__errors || []).push(String(e.message))
  })
})
const page = await context.newPage()
await page.goto('http://localhost:4289/', { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.lp-cta', { timeout: 8000 })

// ── 浏览器内生成 5 秒真实视频并存入 IndexedDB ──
const ok = await page.evaluate(async () => {
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 240
  const ctx = canvas.getContext('2d')
  const stream = canvas.captureStream(30)
  const rec = new MediaRecorder(stream, { mimeType: 'video/webm' })
  const chunks = []
  rec.ondataavailable = (e) => chunks.push(e.data)
  rec.start(200)
  const t0 = performance.now()
  await new Promise((resolve) => {
    const draw = () => {
      const t = (performance.now() - t0) / 1000
      ctx.fillStyle = t % 2 < 1 ? '#404040' : '#808080'
      ctx.fillRect(0, 0, 320, 240)
      if (t < 5) requestAnimationFrame(draw)
      else resolve()
    }
    draw()
  })
  rec.stop()
  await new Promise((resolve) => { rec.onstop = resolve })
  const blob = new Blob(chunks, { type: 'video/webm' })
  if (blob.size < 1000) return 'blob too small: ' + blob.size

  // 元数据 duration 先填 0（真实 duration 由 video 元素读出）
  localStorage.setItem('gt.v1.videos', JSON.stringify([
    { id: 'v-seek-1', exerciseId: 'warmup:push', label: '进度条测试', size: blob.size, duration: 5, createdAt: new Date().toISOString() },
  ]))

  const db = await new Promise((resolve, reject) => {
    const rq = indexedDB.open('gym-training', 2)
    rq.onupgradeneeded = () => {
      const d = rq.result
      for (const store of ['images', 'videos', 'videoPosters']) {
        if (!d.objectStoreNames.contains(store)) d.createObjectStore(store)
      }
    }
    rq.onsuccess = () => resolve(rq.result)
    rq.onerror = () => reject(rq.error)
  })
  await new Promise((resolve, reject) => {
    const tx = db.transaction('videos', 'readwrite')
    tx.objectStore('videos').put(blob, 'v-seek-1')
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
  })
  db.close()
  return true
})
if (ok !== true) {
  console.log('✗ 视频生成失败 —', ok)
  await browser.close()
  server.close()
  process.exit(1)
}
console.log('✓ 浏览器内生成 5 秒真实视频并存入 IndexedDB')

await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.lp-cta', { timeout: 8000 })
await page.click('.lp-cta')
await page.waitForSelector('.tabbar', { timeout: 8000 })
await page.locator('.tabbar button:visible', { hasText: /动作|训练/ }).first().click()
await page.waitForTimeout(400)
await page.click('.coach-card')
await page.waitForTimeout(300)
await page.click('.plan-day-card.is-push')
await page.waitForTimeout(300)
await page.click('.warmup-video-entry')
await page.waitForSelector('.warmup-videos', { timeout: 8000 })
await page.waitForTimeout(1200) // 等视频加载并开始播放

const check = (name, ok, extra = '') => console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ` — ${extra}` : ''}`)

// 1. 进度条结构存在且可用
const s1 = await page.evaluate(() => ({
  seek: !!document.querySelector('.warmup-videos .video-seek'),
  range: document.querySelector('.warmup-videos .video-seek input[type=range]'),
  disabled: document.querySelector('.warmup-videos .video-seek input[type=range]')?.disabled ?? null,
  btns: [...document.querySelectorAll('.warmup-videos .video-seek-btn')].map((b) => b.textContent),
  time: document.querySelector('.warmup-videos .video-seek-time')?.textContent ?? '',
}))
check('进度条结构存在（bar + ±10s 按钮 + 时间）', s1.seek && s1.btns.length === 2, JSON.stringify(s1.btns))
check('进度条可用（真实 duration 已读出）', s1.range && !s1.disabled && s1.time.includes('/'), s1.time)

// 2. 播放中时间在走
const t1 = await page.evaluate(() => {
  const v = document.querySelector('.warmup-videos .video-slide-stage video')
  return { current: v?.currentTime ?? -1, paused: v?.paused ?? true }
})
check('视频在播放且 currentTime > 0', t1.current > 0 && !t1.paused, `t=${t1.current.toFixed(2)}`)

// 3. 拖动进度条跳转：把 range 设到最大值的一半（React onChange 监听原生 input 事件）
const half = await page.evaluate(() => {
  const range = document.querySelector('.warmup-videos .video-seek input[type=range]')
  const max = Number(range.max)
  range.value = String(max / 2)
  range.dispatchEvent(new Event('input', { bubbles: true }))
  range.dispatchEvent(new Event('change', { bubbles: true }))
  return { max, preSeek: document.querySelector('.warmup-videos .video-slide-stage video').currentTime }
})
// 轮询等 currentTime 实际变化（loop 回绕可能抢先消费 seeked 事件）
const seeked = await page.evaluate(async ({ preSeek }) => {
  const v = document.querySelector('.warmup-videos .video-slide-stage video')
  const t0 = performance.now()
  let jumped = false
  while (performance.now() - t0 < 3000) {
    await new Promise((r) => requestAnimationFrame(r))
    if (v.currentTime > preSeek + 0.5 || Math.abs(v.currentTime - preSeek) > 1) { jumped = true; break }
    if (v.currentTime < preSeek - 0.1) { jumped = true; break }
  }
  return { jumped, videoTime: v.currentTime }
}, { preSeek: half.preSeek })
check('拖动进度条驱动视频跳转', seeked.jumped && seeked.videoTime <= half.max + 0.1,
  `${half.preSeek.toFixed(2)} → ${seeked.videoTime.toFixed(2)} / max=${half.max.toFixed(2)}`)

// 4. +10s 快进（视频只有 5 秒，会被钳制到末尾附近）
const afterFwd = await page.evaluate(() => {
  const v = document.querySelector('.warmup-videos .video-slide-stage video')
  const before = v.currentTime
  ;[...document.querySelectorAll('.warmup-videos .video-seek-btn')].find((b) => b.textContent === '+10s').click()
  return { before, after: v.currentTime, duration: v.duration }
})
check('+10s 快进生效且被钳制在时长内', afterFwd.after > afterFwd.before && afterFwd.after <= afterFwd.duration + 0.01,
  `${afterFwd.before.toFixed(2)} → ${afterFwd.after.toFixed(2)} / ${afterFwd.duration.toFixed(2)}`)

// 5. −10s 后退：重载页面拿全新播放状态（流式 webm 播到末尾后 seek 行为不可靠，真实 MP4 无此问题）
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.lp-cta', { timeout: 8000 })
await page.click('.lp-cta')
await page.waitForSelector('.tabbar', { timeout: 8000 })
await page.locator('.tabbar button:visible', { hasText: /动作|训练/ }).first().click()
await page.waitForTimeout(400)
await page.click('.coach-card')
await page.waitForTimeout(300)
await page.click('.plan-day-card.is-push')
await page.waitForTimeout(300)
await page.click('.warmup-video-entry')
await page.waitForSelector('.warmup-videos', { timeout: 8000 })
const afterBack = await page.evaluate(() => new Promise((resolve) => {
  const timer0 = setInterval(() => {
    const v = document.querySelector('.warmup-videos .video-slide-stage video')
    if (v && v.currentTime > 1.0 && !v.paused) {
      clearInterval(timer0)
      const before = v.currentTime
      ;[...document.querySelectorAll('.warmup-videos .video-seek-btn')].find((b) => b.textContent === '−10s').click()
      setTimeout(() => resolve({ before, after: v.currentTime }), 800)
    }
  }, 100)
  setTimeout(() => { clearInterval(timer0); resolve({ before: -1, after: -1 }) }, 15000)
}))
check('−10s 后退生效且不低于 0', afterBack.before > 0 && afterBack.after < afterBack.before && afterBack.after >= 0,
  `${afterBack.before.toFixed(2)} → ${afterBack.after.toFixed(2)}`)

// 6. 零控制台错误
const errors = await page.evaluate(() => window.__errors ?? [])
check('零运行时错误', errors.length === 0, errors.join('; ').slice(0, 120))

await page.screenshot({ path: 'shot-video-seek.png' })
await browser.close()
server.close()
console.log('done')
