// 计划卡片动作编号：用户自己编辑，存本地；不再按数组顺序由系统生成。
import { readJSON, writeJSON } from './storage'

const KEY = 'planNumbers'

type NumberMap = Record<string, string>

function readAll(): NumberMap {
  const raw = readJSON<NumberMap>(KEY, {})
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
}

// 空字符串＝没编辑过（界面显示可点击的「＋ 编号」入口）
export function getPlanNumber(exerciseId: string): string {
  const value = readAll()[exerciseId]
  return typeof value === 'string' ? value : ''
}

// 空值＝清除自定义编号
export function setPlanNumber(exerciseId: string, value: string): void {
  const all = readAll()
  const next = value.trim().slice(0, 12)
  if (next) all[exerciseId] = next
  else delete all[exerciseId]
  writeJSON(KEY, all)
}
