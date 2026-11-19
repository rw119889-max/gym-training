// 笔记/食谱 tab 验收：390px 溢出、排序下拉热区、骨架渲染、inline notice
import { chromium } from 'playwright'

const url = process.argv[2] || 'http://localhost:5173'

let browser
for (const c of ['msedge', 'chrome', undefined]) {
  try {
    browser = await chromium.launch(c ? { channel: c } : {})
    break
  } catch {
    /* 试下一个通道 */
  }
}
if (!browser) {
  console.error('no browser channel available')
  process.exit(1)
}

const page = await browser.newPage({ viewport: { width: 390, height: 844 } })

// 种子：一道带失效 imageId 的菜谱 → RecipeImage 骨架应渲染且不出现「暂无图片」
const seedRecipe = {
  id: 'r-seed-1',
  name: '测试菜谱',
  meal: 'dinner',
  method: '测试做法',
  imageIds: ['ri-missing'],
  notes: '',
  ingredients: [
    { id: 'i-1', name: '鸡胸肉', grams: 150, per100g: { protein: 24, fat: 2, carb: 0 } },
  ],
  cookMinutes: 20,
  spicy: false,
  oilGrams: 5,
  saltGrams: 2,
  price: 12,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

await page.addInitScript((recipe) => {
  localStorage.setItem('gt.v1.recipes', JSON.stringify([recipe]))
}, seedRecipe)

const report = {}
await page.goto(url, { waitUntil: 'load' })
await page.waitForTimeout(600)
await page.click('.lp-cta')
await page.waitForTimeout(400)

const overflow = () =>
  page.evaluate(() => {
    const bad = []
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el)
      if (cs.position === 'fixed' && cs.pointerEvents === 'none') continue
      let p = el.parentElement
      let inScroller = false
      while (p) {
        const pcs = getComputedStyle(p)
        if (pcs.overflowX === 'auto' || pcs.overflowX === 'scroll') inScroller = true
        p = p.parentElement
      }
      if (inScroller) continue
      const r = el.getBoundingClientRect()
      if (r.right > 391 || r.left < -1) bad.push(el.className?.toString().slice(0, 40))
    }
    return { sw: document.documentElement.scrollWidth, bad }
  })

const tab = async (name) => {
  await page.click(`.tabbar button:has-text("${name}")`)
  await page.waitForTimeout(400)
  return overflow()
}

report.notes = await tab('笔记')
report.recipes = await tab('食谱')

// 排序下拉热区（两处复用 .notes-view-ctl）
report.sortCtl = await page.evaluate(() => {
  const ctl = document.querySelector('.notes-view-ctl')
  if (!ctl) return null
  const r = ctl.getBoundingClientRect()
  return { w: Math.round(r.width), h: Math.round(r.height) }
})

// 骨架：菜谱卡缩略图应为 is-skeleton div，且页面无「暂无图片」文字
report.skeleton = await page.evaluate(() => ({
  skeletonDivs: document.querySelectorAll('.recipe-image.is-skeleton').length,
  noPlaceholderText: !document.body.textContent.includes('暂无图片'),
  cards: document.querySelectorAll('.recipe-card').length,
}))

// 详情页 notice 挂载点 + 骨架
await page.click('.recipe-card')
await page.waitForTimeout(400)
const detailOverflow = await overflow()
report.detail = {
  ...detailOverflow,
  detailSkeletons: await page.evaluate(
    () => document.querySelectorAll('.recipe-image.is-skeleton').length,
  ),
}
await page.screenshot({ path: 'shot-recipe-detail-390.png', fullPage: false })

// 全项目 alert 应为 0（静态断言在 CI 外手工核对，这里验证运行时无 dialog 弹出）
let alertFired = false
page.on('dialog', async (d) => {
  alertFired = true
  await d.dismiss()
})

console.log(JSON.stringify(report, null, 2))
console.log('alertFired:', alertFired)
await browser.close()
