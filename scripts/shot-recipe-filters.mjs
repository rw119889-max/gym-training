// 截图：食谱筛选两列网格
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
await new Promise(r => server.listen(4190, r))
const browser = await chromium.launch({ channel: 'msedge' })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })
const page = await context.newPage()
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
})
await page.goto('http://localhost:4190', { waitUntil: 'load' })
await page.click('.lp-cta')
await page.waitForTimeout(600)
await page.click('.tabbar button:has-text("食谱")')
await page.waitForTimeout(400)
await page.screenshot({ path: 'shot-recipe-filters.png', fullPage: false })
// 选中空气炸锅态
await page.click('.notes-ctl-btn:visible >> nth=0')
await page.waitForTimeout(400)
await page.screenshot({ path: 'shot-recipe-mode-filter.png', fullPage: false })
await browser.close()
server.close()
process.exit(0)
