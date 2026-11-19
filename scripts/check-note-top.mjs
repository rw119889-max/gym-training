// 专项检查：①打开长笔记应停在顶部（滚动修复验证）②五个 tab 控制台错误扫描
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
await new Promise(r => server.listen(4188, r))

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
page.on('console', m => { if (m.type() === 'error') errors.push('[console] ' + m.text().slice(0, 200)) })
page.on('pageerror', e => errors.push('[pageerror] ' + String(e).slice(0, 200)))

// 注入一条长笔记（30 段，撑出足够滚动高度）；key 带应用前缀 gt.v1.
await page.addInitScript(() => {
  const paras = Array.from({ length: 300 }, (_, i) => `<p>第${i + 1}段内容，用于撑出长笔记。</p>`).join('')
  const notes = [{ id: 'n-long', title: '长笔记测试', text: paras, topic: 'fitness', pinned: false, createdAt: Date.now(), updatedAt: Date.now(), html: paras }]
  localStorage.setItem('gt.v1.exerciseNotes', JSON.stringify(notes))
})

const BASE = 'http://localhost:4188'
await page.goto(BASE, { waitUntil: 'load' })
await page.click('.lp-cta') // Landing 进主应用
await page.waitForTimeout(600)
console.log('AFTER-CTA:', JSON.stringify(await page.evaluate(() => ({
  tabbar: !!document.querySelector('.tabbar'),
  rootLen: document.getElementById('root')?.innerHTML.length ?? 0,
  body: document.body.innerText.slice(0, 120),
}))))
console.log('ERRORS-SO-FAR:', errors.length ? errors : 'none')

// 进笔记 tab
await page.click('.tabbar button:has-text("笔记")')
await page.waitForTimeout(400)

// 打开长笔记
const card = page.getByText('长笔记测试').first()
await card.click()
await page.waitForTimeout(600) // 原滚底逻辑是 120ms 触发，留足时间观察是否误滚

const scrollY = await page.evaluate(() => window.scrollY)
const docH = await page.evaluate(() => document.documentElement.scrollHeight)
console.log(JSON.stringify({ scrollY, docH, openedAtTop: scrollY < 50, noteTall: docH > 4000 }, null, 2))

// 返回列表，扫各 tab 控制台错误
await page.goBack().catch(() => {})
await page.waitForTimeout(300)
for (const name of ['动作', '食谱', '笔记', '更多']) {
  const b = page.locator(`.tabbar button:has-text("${name}")`)
  if (await b.count()) { await b.click().catch(() => {}); await page.waitForTimeout(350) }
}
console.log('consoleErrors:', errors.length ? errors : 'none')
await browser.close()
server.close()
process.exit(0)
