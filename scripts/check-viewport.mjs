// 390px 视口验收：无横向溢出、主按钮首屏可见、触控目标尺寸。
// 用法：npx -p playwright node scripts/check-viewport.mjs [url]
import { chromium } from 'playwright'

const url = process.argv[2] || 'http://localhost:5173'
// 优先用系统浏览器（免下载 chromium），都没有再落回默认
let browser
for (const channel of ['msedge', 'chrome', undefined]) {
  try {
    browser = await chromium.launch(channel ? { channel } : {})
    break
  } catch (e) {
    // 下一个候选
  }
}
if (!browser) throw new Error('no browser available')
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
await page.goto(url, { waitUntil: 'load' })
await page.waitForTimeout(800)

const overflow = () =>
  page.evaluate(() => {
    const doc = document.documentElement
    const wide = []
    // 找出任何实际宽度超出视口的元素（排除 fixed 装饰层）
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el)
      if (cs.position === 'fixed' && cs.pointerEvents === 'none') continue
      // 横向滚动条带（如筛选 chip 行）内的越界属设计内溢出，不算页面溢出
      let p = el.parentElement
      let inScroller = false
      while (p && p !== document.body) {
        const pcs = getComputedStyle(p)
        if (/(auto|scroll)/.test(pcs.overflowX)) { inScroller = true; break }
        p = p.parentElement
      }
      if (inScroller) continue
      const r = el.getBoundingClientRect()
      if (r.right > doc.clientWidth + 1 || r.left < -1) {
        wide.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} right=${Math.round(r.right)}`)
      }
    }
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      horizontalOverflow: doc.scrollWidth > doc.clientWidth,
      wideElements: wide.slice(0, 8),
    }
  })

const report = {}
report.landing = await overflow()

// 主按钮首屏可见
report.landingCta = await page.evaluate(() => {
  const el = document.querySelector('.lp-cta')
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { top: Math.round(r.top), height: Math.round(r.height), inFirstScreen: r.top >= 0 && r.bottom <= innerHeight }
})

await page.screenshot({ path: 'shot-landing-390.png', fullPage: false })

// 触控目标抽检：landing 上的按钮
report.landingTargets = await page.evaluate(() =>
  [...document.querySelectorAll('button')].map((b) => {
    const r = b.getBoundingClientRect()
    return { label: b.textContent.trim().slice(0, 8), w: Math.round(r.width), h: Math.round(r.height) }
  }),
)

// 进入应用
await page.click('.lp-cta')
await page.waitForTimeout(500)
report.app = await overflow()
report.tabbar = await page.evaluate(() =>
  [...document.querySelectorAll('.tabbar button')].map((b) => {
    const r = b.getBoundingClientRect()
    return { label: b.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height) }
  }),
)

// 逐 tab 检查溢出并截图（字号/间距 snap 后的文字换行回归）
report.tabs = {}
for (const label of ['动作', '笔记', '食谱']) {
  await page.click(`.tabbar button:has-text("${label}")`)
  await page.waitForTimeout(600)
  report.tabs[label] = await overflow()
  await page.screenshot({ path: `shot-tab-${label}-390.png`, fullPage: false })
}

// skip link 键盘路径：Tab 第一站应聚焦它
await page.keyboard.press('Tab')
report.skipLinkFocused = await page.evaluate(
  () => document.activeElement?.className === 'skip-link',
)
// 再按 Enter 应跳到 main 且焦点可见
await page.keyboard.press('Enter')
await page.waitForTimeout(200)
report.skipTargetId = await page.evaluate(() => document.querySelector('main')?.id)

await page.screenshot({ path: 'shot-app-390.png', fullPage: false })

console.log(JSON.stringify(report, null, 2))
await browser.close()
