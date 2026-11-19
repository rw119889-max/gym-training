import { chromium } from 'playwright'
import { createServer } from 'http'
import { readFileSync, existsSync } from 'fs'
import { join, extname } from 'path'
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' }
const server = createServer((req, res) => {
  let p = req.url.split('?')[0]
  if (p === '/') p = '/index.html'
  const file = join('dist', p)
  if (!existsSync(file)) { res.writeHead(404); res.end('nf'); return }
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
  res.end(readFileSync(file))
})
await new Promise((r) => server.listen(4290, r))
const browser = await chromium.launch({ channel: 'msedge' })
for (const theme of ['dark', 'light']) {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
  await page.goto('http://localhost:4290/', { waitUntil: 'networkidle' })
  await page.evaluate((t) => { localStorage.clear(); localStorage.setItem('gt.v1.themeMode', JSON.stringify(t)) }, theme)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('.lp-cta', { timeout: 8000 })
  await page.screenshot({ path: `shot-palette-${theme}-landing.png` })
  await page.click('.lp-cta')
  await page.waitForSelector('.tabbar', { timeout: 8000 })
  await page.evaluate(() => {
    const d = new Date(); d.setDate(d.getDate() - 1)
    const p = (n) => String(n).padStart(2, '0')
    localStorage.setItem('gt.v1.trainingLog', JSON.stringify([{ id: 's-1', day: 'push', date: `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`, seq: 1, createdAt: new Date().toISOString() }]))
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('.lp-cta', { timeout: 8000 })
  await page.click('.lp-cta')
  await page.waitForSelector('.tabbar', { timeout: 8000 })
  await page.locator('.tabbar button:visible', { hasText: /动作|训练/ }).first().click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: `shot-palette-${theme}-home.png` })
  await page.click('.coach-card')
  await page.waitForTimeout(300)
  await page.click('.plan-day-card.is-push')
  await page.waitForTimeout(300)
  await page.screenshot({ path: `shot-palette-${theme}-plan.png` })
  await page.click('.warmup-video-entry')
  await page.waitForTimeout(500)
  await page.screenshot({ path: `shot-palette-${theme}-videos.png` })
  await page.close()
}
await browser.close()
server.close()
console.log('shots done')
