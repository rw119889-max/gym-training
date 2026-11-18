import type { TrainingSession } from '../types'
import { readJSON, writeJSON } from './storage'

// 固定周计划：周一推、周二拉、周三休、周四休、周五推、周六拉、周日休。
// 只记录「是否完成跟练」，重量、容量、RPE 仍放在训记。
export type PlanSlot = 'push' | 'pull' | 'rest'

// 索引 = Date.getDay()：0=周日 … 6=周六
const SCHEDULE_BY_WEEKDAY: PlanSlot[] = ['rest', 'push', 'pull', 'rest', 'rest', 'push', 'pull']

const SLOT_LABELS: Record<PlanSlot, string> = {
  push: '推日',
  pull: '拉日',
  rest: '休息',
}

// 展示顺序固定为周一 → 周日（getDay 值：1,2,3,4,5,6,0）
export const WEEK_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

const WEEKDAY_LABELS: Record<number, string> = {
  0: '周日',
  1: '周一',
  2: '周二',
  3: '周三',
  4: '周四',
  5: '周五',
  6: '周六',
}

export function slotLabel(slot: PlanSlot): string {
  return SLOT_LABELS[slot]
}

export function weekdayLabel(weekday: number): string {
  return WEEKDAY_LABELS[weekday] ?? ''
}

export function slotFor(weekday: number): PlanSlot {
  return SCHEDULE_BY_WEEKDAY[weekday] ?? 'rest'
}

function keyOf(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

// 本周（周一起算）7 天的日期键，按周一→周日排列
export function weekDateKeys(today: Date): string[] {
  const monday = new Date(today)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return keyOf(d)
  })
}

export function diffDays(fromKey: string, toKey: string): number {
  const a = Date.parse(`${fromKey}T00:00:00Z`)
  const b = Date.parse(`${toKey}T00:00:00Z`)
  if (Number.isNaN(a) || Number.isNaN(b)) return 0
  return Math.round((b - a) / 86400000)
}

// —— 90 天学习周期 ——

const CYCLE_KEY = 'cycleStart'
const CYCLE_LENGTH = 90
const MILESTONES = [30, 60, 90]

// 第一次跟练打卡时自动记录开始日期
export function ensureCycleStart(today: Date): void {
  if (readJSON<string | null>(CYCLE_KEY, null)) return
  writeJSON(CYCLE_KEY, keyOf(today))
}

export interface CycleInfo {
  started: boolean
  start: string
  dayNo: number // 第几天，从 1 开始
  weekNo: number // 第几周，从 1 开始
  pushCount: number
  pullCount: number
  nextMilestone: number | null
  daysToMilestone: number | null
  finished: boolean
}

export function cycleInfo(sessions: TrainingSession[], today: Date): CycleInfo {
  const todayKeyStr = keyOf(today)
  const stored = readJSON<string | null>(CYCLE_KEY, null)
  const earliest = sessions.reduce<string | null>(
    (min, item) => (!min || item.date < min ? item.date : min),
    null,
  )
  const start = stored ?? earliest
  if (!start) {
    return {
      started: false,
      start: '',
      dayNo: 0,
      weekNo: 0,
      pushCount: 0,
      pullCount: 0,
      nextMilestone: null,
      daysToMilestone: null,
      finished: false,
    }
  }
  const dayNo = Math.max(1, diffDays(start, todayKeyStr) + 1)
  const nextMilestone = MILESTONES.find((m) => dayNo < m) ?? null
  return {
    started: true,
    start,
    dayNo,
    weekNo: Math.floor((dayNo - 1) / 7) + 1,
    pushCount: sessions.filter((item) => item.day === 'push').length,
    pullCount: sessions.filter((item) => item.day === 'pull').length,
    nextMilestone,
    daysToMilestone: nextMilestone === null ? null : nextMilestone - dayNo,
    finished: dayNo > CYCLE_LENGTH,
  }
}

// 90 天走完后开启下一周期：开始日期记为今天
export function restartCycle(today: Date): boolean {
  return writeJSON(CYCLE_KEY, keyOf(today))
}
