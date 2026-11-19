// 动作 tab 验收：header 控件命中区、编辑器重名校验流程、骨架/提示
import { chromium } from 'playwright'

const url = process.argv[2] || 'http://localhost:5173'
let browser
for (const channel of ['msedge', 'chrome', undefined]) {
  try {
    browser = await chromium.launch(channel ? { channel } : {})
    break
  } catch {}
}
if (!browser) throw new Error('no browser available')

const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
await page.goto(url, { waitUntil: 'load' })
await page.waitForTimeout(600)
await page.click('.lp-cta')
await page.waitForTimeout(400)

const report = {}

// 1. header 控件命中区（直接量边界盒，末段 48px 热区规则生效）
report.headerTargets = await page.evaluate(() => {
  const rect = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return `${Math.round(r.width)}x${Math.round(r.height)}`
  }
  return { themeToggle: rect('.theme-toggle'), versionBadge: rect('.app-header .version-badge') }
})

// 2. 编辑器重名校验：分类页 → + 新动作 → 输入已有动作名
await page.click('.category-card >> nth=0')
await page.waitForTimeout(400)
await page.click('.ghost-btn.small.group-add')
await page.waitForTimeout(300)
report.editorHintInitial = await page.evaluate(
  () => document.querySelector('.field-hint')?.textContent ?? null,
)
await page.fill('.field-input', '杠铃卧推')
await page.waitForTimeout(300)
report.editorDuplicate = await page.evaluate(() => ({
  errorShown: document.querySelector('.field-error')?.textContent ?? null,
  submitDisabled: document.querySelector('.save-btn.add-exercise-btn')?.disabled ?? null,
}))
await page.screenshot({ path: 'shot-editor-duplicate.png' })
// 改成不重名 → 错误消失、提交可用
await page.fill('.field-input', '保加利亚分腿蹲')
await page.waitForTimeout(300)
report.editorOk = await page.evaluate(() => ({
  errorGone: document.querySelector('.field-error') === null,
  submitEnabled: !document.querySelector('.save-btn.add-exercise-btn')?.disabled,
}))
// 取消收起编辑器，避免污染界面状态
await page.click('.ghost-btn.small:has-text("取消")')
await page.waitForTimeout(200)

console.log(JSON.stringify(report, null, 2))
await browser.close()
