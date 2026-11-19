// 动作档案视频页上传入口验收：二级页有上传按钮/表单，计划页动作卡下方不显示上传区
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
await new Promise((r) => server.listen(4292, r))

const browser = await chromium.launch({ channel: 'msedge' })
const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
await context.addInitScript(() => {
  window.addEventListener('error', (e) => { ;(window.__errors = window.__errors || []).push(String(e.message)) })
})
const page = await context.newPage()
const check = (name, ok, extra = '') => console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ` — ${extra}` : ''}`)

await page.goto('http://localhost:4292/', { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.lp-cta', { timeout: 8000 })
await page.click('.lp-cta')
await page.waitForSelector('.tabbar', { timeout: 8000 })

// 进动作 tab → 我的动作档案第一个分类 → 第一个动作 → 视频二级页
await page.locator('.tabbar button:visible', { hasText: /动作|训练/ }).first().click()
await page.waitForTimeout(400)
await page.click('.category-card >> nth=0')
await page.waitForTimeout(400)
await page.click('.exercise-card-open >> nth=0')
await page.waitForTimeout(400)
const detailTitle = await page.locator('.page-title').first().textContent()
await page.click('.module-row:has-text("视频")')
await page.waitForTimeout(400)

// 1. 二级页有上传入口
const s1 = await page.evaluate(() => ({
  title: document.querySelector('.page-title')?.textContent ?? '',
  uploadBtn: [...document.querySelectorAll('button')].some((b) => b.textContent?.includes('上传视频')),
  hint: [...document.querySelectorAll('.hint')].some((p) => p.textContent?.includes('还没有视频')),
}))
check('视频二级页标题正确', s1.title === '视频', s1.title)
check('视频二级页有「+ 上传视频」入口', s1.uploadBtn)
check('空态提示存在', s1.hint)

// 2. 点上传展开表单：标题输入 + 选择视频按钮 + 文件 input 多选
await page.click('.video-add')
await page.waitForTimeout(300)
const s2 = await page.evaluate(() => ({
  form: !!document.querySelector('.video-upload'),
  titleInput: !!document.querySelector('.video-upload .field-input'),
  chooseBtn: [...document.querySelectorAll('.video-upload button')].some((b) => b.textContent?.includes('选择视频')),
  multiple: document.querySelector('.video-upload input[type=file]')?.multiple ?? false,
  accept: document.querySelector('.video-upload input[type=file]')?.accept ?? '',
}))
await page.screenshot({ path: 'shot-exercise-video-upload.png' })
check('展开上传表单', s2.form)
check('标题输入框存在', s2.titleInput)
check('选择视频按钮存在', s2.chooseBtn)
check('file input 支持多选且限定 video', s2.multiple && s2.accept === 'video/*', `multiple=${s2.multiple} accept=${s2.accept}`)

// 3. 取消后回到上传按钮
await page.click('.video-upload button:has-text("取消")')
await page.waitForTimeout(300)
check('取消后回到「+ 上传视频」', await page.locator('.video-add').count() === 1)

// 4. 计划页动作卡下方不显示上传区（避免大黑框回归）
await page.click('.back-btn')
await page.waitForTimeout(300)
await page.click('.back-btn')
await page.waitForTimeout(300)
await page.click('.back-btn') // 回动作 tab home
await page.waitForTimeout(300)
await page.click('.coach-card')
await page.waitForTimeout(300)
await page.click('.plan-day-card.is-push')
await page.waitForTimeout(400)
const s4 = await page.evaluate(() => ({
  uploadBtns: [...document.querySelectorAll('.video-add')].filter((b) => b.offsetParent).length,
  videoGrids: [...document.querySelectorAll('.video-grid')].filter((b) => b.offsetParent).length,
}))
check('计划页动作卡下方无上传按钮', s4.uploadBtns === 0, `uploadBtns=${s4.uploadBtns}`)
check('计划页动作卡下方无视频网格', s4.videoGrids === 0, `videoGrids=${s4.videoGrids}`)

const errors = await page.evaluate(() => window.__errors ?? [])
check('零运行时错误', errors.length === 0, errors.join('; ').slice(0, 120))

await browser.close()
server.close()
console.log('done —', detailTitle)
