// 计划详情翻页卡验收：无按钮无页码 + 纯手势左右滑翻页（折痕受光中间态）+ 边界回弹 + 苹果风格排版 + 零报错
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

await new Promise((r) => server.listen(4291, r))

const browser = await chromium.launch({ channel: 'msedge' })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })
await context.addInitScript(() => {
  window.addEventListener('error', (e) => {
    ;(window.__errors = window.__errors || []).push(String(e.message))
  })
})
const page = await context.newPage()
await page.goto('http://localhost:4291/', { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.lp-cta', { timeout: 8000 })
await page.click('.lp-cta')
await page.waitForSelector('.tabbar', { timeout: 8000 })
await page.locator('.tabbar button:visible', { hasText: /动作|训练/ }).first().click()
await page.waitForTimeout(400)
await page.click('.coach-card')
await page.waitForTimeout(300)
await page.click('.plan-day-card.is-push')
await page.waitForSelector('.plan-card-stage', { timeout: 8000 })
await page.waitForTimeout(400)

const check = (name, ok, extra = '') => console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ` — ${extra}` : ''}`)
const topName = () => page.evaluate(() => document.querySelector('.plan-card-page.is-top .plan-card-title')?.textContent?.trim() ?? '')

// 注入一次横向滑动。dir=1 左滑（下一页），dir=-1 右滑（上一页）；hold=拖动后停住不松手
async function swipe(dir, fraction = 0.6, hold = false) {
  await page.evaluate(async ({ dir, fraction, hold }) => {
    const stage = document.querySelector('.plan-card-stage')
    const rect = stage.getBoundingClientRect()
    const y = rect.top + rect.height / 2
    const startX = rect.left + rect.width * (dir > 0 ? 0.85 : 0.15)
    const mk = (x) => new Touch({ identifier: 1, target: stage, clientX: x, clientY: y })
    const fire = (type, x) =>
      stage.dispatchEvent(new TouchEvent(type, {
        bubbles: true, cancelable: true,
        touches: [mk(x)], targetTouches: [mk(x)], changedTouches: [mk(x)],
      }))
    fire('touchstart', startX)
    const steps = 14
    for (let i = 1; i <= steps; i++) {
      fire('touchmove', startX - dir * (rect.width * fraction * i) / steps)
      await new Promise((r) => requestAnimationFrame(r))
    }
    if (!hold) fire('touchend', startX - dir * rect.width * fraction)
  }, { dir, fraction, hold })
}
async function release(dir, fraction = 0.6) {
  await page.evaluate(({ dir, fraction }) => {
    const stage = document.querySelector('.plan-card-stage')
    const rect = stage.getBoundingClientRect()
    const y = rect.top + rect.height / 2
    const mk = (x) => new Touch({ identifier: 1, target: stage, clientX: x, clientY: y })
    stage.dispatchEvent(new TouchEvent('touchend', {
      bubbles: true, cancelable: true, touches: [], targetTouches: [],
      changedTouches: [mk(rect.left + rect.width * (dir > 0 ? 0.85 - fraction : 0.15 + fraction))],
    }))
  }, { dir, fraction })
}

// 1. 结构：无上一页/下一页/页码，只有 stage + 顶层页
const s1 = await page.evaluate(() => ({
  stage: !!document.querySelector('.plan-card-stage'),
  top: !!document.querySelector('.plan-card-page.is-top'),
  noFoot: !document.querySelector('.plan-card-foot'),
  noNav: document.querySelectorAll('.plan-card-nav, .plan-card-count').length === 0,
  noPageText: !/上一页|下一页/.test(document.body.innerText),
  name: document.querySelector('.plan-card-page.is-top .plan-card-title')?.textContent?.trim() ?? '',
  font: getComputedStyle(document.querySelector('.plan-card-page')).fontFamily,
}))
check('结构：仅手势翻页，无按钮无页码', s1.stage && s1.top && s1.noFoot && s1.noNav && s1.noPageText, '')
check('苹果风格字体栈', /-apple-system|SF Pro|PingFang/.test(s1.font), s1.font.slice(0, 60))
const firstName = s1.name

// 2. 左滑拖到中途（停住）截图看折痕受光
await page.evaluate(() => document.querySelector('.plan-card-stage')?.scrollIntoView({ block: 'center' }))
await swipe(1, 0.4, true)
await page.waitForTimeout(250)
await page.screenshot({ path: 'shot-plan-card-midswipe.png' })
const mid = await page.evaluate(() => {
  const top = document.querySelector('.plan-card-page.is-top')
  return { turning: top.classList.contains('is-turning'), shade: Number(getComputedStyle(top.querySelector('.plan-card-shade')).opacity) }
})
check('左滑中途：纸页翻起 + 折痕受光', mid.turning && mid.shade > 0.2, `shade=${mid.shade.toFixed(2)}`)

// 松手提交 → 翻到第 2 页
await release(1, 0.4)
await page.waitForTimeout(650)
const secondName = await topName()
check('左滑提交翻到下一页', secondName !== firstName, `${firstName} → ${secondName}`)
await page.screenshot({ path: 'shot-plan-card-page2.png' })

// 3. 左滑到末页后继续左滑回弹（动作名不再变化）
const seen = [firstName, secondName]
for (let i = 0; i < 12; i++) {
  const before = await topName()
  await swipe(1, 0.6)
  await page.waitForTimeout(500)
  const after = await topName()
  if (after === before) break
  seen.push(after)
}
const lastName = await topName()
await swipe(1, 0.6)
await page.waitForTimeout(500)
check('末页继续左滑回弹不越界', (await topName()) === lastName, `共翻出 ${seen.length} 页，末页 ${lastName}`)

// 4. 右滑回到上一页
await swipe(-1, 0.6)
await page.waitForTimeout(500)
const backName = await topName()
check('右滑回退到上一页', backName !== lastName && seen.includes(backName), `${lastName} → ${backName}`)

// 5. 默认简洁：一句话 + 3 条口令，详细折叠；展开后原文仍在
const s6 = await page.evaluate(() => {
  const top = document.querySelector('.plan-card-page.is-top')
  const detail = top.querySelector('.plan-card-detail')
  return {
    text: (top.innerText ?? '').replace(/\s+/g, ''),
    detailOpen: detail?.open ?? null,
    steps: top.querySelectorAll('.plan-card-steps li').length,
    hasCue: !!top.querySelector('.plan-card-cue-text'),
    titleSize: parseFloat(getComputedStyle(top.querySelector('.plan-card-title')).fontSize),
  }
})
check('默认简洁：一句话 + 3 条口令，详细折叠', s6.text.length < 200 && s6.detailOpen === false && s6.steps === 3 && s6.hasCue, `默认可见 ${s6.text.length} 字`)
check('大标题层级', s6.titleSize >= 26, `${s6.titleSize}px`)
await page.click('.plan-card-page.is-top .plan-card-detail summary')
await page.waitForTimeout(200)
const s7 = await page.evaluate(() => {
  const top = document.querySelector('.plan-card-page.is-top')
  return {
    open: top.querySelector('.plan-card-detail')?.open ?? null,
    fullTips: top.querySelectorAll('.plan-card-detail .plan-tips li').length,
  }
})
check('展开详细讲解后教练原文仍在', s7.open === true && s7.fullTips > 3, `${s7.fullTips} 条原文要点`)

// 6. 零控制台错误
const errors = await page.evaluate(() => window.__errors ?? [])
check('零运行时错误', errors.length === 0, errors.join('; ').slice(0, 120))

await page.screenshot({ path: 'shot-plan-card.png' })
await browser.close()
server.close()
console.log('done')
