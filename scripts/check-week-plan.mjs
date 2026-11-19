// 本周安排紧凑周条验收：一行 7 列、无说明文字、今日高亮、点格子进计划页、卡片高度显著变小
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
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
await page.goto('http://localhost:4289/', { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
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

// 注入一条本周完成的记录（今天是周四=休息日？直接按真实日期注入昨天）
await page.evaluate(() => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  const p = (n) => String(n).padStart(2, '0')
  const key = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  const sessions = [{ id: 's-1', day: 'push', date: key, seq: 1, createdAt: new Date().toISOString() }]
  localStorage.setItem('gt.v1.trainingLog', JSON.stringify(sessions))
})
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.lp-cta', { timeout: 8000 })
await page.click('.lp-cta')
await page.waitForSelector('.tabbar', { timeout: 8000 })
await page.locator('.tabbar button:visible', { hasText: /动作|训练/ }).first().click()
await page.waitForTimeout(300)
await page.click('.coach-card')
await page.waitForTimeout(400)

const report = await page.evaluate(() => {
  const card = document.querySelector('.week-plan-card')
  const rect = card?.getBoundingClientRect()
  const cells = [...document.querySelectorAll('.wp-cell')]
  const grid = document.querySelector('.week-plan-grid')
  return {
    cardH: rect?.height ?? 0,
    cellCount: cells.length,
    oneRow: grid ? Math.abs(cells[0].getBoundingClientRect().top - cells[6].getBoundingClientRect().top) < 2 : false,
    todayMarked: cells.some((c) => c.classList.contains('is-today')),
    doneMarked: cells.filter((c) => c.querySelector('.wp-cell-state.is-done')).length,
    restCells: document.querySelectorAll('.wp-cell.is-rest').length,
    trainingCells: document.querySelectorAll('.wp-cell.is-training').length,
    noteGone: !document.querySelector('.week-plan-note'),
    progress: document.querySelector('.week-plan-progress')?.textContent ?? '',
    todayCta: document.querySelector('.week-plan-today')?.textContent ?? '',
  }
})
check('卡片高度 ≤ 220px（原 ~400px）', report.cardH > 0 && report.cardH <= 220, `h=${Math.round(report.cardH)}`)
check('7 个格子', report.cellCount === 7, `n=${report.cellCount}`)
check('一行排列', report.oneRow)
check('今日高亮', report.todayMarked)
check('昨日完成标记 1 个', report.doneMarked === 1, `done=${report.doneMarked}`)
check('休息格 3 + 训练格 4', report.restCells === 3 && report.trainingCells === 4, `rest=${report.restCells} train=${report.trainingCells}`)
check('说明文字已删', report.noteGone)
check('进度文案', /已完成/.test(report.progress), report.progress)

// 点推日格子 → 进推日计划页
const pushCell = page.locator('.wp-cell.is-training').first()
await pushCell.click()
await page.waitForTimeout(400)
const onPlan = await page.evaluate(() => !!document.querySelector('.warmup-card'))
check('点训练格子进计划页', onPlan)
await page.goBack()
await page.waitForTimeout(400)

// 溢出 + 错误
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
check('390px 无横向溢出', overflow <= 0, `overflow=${overflow}`)
await page.screenshot({ path: 'shot-week-plan.png', fullPage: false })

console.log(results.filter((r) => r.startsWith('✗')).length === 0 ? 'ALL PASS' : 'HAS FAILURES')
await browser.close()
server.close()
process.exit(results.some((r) => r.startsWith('✗')) ? 1 : 0)
