// 食谱筛选验收 v2：弹层筛选（餐次/做法分组）、排序弹层、笔记打开在顶部
import { chromium } from 'playwright'
import { createServer } from 'http'
import { readFileSync, existsSync } from 'fs'
import { join, extname } from 'path'

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' }
const server = createServer((req, res) => {
  let p = join('dist', req.url === '/' ? 'index.html' : req.url.split('?')[0])
  if (!existsSync(p)) p = join('dist', 'index.html')
  res.setHeader('Content-Type', MIME[extname(p)] ?? 'application/octet-stream')
  res.end(readFileSync(p))
})
await new Promise(r => server.listen(4191, r))

let browser
for (const c of ['msedge', 'chrome', undefined]) {
  try {
    browser = await chromium.launch(c ? { channel: c } : {})
    break
  } catch { /* 试下一个通道 */ }
}
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })
const page = await context.newPage()
const errors = []
page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 150)) })
page.on('pageerror', e => errors.push(String(e).slice(0, 150)))

await page.addInitScript(() => {
  const mk = (id, name, meal, mode) => ({
    id, name, meal, method: '测试步骤', mode, imageIds: [], notes: '',
    ingredients: [{ id: 'i-1', name: '鸡胸肉', grams: 100, per100g: { protein: 24, fat: 2, carb: 0 } }],
    cookMinutes: 15, spicy: false, oilGrams: 5, saltGrams: 2, price: 0,
    favorite: false, cookedDates: [], createdAt: new Date().toISOString(), updatedAt: Date.now(),
  })
  localStorage.setItem('gt.v1.recipes', JSON.stringify([
    mk('r-1', '炸锅鸡翅', 'dinner', 'airfryer'),
    mk('r-2', '清蒸鲈鱼', 'dinner', 'steam'),
    mk('r-3', '番茄炒蛋', 'lunch', undefined),
  ]))
  // 长笔记：验证打开停在顶部（无自动聚焦跳底）
  const paras = Array.from({ length: 300 }, (_, i) => `<p>第${i + 1}段内容。</p>`).join('')
  localStorage.setItem('gt.v1.exerciseNotes', JSON.stringify([
    { id: 'n-long', title: '长笔记测试', text: paras, topic: 'fitness', pinned: false, createdAt: new Date().toISOString(), updatedAt: Date.now(), html: paras },
  ]))
})

const BASE = 'http://localhost:4191'
await page.goto(BASE, { waitUntil: 'load' })
await page.click('.lp-cta')
await page.waitForTimeout(600)
await page.click('.tabbar button:has-text("食谱")')
await page.waitForTimeout(400)

const report = {}

// 1. 筛选/排序已收纳为一行按钮，无常驻 chip 网格
report.collapsed = await page.evaluate(() => ({
  chips: document.querySelectorAll('.filter-grid .filter-chip').length,
  btns: [...document.querySelectorAll('.notes-ctl-btn span')].filter(el => el.offsetParent).map(el => el.textContent),
  count: document.querySelector('.notes-view-count')?.textContent,
}))

// 2. 打开筛选弹层：两组标题 + 13 项
await page.click('.notes-ctl-btn:visible >> nth=0')
await page.waitForTimeout(300)
report.pop = await page.evaluate(() => ({
  groups: [...document.querySelectorAll('.notes-pop-group')].map(el => el.textContent),
  items: [...document.querySelectorAll('.notes-pop-item')].map(el => el.textContent),
}))

// 3. 点「空气炸锅」筛选
await page.click('.notes-pop-item:has-text("空气炸锅")')
await page.waitForTimeout(300)
report.modeFilter = await page.evaluate(() =>
  [...document.querySelectorAll('.recipe-card-name')].map(el => el.textContent))

// 4. 排序弹层切换「收藏优先」
await page.click('.notes-ctl-btn:visible >> nth=0')
await page.waitForTimeout(200)
await page.click('.notes-ctl-btn:visible >> nth=1')
await page.waitForTimeout(200)
await page.click('.notes-pop-item:has-text("收藏优先")')
await page.waitForTimeout(300)
report.sortApplied = await page.evaluate(() =>
  [...document.querySelectorAll('.notes-ctl-btn span')].filter(el => el.offsetParent).map(el => el.textContent))

// 5. 笔记 tab：打开长笔记应停在顶部
await page.click('.tabbar button:has-text("笔记")')
await page.waitForTimeout(400)
const longNote = page.getByText('长笔记测试').first()
await longNote.click()
await page.waitForTimeout(600)
report.noteTop = await page.evaluate(() => ({
  scrollY: window.scrollY,
  docH: document.documentElement.scrollHeight,
  openedAtTop: window.scrollY < 50,
}))

report.errors = errors
console.log(JSON.stringify(report, null, 2))
await browser.close()
server.close()
process.exit(errors.length ? 1 : 0)
