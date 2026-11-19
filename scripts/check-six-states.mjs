// 六态终查：各视图焦点环 / disabled 视觉区分 / cursor / 空态与错误态挂载点
import { chromium } from 'playwright'

const url = process.argv[2] || 'http://localhost:5173'

let browser
for (const c of ['msedge', 'chrome', undefined]) {
  try {
    browser = await chromium.launch(c ? { channel: c } : {})
    break
  } catch {}
}

const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
await page.goto(url, { waitUntil: 'load' })
await page.waitForTimeout(600)

const report = {}

const audit = async (name) => {
  const r = await page.evaluate(() => {
    const out = { focusRing: null, badCursor: [], disabledDistinct: [], enabledButtons: 0 }
    const active = document.activeElement
    if (active && active !== document.body) {
      const cs = getComputedStyle(active)
      out.focusRing = {
        el: (active.className?.toString() || active.tagName).slice(0, 30),
        outline: `${cs.outlineWidth} ${cs.outlineStyle}`,
      }
    }
    for (const btn of document.querySelectorAll('button, [role="button"]')) {
      const r2 = btn.getBoundingClientRect()
      if (r2.width === 0) continue
      const cs = getComputedStyle(btn)
      if (btn.disabled) {
        out.disabledDistinct.push({
          cls: btn.className.toString().slice(0, 30),
          opacity: cs.opacity,
          cursor: cs.cursor,
        })
      } else {
        out.enabledButtons++
        if (cs.cursor !== 'pointer' && cs.cursor !== 'not-allowed') {
          out.badCursor.push({ cls: btn.className.toString().slice(0, 30), cursor: cs.cursor })
        }
      }
    }
    return out
  })
  report[name] = r
}

// Landing：Tab 第一站应是 skip link，焦点环可见
await page.keyboard.press('Tab')
await audit('landing')

// 进入应用
await page.click('.lp-cta')
await page.waitForTimeout(400)
for (const tab of ['动作', '笔记', '食谱']) {
  await page.click(`.tabbar button:has-text("${tab}")`)
  await page.waitForTimeout(300)
  await page.keyboard.press('Tab')
  await audit(`tab-${tab}`)
}

// 食谱编辑器：保存钮禁用时应视觉区分
await page.click('.tabbar button:has-text("食谱")')
await page.waitForTimeout(300)
await page.click('button:has-text("+ 新建菜谱")')
await page.waitForTimeout(300)
await audit('recipe-editor')

// 笔记编辑器（工具栏 + 保存钮）
await page.click('.tabbar button:has-text("笔记")')
await page.waitForTimeout(300)
await page.click('button:has-text("+ 新笔记")')
await page.waitForTimeout(400)
await audit('note-editor')

console.log(JSON.stringify(report, null, 2))
await browser.close()
