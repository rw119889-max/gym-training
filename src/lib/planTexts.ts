// 计划翻页卡的自定义文案：用户自己编写的「一句话」和三条口令，
// 按动作 id 存本地，覆盖 planBrief 里的系统预设；可删除恢复预设。
import { readJSON, writeJSON } from './storage'

const KEY = 'planCardTexts'

export interface PlanText {
  cue: string
  steps: string[]
}

type TextMap = Record<string, PlanText>

function readAll(): TextMap {
  const raw = readJSON<TextMap>(KEY, {})
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
}

// 没有自定义文案时返回 undefined，界面回落系统预设
export function getPlanText(exerciseId: string): PlanText | undefined {
  return readAll()[exerciseId]
}

export function setPlanText(exerciseId: string, text: PlanText): void {
  const all = readAll()
  all[exerciseId] = text
  writeJSON(KEY, all)
}

// 恢复系统预设：删掉该动作的自定义文案
export function removePlanText(exerciseId: string): void {
  const all = readAll()
  delete all[exerciseId]
  writeJSON(KEY, all)
}
