// 食谱筛选验收：两列网格、无「默认」排序、做法分类筛选、编辑器做法选择
import { chromium } from 'playwright'
import { createServer } from 'http'
import { readFileSync, existsSync } from 'fs'
import { join, extname } from 'path'

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' }
const server = createServer((req, res) => {
  let p = join('dist', req.url === '/' ? 'index.html' : req.url.split('?')[0])
  if (!existsSync(p)) p = join('dist', 'index.html')
  res.setHeader('Content-Type', MIME[extname(p)] ?? 'application/octet-stream')
  res.end(readFileSync(p))
})
await new Promise(r => server.listen(4189, r))

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

// 种子：3 道菜谱，其中 1 道空气炸锅（持久化数字 updatedAt 顺带做脏数据回归）
await page.addInitScript(() => {
  const mk = (id, name, meal, mode) => ({
    id, name, meal, method: '测试步骤', mode, imageIds: [], notes: '',
    ingredients: [{ id: 'i-1', name: '鸡胸肉', grams: 100, per100g: { protein: 24, fat: 2, carb: 0 } }],
    cookMinutes: 15, spicy: false, oilGrams: 5, saltGrams: 2, price: 0,
    favorite: false, cookedDates: [], createdAt: new Date().toISOString(),
    updatedAt: Date.now(),
  })
  const recipes = [
    mk('r-1', '炸锅鸡翅', 'dinner', 'airfryer'),
    mk('r-2', '清蒸鲈鱼', 'dinner', 'steam'),
    mk('r-3', '番茄炒蛋', 'lunch', undefined),
  ]
  localStorage.setItem('gt.v1.recipes', JSON.stringify(recipes))
  localStorage.setItem('gt.v1.recipeSort', JSON.stringify('default'))
})

const BASE = 'http://localhost:4189'
await page.goto(BASE, { waitUntil: 'load' })
await page.click('.lp-cta')
await page.waitForTimeout(600)
await page.click('.tabbar button:has-text("食谱")')
await page.waitForTimeout(400)

const report = {}

// 1. 两列网格：两组标签 + chip 全部在 2 列网格里
report.groups = await page.evaluate(() => ({
  labels: [...document.querySelectorAll('.filter-grid-label')].map(el => el.textContent),
  chips: [...document.querySelectorAll('.filter-grid .filter-chip')].map(el => el.textContent),
  cols: getComputedStyle(document.querySelector('.filter-grid')).gridTemplateColumns.split(' ').length,
}))

// 2. 排序下拉无「默认」
report.sortOptions = await page.evaluate(() =>
  [...document.querySelectorAll('.list-tools select option')].map(o => o.textContent))

// 3. 点「空气炸锅」只列炸锅鸡翅
await page.click('.filter-grid .filter-chip:has-text("空气炸锅")')
await page.waitForTimeout(300)
report.modeFilter = await page.evaluate(() => ({
  names: [...document.querySelectorAll('.recipe-card-name')].map(el => el.textContent),
}))

// 4. 点「清蒸」只列清蒸鲈鱼
await page.click('.filter-grid .filter-chip:has-text("清蒸")')
await page.waitForTimeout(300)
report.steamFilter = await page.evaluate(() =>
  [...document.querySelectorAll('.recipe-card-name')].map(el => el.textContent))

// 5. 点「全部」恢复 3 道
await page.click('.filter-grid .filter-chip:has-text("全部")')
await page.waitForTimeout(300)
report.allCount = await page.locator('.recipe-card').count()

// 6. 编辑器：打开炸锅鸡翅 → 做法分类行存在且选中空气炸锅 → 改成电饭锅保存
await page.click('.recipe-card >> nth=0')
await page.waitForTimeout(300)
await page.click('button:has-text("编辑")')
await page.waitForTimeout(400)
report.editorModeRow = await page.evaluate(() => ({
  hasLabel: !!document.querySelector('.field-label')?.textContent,
  pressed: [...document.querySelectorAll('.meal-picker .filter-chip[aria-pressed="true"]')].map(el => el.textContent),
}))
await page.click('.meal-picker .filter-chip:has-text("电饭锅")')
await page.click('button:has-text("保存")')
await page.waitForTimeout(400)

// 7. 回列表，点「电饭锅」应列出这道菜
await page.click('.tabbar button:has-text("食谱")').catch(() => {})
await page.goBack().catch(() => {})
await page.waitForTimeout(400)
await page.click('.filter-grid .filter-chip:has-text("电饭锅")')
await page.waitForTimeout(300)
report.afterEdit = await page.evaluate(() =>
  [...document.querySelectorAll('.recipe-card-name')].map(el => el.textContent))

// 8. 390px 溢出复查
report.overflow = await page.evaluate(() => document.documentElement.scrollWidth)

// 9. 旧排序值 default 迁移后 select 应显示「最近创建」
report.sortValue = await page.evaluate(() => document.querySelector('.list-tools select')?.value)

console.log(JSON.stringify(report, null, 2))
console.log('consoleErrors:', errors.length ? errors : 'none')
await browser.close()
server.close()
process.exit(errors.length ? 1 : 0)
