// 热身左滑删除验收：两段式滑动 + 确认弹窗；笔记左滑回归；动效类存在
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
await new Promise(r => server.listen(4192, r))

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

await page.goto('http://localhost:4192', { waitUntil: 'load' })
await page.click('.lp-cta')
await page.waitForTimeout(600)

const report = {}

// 进动作 tab → 跟练模块 → 推日 → 热身卡展开
await page.click('.coach-card').catch(() => {})
await page.waitForTimeout(400)
await page.click('.plan-day-card.is-push').catch(() => {})
await page.waitForTimeout(500)
const warmupHead = page.locator('.warmup-head').first()
if (await warmupHead.count()) {
  const collapsed = (await warmupHead.getAttribute('aria-expanded')) === 'false'
  if (collapsed) { await warmupHead.click(); await page.waitForTimeout(300) }
  const items = page.locator('.warmup-item')
  report.itemCount = await items.count()
  const first = items.first()
  await first.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await page.waitForTimeout(300)
  const box = await first.boundingBox()

  // 只滑过 -48（提示出现但松手不删）
  await page.mouse.move(box.x + box.width - 20, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width - 20 - 60, box.y + box.height / 2, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(250)
  report.hintOnlyNoDelete = (await page.locator('.confirm-overlay').count()) === 0
  report.itemCountAfterHint = await items.count()

  // 滑过 -120 松手 → 确认窗
  report.boxForDebug = box
  await page.mouse.move(box.x + box.width - 20, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width - 20 - 160, box.y + box.height / 2, { steps: 10 })
  report.dxDebug = await page.evaluate(() => {
    const el = document.querySelector('.warmup-item .memo-swipe-content')
    return el ? el.style.transform : 'no-content'
  })
  await page.mouse.up()
  await page.waitForTimeout(300)
  report.confirmShown = (await page.locator('.confirm-overlay').count()) > 0
  report.confirmMsg = await page.locator('.confirm-message').textContent().catch(() => null)

  // 点「否」→ 保留
  await page.click('.confirm-actions button >> nth=0').catch(() => {})
  await page.waitForTimeout(250)
  report.afterNo = await items.count()

  // 再滑 → 点「删掉」→ 减少
  await page.mouse.move(box.x + box.width - 20, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width - 20 - 160, box.y + box.height / 2, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(300)
  await page.click('.confirm-actions .save-btn').catch(() => {})
  await page.waitForTimeout(300)
  report.afterYes = await items.count()
}

// 竖向滚动让位回归：竖滑不触发手势/确认
if (await page.locator('.warmup-item').count()) {
  const box2 = await page.locator('.warmup-item').first().evaluate((el) => {
    el.scrollIntoView({ block: 'center' })
    const r = el.getBoundingClientRect()
    return { x: r.x, y: r.y, width: r.width, height: r.height }
  })
  await page.waitForTimeout(300)
  await page.mouse.move(box2.x + 40, box2.y + 10)
  await page.mouse.down()
  await page.mouse.move(box2.x + 40, box2.y + 60, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(250)
  report.verticalNoConfirm = (await page.locator('.confirm-overlay').count()) === 0
}

// 动效类检查
report.motion = await page.evaluate(() => {
  const panel = document.querySelector('.tab-panel')
  const bar = document.querySelector('.tabbar button[aria-current="true"]')
  return {
    panelAnimated: panel ? getComputedStyle(panel).animationName !== 'none' : false,
    barAnimated: bar ? getComputedStyle(bar, '::before').animationName.includes('tabbar-bar-in') : false,
  }
})

// 笔记左滑回归
await page.click('.tabbar button:has-text("笔记")')
await page.waitForTimeout(400)
const memoCount = await page.locator('.memo-card').count()
if (memoCount > 0) {
  const box3 = await page.locator('.memo-card').first().boundingBox()
  await page.mouse.move(box3.x + box3.width - 20, box3.y + box3.height / 2)
  await page.mouse.down()
  await page.mouse.move(box3.x + box3.width - 20 - 160, box3.y + box3.height / 2, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(300)
  report.memoSwipeStillWorks = (await page.locator('.confirm-overlay').count()) > 0
  await page.click('.confirm-actions button >> nth=0').catch(() => {})
}
report.memoCount = memoCount

report.overflow = await page.evaluate(() => document.documentElement.scrollWidth)
report.errors = errors
console.log(JSON.stringify(report, null, 2))
await browser.close()
server.close()
process.exit(errors.length ? 1 : 0)
