// 计划日动作替换：把教练计划里的固定动作换成自己想练的。
// 只存替换名（来自我的动作库或自定义输入），原始计划数据不动。
import { readJSON, writeJSON } from './storage'

export interface PlanOverride {
  /** 替换后的动作名 */
  name: string
  /** 替换说明（选填）：为什么换、从哪个动作换过来 */
  note?: string
}

const KEY = 'planOverrides'

export function getPlanOverrides(): Record<string, PlanOverride> {
  return readJSON<Record<string, PlanOverride>>(KEY, {})
}

export function getPlanOverride(exerciseId: string): PlanOverride | null {
  return getPlanOverrides()[exerciseId] ?? null
}

export function setPlanOverride(exerciseId: string, override: PlanOverride): boolean {
  const map = getPlanOverrides()
  return writeJSON(KEY, { ...map, [exerciseId]: override })
}

export function removePlanOverride(exerciseId: string): boolean {
  const map = getPlanOverrides()
  if (!(exerciseId in map)) return true
  const next = { ...map }
  delete next[exerciseId]
  return writeJSON(KEY, next)
}
