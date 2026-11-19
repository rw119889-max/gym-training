// 本轮 8 项功能改动验收：动作上屏去重/热身卡/动作替换/菜谱视频/左滑删除/滚到底/筛选弹层/今天吃什么
import { chromium } from 'playwright'

const url = process.argv[2] || 'http://localhost:5173'

let browser
for (const channel of ['msedge', 'chrome', undefined]) {
  try {
    browser = await chromium.launch(channel ? { channel } : {})
    break
  } catch {
    /* 试下一个 */
  }
}
if (!browser) throw new Error('no browser')

const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const report = {}

// 种子数据：两条笔记（左滑删除用，Playwright 每次全新 profile 必须先种）
await page.addInitScript(() => {
  const now = new Date().toISOString()
  const notes = [
    { id: 'n-seed-1', title: '卧推要点', text: '肩胛后缩，触胸有张力，开推稍快。', pinned: false, topic: 'fitness', createdAt: now, updatedAt: now },
    { id: 'n-seed-2', title: '饮食备忘', text: '蛋白 116g，碳水 96g。', pinned: true, topic: 'diet', createdAt: now, updatedAt: now },
  ]
  localStorage.setItem('gt.v1.exerciseNotes', JSON.stringify(notes))
})

await page.goto(url, { waitUntil: 'load' })
await page.waitForTimeout(600)
await page.click('.lp-cta')
await page.waitForTimeout(400)

// 1. 动作上屏：不出现「本周跟练」标题与本周安排卡
report.exerciseHome = await page.evaluate(() => ({
  hasOldTitle: document.body.innerText.includes('本周跟练'),
  hasWeekPlan: !!document.querySelector('.week-plan-card'),
  hasCoachCard: !!document.querySelector('.coach-card'),
}))

// 2. 跟练模块里本周安排仍在
await page.click('.coach-card')
await page.waitForTimeout(400)
report.coaches = await page.evaluate(() => ({
  hasWeekPlan: !!document.querySelector('.week-plan-card'),
}))

// 3. 推日：热身卡默认展开 7 项、动作全部收起
await page.click('.plan-day-card.is-push')
await page.waitForTimeout(400)
report.pushDay = await page.evaluate(() => ({
  warmupItems: document.querySelectorAll('.warmup-item').length,
  warmupOpen: !!document.querySelector('.warmup-body'),
  openExercises: document.querySelectorAll('.plan-exercise.is-open').length,
  totalExercises: document.querySelectorAll('.plan-exercise').length,
}))

// 4. 替换动作：展开第一个 → 替换 → 自定义输入 → 确认
await page.click('.plan-exercise .plan-exercise-head')
await page.waitForTimeout(300)
await page.click('.swap-row button:has-text("替换动作")')
await page.waitForTimeout(300)
const pickCount = await page.locator('.swap-picks .filter-chip').count()
await page.fill('.swap-custom .field-input', '单手绳索臂屈伸')
await page.click('.swap-custom .save-btn')
await page.waitForTimeout(300)
report.swap = await page.evaluate(() => ({
  pickCountChips: document.querySelectorAll('.swap-picks .filter-chip').length,
  name: document.querySelector('.plan-exercise.is-open .plan-exercise-name')?.textContent,
  hasSwappedChip: !!document.querySelector('.plan-chip.is-swapped'),
  originalHint: document.querySelector('.plan-exercise.is-open .plan-exercise-muscles')?.textContent,
}))
// 还原
await page.click('.swap-row button:has-text("还原成")')
await page.waitForTimeout(300)
report.swapRestore = await page.evaluate(() => ({
  name: document.querySelector('.plan-exercise.is-open .plan-exercise-name')?.textContent,
  hasSwappedChip: !!document.querySelector('.plan-chip.is-swapped'),
}))
// 热身：添加 + 删除
const beforeCount = report.pushDay.warmupItems
await page.click('.warmup-body .ghost-btn:has-text("+ 添加热身动作")')
await page.fill('.warmup-add .field-input >> nth=0', '测试热身项')
await page.click('.warmup-add .save-btn')
await page.waitForTimeout(300)
const afterAdd = await page.locator('.warmup-item').count()
await page.click(`.warmup-item:has-text("测试热身项") .warmup-del`)
await page.waitForTimeout(300)
const afterDel = await page.locator('.warmup-item').count()
report.warmupEdit = { beforeCount, afterAdd, afterDel }

await page.click('.back-btn')
await page.waitForTimeout(300)
await page.click('.back-btn')
await page.waitForTimeout(300)

// 5. 食谱：无「今天吃什么」；编辑器有视频区
await page.click('.tabbar button:has-text("食谱")')
await page.waitForTimeout(400)
report.recipes = await page.evaluate(() => ({
  hasTodayText: document.body.innerText.includes('今天吃什么'),
}))
await page.click('button:has-text("+ 新建菜谱")')
await page.waitForTimeout(400)
report.recipeEditor = await page.evaluate(() => ({
  hasVideoSection: !!document.querySelector('.recipe-videos'),
  hasUploadBtn: !!document.querySelector('.recipe-videos .ghost-btn'),
}))

// 6. 笔记：筛选/排序弹层
await page.click('.back-btn')
await page.waitForTimeout(200)
await page.click('.tabbar button:has-text("笔记")')
await page.waitForTimeout(400)
const noteCount = await page.locator('.memo-card').count()
if (noteCount > 0) {
  await page.click('.notes-ctl-btn >> nth=0')
  await page.waitForTimeout(300)
  report.notesPop = await page.evaluate(() => ({
    popOpen: !!document.querySelector('.notes-pop'),
    options: document.querySelectorAll('.notes-pop-item').length,
  }))
  await page.click('.notes-pop-item:has-text("只看置顶")')
  await page.waitForTimeout(200)
  report.notesFilterApplied = await page.evaluate(() => ({
    btnText: document.querySelector('.notes-ctl-btn span')?.textContent,
    popClosed: !document.querySelector('.notes-pop'),
  }))
  // 左滑删除：拖到 -160px 松手 → 确认弹窗 → 点「否」不删；再滑点「是」删除
  const firstCard = page.locator('.memo-card').first()
  const box = await firstCard.boundingBox()
  const y = box.y + box.height / 2
  await page.mouse.move(box.x + box.width - 20, y)
  await page.mouse.down()
  for (let i = 1; i <= 10; i += 1) {
    await page.mouse.move(box.x + box.width - 20 - i * 16, y, { steps: 1 })
  }
  await page.mouse.up()
  await page.waitForTimeout(300)
  const heading = await page.locator('.memo-card').first().locator('.memo-title').textContent()
  report.swipeConfirm = await page.evaluate(() => ({
    dialogOpen: !!document.querySelector('.confirm-overlay'),
    message: document.querySelector('.confirm-message')?.textContent ?? null,
  }))
  await page.click('.confirm-actions .ghost-btn') // 否
  await page.waitForTimeout(200)
  const afterNo = await page.locator('.memo-card').count()
  // 再滑一次，点是
  const box2 = await page.locator('.memo-card').first().boundingBox()
  await page.mouse.move(box2.x + box2.width - 20, box2.y + box2.height / 2)
  await page.mouse.down()
  for (let i = 1; i <= 10; i += 1) {
    await page.mouse.move(box2.x + box2.width - 20 - i * 16, box2.y + box2.height / 2, { steps: 1 })
  }
  await page.mouse.up()
  await page.waitForTimeout(300)
  await page.click('.confirm-actions .save-btn') // 是
  await page.waitForTimeout(300)
  const afterYes = await page.locator('.memo-card').count()
  report.swipeDelete = { heading, afterNo, afterYes, before: noteCount }
}

await page.screenshot({ path: 'shot-feat-notes.png' })
console.log(JSON.stringify(report, null, 2))
await browser.close()
