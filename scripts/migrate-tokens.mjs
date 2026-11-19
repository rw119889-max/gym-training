// 全局 token 迁移：
// 1) 间距 snap：padding/margin/gap 声明里的越界 px 值对齐约束表（0/2/4/8/12/16/24/32/40/48/64/80/96）
// 2) transition 时长分层：transform 分量 → var(--t-move)，其余颜色/阴影分量 → var(--t-color)
// 只处理 styles.css；宽度/高度/圆角/位移(translate)等非间距声明一律不碰。
import { readFileSync, writeFileSync } from 'node:fs'

const file = new URL('../src/styles.css', import.meta.url)
let css = readFileSync(file, 'utf8')

// ---------- 1) 间距 snap ----------
const SPACING_MAP = {
  1: 2, 3: 4, 5: 4, 6: 8, 7: 8, 9: 8, 10: 12, 11: 12,
  13: 12, 14: 16, 15: 16, 18: 16, 26: 24,
}

const spacingRe =
  /^(\s*)(padding|margin|gap|row-gap|column-gap)((?:-(?:top|bottom|left|right|block|inline))?)(\s*:\s*)([^;]+)(;)/gm

let spacingCount = 0
css = css.replace(spacingRe, (full, lead, prop, side, colon, value, semi) => {
  const next = value.replace(/(\d+)px/g, (m, n) => {
    const target = SPACING_MAP[Number(n)]
    if (target === undefined) return m
    spacingCount++
    return `${target}px`
  })
  return `${lead}${prop}${side}${colon}${next}${semi}`
})

// ---------- 2) transition 时长分层 ----------
// 组件里没有字面 cubic-bezier（全部走 var token），按逗号拆安全
let transitionCount = 0
css = css.replace(/transition:\s*([^;]+);/g, (full, list) => {
  if (list.trim() === 'none') return full
  const parts = list.split(',').map((part) => {
    const t = part.trim()
    if (!t) return part
    const isTransform = /^(transform|translate[XY]?)\b/.test(t)
    const duration = isTransform ? 'var(--t-move)' : 'var(--t-color)'
    // t 形如 "property duration easing" 或 "property duration"
    const seg = t.split(/\s+/)
    if (seg.length >= 2 && /^(var\(|[\d.]+m?s$)/.test(seg[1])) {
      seg[1] = duration
    } else if (seg.length === 1) {
      // 只有属性名、时长继承的情况不会出现在本文件，保底跳过
      return ` ${t}`
    }
    transitionCount++
    return ` ${seg.join(' ')}`
  })
  return `transition:${parts.join(',')};`
})

writeFileSync(file, css)
console.log(`spacing snapped: ${spacingCount} values`)
console.log(`transition components remapped: ${transitionCount}`)
