// 计划详情翻页卡验收：结构 + 按钮翻页 + 触屏左滑（带折痕受光中间态）+ 边界回弹 + 零报错
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

// 1. 结构：stage + 顶层页 + 底部分页（上一页禁用 / 下一页可用 / n m 计数）
const s1 = await page.evaluate(() => ({
  stage: !!document.querySelector('.plan-card-stage'),
  top: !!document.querySelector('.plan-card-page.is-top'),
  prev: document.querySelector('.plan-card-foot .plan-card-nav')?.textContent ?? '',
  prevDisabled: document.querySelector('.plan-card-foot .plan-card-nav')?.disabled ?? null,
  nextText: [...document.querySelectorAll('.plan-card-foot .plan-card-nav')].map((b) => b.textContent),
  count: document.querySelector('.plan-card-count')?.textContent ?? '',
  firstName: document.querySelector('.plan-card-page.is-top .plan-exercise-name')?.textContent ?? '',
}))
check('翻页卡结构存在（stage + 顶层页 + 分页栏）', s1.stage && s1.top, '')
check('初始态：1/n，上一页禁用', s1.count.startsWith('1') && s1.prevDisabled === true && s1.prev === '上一页', s1.count)
const firstName = s1.firstName

// 2. 触屏左滑：拖到 40% 截图（折痕受光可见），松手提交 → 翻到第 2 页
const swipe = await page.evaluate(async () => {
  const stage = document.querySelector('.plan-card-stage')
  const rect = stage.getBoundingClientRect()
  const y = rect.top + rect.height / 2
  const mk = (x) => new Touch({ identifier: 1, target: stage, clientX: x, clientY: y })
  const fire = (type, x) =>
    stage.dispatchEvent(new TouchEvent(type, {
      bubbles: true, cancelable: true,
      touches: [mk(x)], targetTouches: [mk(x)], changedTouches: [mk(x)],
    }))
  const W = rect.width
  const startX = rect.left + W * 0.85
  fire('touchstart', startX)
  const steps = 14
  for (let i = 1; i <= steps; i++) {
    // 拖到 40% 停住
    if (i <= Math.round(steps * 0.4 / 0.55)) {
      const x = startX - (W * 0.55 * i) / steps
      fire('touchmove', x)
    }
    await new Promise((r) => requestAnimationFrame(r))
  }
  return { dragged: true }
})
check('左滑拖拽已注入', swipe.dragged, '')
await page.evaluate(() => {
  document.querySelector('.plan-card-stage')?.scrollIntoView({ block: 'center' })
})
await page.waitForTimeout(300)
await page.screenshot({ path: 'shot-plan-card-midswipe.png' })

// 松手 → 应提交翻页
await page.evaluate(() => {
  const stage = document.querySelector('.plan-card-stage')
  const rect = stage.getBoundingClientRect()
  const y = rect.top + rect.height / 2
  const mk = (x) => new Touch({ identifier: 1, target: stage, clientX: x, clientY: y })
  stage.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [mk(rect.left + rect.width * 0.3)] }))
})
await page.waitForTimeout(600)
const s2 = await page.evaluate(() => ({
  count: document.querySelector('.plan-card-count')?.textContent ?? '',
  name: document.querySelector('.plan-card-page.is-top .plan-exercise-name')?.textContent ?? '',
  prevDisabled: [...document.querySelectorAll('.plan-card-foot .plan-card-nav')][0]?.disabled ?? null,
}))
check('左滑翻到第 2 页', s2.count.startsWith('2') && s2.name !== firstName, `${firstName} → ${s2.name}`)
await page.screenshot({ path: 'shot-plan-card-page2.png' })

// 3. 下一页按钮连点到最后一页：下一页禁用 + 继续左滑回弹不越界
const total = Number(s2.count.split('/')[1].trim())
for (let i = 0; i < total; i++) {
  const btns = await page.locator('.plan-card-foot .plan-card-nav').all()
  const disabled = await btns[1].isDisabled()
  if (disabled) break
  await btns[1].click()
  await page.waitForTimeout(450)
}
const s3 = await page.evaluate(() => ({
  count: document.querySelector('.plan-card-count')?.textContent ?? '',
  nextDisabled: [...document.querySelectorAll('.plan-card-foot .plan-card-nav')][1]?.disabled ?? null,
}))
check(`按钮翻页到末页 ${s3.count}，下一页禁用`, s3.count.startsWith(String(total)) && s3.nextDisabled === true, '')

const swipeLast = await page.evaluate(async () => {
  const stage = document.querySelector('.plan-card-stage')
  const rect = stage.getBoundingClientRect()
  const y = rect.top + rect.height / 2
  const mk = (x) => new Touch({ identifier: 1, target: stage, clientX: x, clientY: y })
  const fire = (type, x) =>
    stage.dispatchEvent(new TouchEvent(type, {
      bubbles: true, cancelable: true,
      touches: [mk(x)], targetTouches: [mk(x)], changedTouches: [mk(x)],
    }))
  const startX = rect.left + rect.width * 0.85
  fire('touchstart', startX)
  for (let i = 1; i <= 10; i++) {
    fire('touchmove', startX - (rect.width * 0.5 * i) / 10)
    await new Promise((r) => requestAnimationFrame(r))
  }
  fire('touchend', startX - rect.width * 0.5)
  return true
})
await page.waitForTimeout(600)
const s4 = await page.evaluate(() => document.querySelector('.plan-card-count')?.textContent ?? '')
check('末页继续左滑回弹不越界', swipeLast && s4.startsWith(String(total)), s4)

// 4. 上一页按钮回退
const btns = await page.locator('.plan-card-foot .plan-card-nav').all()
await btns[0].click()
await page.waitForTimeout(450)
const s5 = await page.evaluate(() => document.querySelector('.plan-card-count')?.textContent ?? '')
check('上一页回退生效', s5.startsWith(String(total - 1)), `${total} → ${s5}`)

// 5. 默认简洁：一句话 + 3 条短口令，详细内容折叠；展开后原文仍在
const s6 = await page.evaluate(() => {
  const top = document.querySelector('.plan-card-page.is-top')
  const detail = top.querySelector('.plan-card-detail')
  return {
    text: (top.innerText ?? '').replace(/\s+/g, ''),
    detailOpen: detail?.open ?? null,
    steps: top.querySelectorAll('.plan-card-steps li').length,
    hasCue: !!top.querySelector('.plan-card-cue-text'),
  }
})
check('默认简洁：一句话 + 3 条口令，详细折叠', s6.text.length < 200 && s6.detailOpen === false && s6.steps === 3 && s6.hasCue,
  `默认可见 ${s6.text.length} 字`)
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
