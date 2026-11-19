// 开练视频 + 热身去删除按钮 验收脚本
// 覆盖：热身项无「删除」按钮、入口卡在热身上方、二级页 feed 结构、上下滑动切换、
// 上传按钮存在、管理行（改/删）、返回键回 plan 页
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

await new Promise((r) => server.listen(4288, r))

const browser = await chromium.launch({ channel: 'msedge' })
const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
await context.addInitScript(() => {
  window.addEventListener('error', (e) => {
    ;(window.__errors = window.__errors || []).push(String(e.message))
  })
})
const page = await context.newPage()
await page.goto('http://localhost:4288/', { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
// Service Worker 会缓存 dist 资源，测试时禁掉
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.lp-cta', { timeout: 8000 })
await page.click('.lp-cta')
await page.waitForSelector('.tabbar', { timeout: 8000 })

const results = []
const check = (name, ok, extra = '') => {
  const line = `${ok ? '✓' : '✗'} ${name}${extra ? ` — ${extra}` : ''}`
  results.push(line)
  console.log(line)
}

// ── 注入两条开练视频（无 blob → feed 显示「视频不在了」占位，只验证结构）──
await page.evaluate(() => {
  const now = new Date().toISOString()
  const clips = [
    { id: 'v-test-1', exerciseId: 'warmup:push', label: '卧推侧面', size: 1024000, duration: 15, createdAt: now },
    { id: 'v-test-2', exerciseId: 'warmup:push', label: '肩胛激活', size: 2048000, duration: 22, createdAt: now },
    { id: 'v-other', exerciseId: 'bench-press', label: '别的动作视频', size: 999, duration: 5, createdAt: now },
  ]
  localStorage.setItem('gt.v1.videos', JSON.stringify(clips))
})
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.lp-cta', { timeout: 8000 })
await page.click('.lp-cta')
await page.waitForSelector('.tabbar', { timeout: 8000 })

// ── 进动作 tab → 教练卡 → 推日 plan 页 ──
const tabBtn = page.locator('.tabbar button:visible', { hasText: /动作|训练/ }).first()
await tabBtn.click()
await page.waitForTimeout(400)
await page.click('.coach-card')
await page.waitForTimeout(400)
await page.click('.plan-day-card.is-push')
await page.waitForTimeout(400)

// 1. 入口卡在热身卡上方
const entryBeforeWarmup = await page.evaluate(() => {
  const entry = document.querySelector('.warmup-video-entry')
  const warmup = document.querySelector('.warmup-card')
  return !!entry && !!warmup && entry.nextElementSibling === warmup
})
check('入口卡紧挨在热身卡上方', entryBeforeWarmup)

const entryText = await page.locator('.wve-sub').first().textContent()
check('入口卡显示视频条数', /2 条/.test(entryText ?? ''), entryText ?? '')

// 2. 热身项没有「删除」按钮
const delBtns = await page.locator('.warmup-item button.warmup-del').count()
const delText = await page.locator('.warmup-item button', { hasText: '删除' }).count()
check('热身项无删除按钮', delBtns === 0 && delText === 0, `warmup-del=${delBtns} 删除=${delText}`)

// 3. 点入口卡 → 二级页
await page.click('.warmup-video-entry')
await page.waitForTimeout(500)
const onVideosPage = await page.evaluate(() => ({
  title: document.querySelector('.video-player-title')?.textContent ?? '',
  overlay: !!document.querySelector('.warmup-videos'),
  feed: !!document.querySelector('.warmup-videos .video-feed'),
  slides: document.querySelectorAll('.warmup-videos .video-slide').length,
  uploadBtn: [...document.querySelectorAll('button')].some((b) => (b.textContent ?? '').includes('上传')),
  backBtn: document.querySelector('.wv-back')?.textContent ?? '',
  rows: document.querySelectorAll('.warmup-video-row').length,
}))
check('全屏层标题「开练视频」', onVideosPage.title === '开练视频', onVideosPage.title)
check('全屏 feed 存在且 2 条 slide', onVideosPage.feed && onVideosPage.slides === 2, `slides=${onVideosPage.slides}`)
check('上传按钮存在（可多选）', onVideosPage.uploadBtn)
check('返回键是「← 推日」', /推日/.test(onVideosPage.backBtn), onVideosPage.backBtn)

// 管理面板默认收起，点「管理」展开后数行数
await page.click('.warmup-videos button:has-text("管理")')
await page.waitForTimeout(300)
const manageRows = await page.locator('.warmup-video-row').count()
const manageHint = await page.evaluate(() => !!document.querySelector('.wv-manage .wv-hint'))
check('管理面板展开 2 行（改名/删除）', manageRows === 2 && manageHint, `rows=${manageRows} hint=${manageHint}`)
await page.click('.warmup-videos button:has-text("收起")')
await page.waitForTimeout(200)
check('管理面板可收起', (await page.locator('.wv-manage').count()) === 0)

// 4. 上下滑动切换：滚到第二条，计数/激活变化
const feedBox = await page.locator('.warmup-videos .video-feed').boundingBox()
await page.mouse.move(feedBox.x + feedBox.width / 2, feedBox.y + feedBox.height / 2)
await page.mouse.wheel(0, feedBox.height)
await page.waitForTimeout(600)
const scrolled = await page.evaluate(() => {
  const track = document.querySelector('.warmup-videos .video-feed')
  return { top: track.scrollTop, h: track.clientHeight, n: track.children.length }
})
check('feed 可上下滚动（滚到第二条）', scrolled.top > scrolled.h * 0.5, `top=${scrolled.top}`)

// 5. 返回键回 plan 页
await page.click('.wv-back')
await page.waitForTimeout(400)
const backOnPlan = await page.evaluate(() => ({
  warmup: !!document.querySelector('.warmup-card'),
  entry: !!document.querySelector('.warmup-video-entry'),
}))
check('返回后回到推日页（热身卡+入口卡）', backOnPlan.warmup && backOnPlan.entry)

// 6. 浏览器返回键（popstate）也回 plan 页
await page.click('.warmup-video-entry')
await page.waitForTimeout(400)
await page.goBack()
await page.waitForTimeout(400)
const popBack = await page.evaluate(() => !!document.querySelector('.warmup-card'))
check('浏览器返回键回推日页', popBack)

// 7. 拉日入口独立计数（0 条 → 引导文案）
await page.evaluate(() => {
  const clips = JSON.parse(localStorage.getItem('gt.v1.videos'))
  clips.push({ id: 'v-pull-1', exerciseId: 'warmup:pull', label: '引体预备', size: 500, duration: 8, createdAt: new Date().toISOString() })
  localStorage.setItem('gt.v1.videos', JSON.stringify(clips))
})
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.lp-cta', { timeout: 8000 })
await page.click('.lp-cta')
await page.waitForSelector('.tabbar', { timeout: 8000 })
await page.locator('.tabbar button:visible', { hasText: /动作|训练/ }).first().click()
await page.waitForTimeout(300)
await page.click('.coach-card')
await page.waitForTimeout(300)
await page.click('.plan-day-card.is-pull')
await page.waitForTimeout(300)
const pullEntry = await page.locator('.wve-sub').first().textContent()
check('拉日入口显示 1 条', /1 条/.test(pullEntry ?? ''), pullEntry ?? '')

// 8. 拉日二级页只显示拉日的视频
await page.click('.warmup-video-entry')
await page.waitForTimeout(400)
const pullFeed = await page.evaluate(() => document.querySelectorAll('.warmup-videos .video-slide').length)
check('拉日 feed 只有拉日视频（1 条）', pullFeed === 1, `slides=${pullFeed}`)

// 9. 视口溢出 + 错误
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
check('390px 无横向溢出', overflow <= 0, `overflow=${overflow}`)
const errors = await page.evaluate(() => window.__errors ?? [])
check('零页面错误', errors.length === 0, errors.slice(0, 3).join(' | '))

console.log(results.join('\n'))
const failed = results.filter((r) => r.startsWith('✗')).length
console.log(failed === 0 ? `\nALL PASS (${results.length})` : `\nFAILED: ${failed}`)
await page.screenshot({ path: 'shot-warmup-videos.png', fullPage: false })
await browser.close()
server.close()
process.exit(failed === 0 ? 0 : 1)
