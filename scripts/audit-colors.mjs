/**
 * 配色回归检查：从 src/styles.css 反读 token，按 WCAG 2.1 阈值逐项判定。
 * 用法：node scripts/audit-colors.mjs   （有 FAIL 时退出码为 1）
 */
import fs from 'fs'

const lines = fs.readFileSync('src/styles.css', 'utf8').split('\n')
const roots = []
lines.forEach((l, i) => { if (/^:root \{$/.test(l)) roots.push(i) })
const mediaStart = lines.findIndex((l) => /^@media \(prefers-color-scheme: light\)/.test(l))
const attrStart = lines.findIndex((l) => /^:root\[data-theme="light"\]/.test(l))
// data-theme 块只到它自己的闭合括号为止；后面还有组件样式，不能一并当成主题 token
const attrEnd = lines.findIndex((l, i) => i > attrStart && /^\}/.test(l))
const dark = lines.slice(roots[1], mediaStart).join('\n')
const lightMedia = lines.slice(mediaStart, attrStart).join('\n')
const lightAttr = lines.slice(attrStart, attrEnd + 1).join('\n')

const parse = (src) => { const o = {}; for (const m of src.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)) o[m[1]] = m[2].trim(); return o }
const D = parse(dark), L = parse(lightMedia), LA = parse(lightAttr)

const H = (h) => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) }
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
const Lr = (r) => 0.2126 * lin(r[0]) + 0.7152 * lin(r[1]) + 0.0722 * lin(r[2])
const cr = (a, b) => { const l1 = Lr(a), l2 = Lr(b); const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1]; return (hi + 0.05) / (lo + 0.05) }
const mix = (f, b, a) => f.map((c, i) => Math.round(c * a + b[i] * (1 - a)))
const rgbaParse = (v) => { const m = v.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map((s) => parseFloat(s.trim())); return { rgb: [p[0], p[1], p[2]], a: p[3] ?? 1 } }
let TOK = {}
const resolve = (v) => {
  v = v.trim()
  if (v.startsWith('var(')) return resolve(TOK[v.slice(4, -1).trim()] ?? '#000')
  if (v.startsWith('#')) return { rgb: H(v), a: 1 }
  return rgbaParse(v) ?? { rgb: [0, 0, 0], a: 1 }
}
const over = (c, bg) => (c.a >= 1 ? c.rgb : mix(c.rgb, bg, c.a))
/** 用 token 的前景色在指定底色上算对比度 */
const C = (name, bgHex) => {
  const bg = H(bgHex)
  return cr(over(resolve(TOK[name]), bg), bg)
}
/** alpha 叠加后的实色在底色上的对比度（用于描边/焦点环） */
const on = (name, bgHex) => {
  const bg = H(bgHex)
  return cr(over(resolve(TOK[name]), bg), bg)
}

const TEXT = 4.5
const UI = 3
let fails = 0

function report (label, T) {
  TOK = T
  const s1 = T['--surface-1'], bg = T['--bg'], s2 = T['--surface-2']
  const rows = []
  const add = (name, value, req) => rows.push([name, value, req])

  // 文字四档：正文/次文本/辅助/弱化（弱化也用于 10px 标签与 placeholder）
  for (const t of ['--text', '--text-2', '--muted', '--faint']) {
    add(`${t} / surface-1`, C(t, s1), TEXT)
    add(`${t} / bg`, C(t, bg), TEXT)
    add(`${t} / surface-2`, C(t, s2), TEXT)
  }

  // 主色：文字用法 / 实心填充上的墨色
  add('--accent-text / surface-1', C('--accent-text', s1), TEXT)
  add('--accent-text / surface-2', C('--accent-text', s2), TEXT)
  add('--accent-ink / --accent（实心按钮）', C('--accent-ink', T['--accent']), TEXT)
  add('--accent-ink / --accent-hi（渐变亮端）', C('--accent-ink', T['--accent-hi']), TEXT)

  // 语义四色 + 实心墨色
  for (const s of ['danger', 'success', 'warning', 'info']) {
    add(`--${s} / surface-1`, C(`--${s}`, s1), TEXT)
    const tint = mix(H(T[`--${s}`]), H(s1), 0.12)
    add(`--${s} / 自身 12% 底色`, cr(H(T[`--${s}`]), tint), TEXT)
  }
  add('--info-ink / --info', C('--info-ink', T['--info']), TEXT)
  add('--danger-ink / --danger', C('--danger-ink', T['--danger']), TEXT)

  // 边界：控件必须 ≥3:1，装饰线不作为失败项
  add('--line / surface-1（装饰）', on('--line', s1), 0)
  add('--line-strong / surface-1（装饰）', on('--line-strong', s1), 0)
  add('--line-ctl / surface-1（控件边框）', on('--line-ctl', s1), UI)
  add('--line-ctl-hover / surface-1', on('--line-ctl-hover', s1), UI)
  add('--accent-ring / surface-1（焦点环）', on('--accent-ring', s1), UI)
  add('--accent-ring / bg（焦点环）', on('--accent-ring', bg), UI)
  add('--accent-ring / surface-2（焦点环）', on('--accent-ring', s2), UI)

  // 纸质阅读面（独立于主题的浅底）
  add('--paper-ink / --paper-bg', C('--paper-ink', T['--paper-bg']), TEXT)
  add('--paper-title / --paper-bg', C('--paper-title', T['--paper-bg']), TEXT)
  add('--paper-meta / --paper-bg', C('--paper-meta', T['--paper-bg']), TEXT)
  add('--paper-btn / --paper-bg', C('--paper-btn', T['--paper-bg']), TEXT)

  console.log('\n===', label, '===')
  for (const [name, value, req] of rows) {
    const tag = req === 0 ? (value >= 1.4 ? 'ok-线' : '偏弱') : value >= req ? 'PASS' : 'FAIL'
    if (tag === 'FAIL') fails += 1
    console.log(value.toFixed(2).padStart(6), tag.padEnd(7), req ? `≥${req}` : '  —  ', name)
  }
}

report('深色主题', D)
report('浅色主题（媒体查询）', L)

const keys = new Set([...Object.keys(L), ...Object.keys(LA)])
const diff = [...keys].filter((k) => L[k] !== LA[k])
console.log('\n浅色两套（媒体查询 / data-theme）一致性:', diff.length ? '不一致 → ' + diff.join(', ') : '完全一致 ✓')

// 只关心颜色 token：圆角/间距/时长与刻意不随主题翻转的遮罩层不算缺失
const IGNORE = /^--(r|s\d|t|ease|scrim|on-scrim|video-bg)/
const missingInLight = Object.keys(D).filter((k) => !IGNORE.test(k) && !(k in L))
console.log('深色有、浅色缺失的颜色 token:', missingInLight.length ? missingInLight.join(', ') : '无 ✓')
console.log('\n结论:', fails === 0 ? '全部达标 ✓' : `${fails} 项未达标`)
process.exit(fails === 0 && diff.length === 0 ? 0 : 1)
