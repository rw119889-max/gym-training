import type { TrainingSession } from '../types'
import { readJSON, writeJSON } from './storage'
import { todayKey } from './date'

const KEY = 'trainingLog'

type Day = TrainingSession['day']

function isDay(value: unknown): value is Day {
  return value === 'push' || value === 'pull'
}

// 白名单重建，剔除旧数据/坏数据；seq、date 缺失的条目丢弃
function normalize(item: TrainingSession): TrainingSession | null {
  if (!item || typeof item.id !== 'string' || !isDay(item.day)) return null
  if (typeof item.date !== 'string' || typeof item.seq !== 'number') return null
  return {
    id: item.id,
    date: item.date,
    day: item.day,
    seq: item.seq,
    noteId: typeof item.noteId === 'string' ? item.noteId : undefined,
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
  }
}

export function getSessions(): TrainingSession[] {
  const stored = readJSON<TrainingSession[] | null>(KEY, null)
  if (!Array.isArray(stored)) return []
  return stored.map(normalize).filter((item): item is TrainingSession => item !== null)
}

export function getSessionsByDay(day: Day): TrainingSession[] {
  return getSessions().filter((item) => item.day === day)
}

export function countByDay(day: Day): number {
  return getSessionsByDay(day).length
}

export function lastSessionOfDay(day: Day): TrainingSession | undefined {
  return getSessionsByDay(day).at(-1)
}

// 幂等：同一天同一 day 已有记录则直接返回旧记录，不重复插入
export function completeSession(day: Day): TrainingSession {
  const all = getSessions()
  const date = todayKey()
  const existing = all.find((item) => item.day === day && item.date === date)
  if (existing) return existing

  // 序号取「该 day 已有最大 seq + 1」而非条数 + 1：删过中间记录后也不会撞号
  const seq = all.reduce(
    (max, item) => (item.day === day ? Math.max(max, item.seq) : max),
    0,
  ) + 1
  const session: TrainingSession = {
    id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date,
    day,
    seq,
    createdAt: new Date().toISOString(),
  }
  writeJSON(KEY, [...all, session])
  return session
}

// 删除一条；有 noteId 的笔记保留，只删记录
export function removeSession(id: string): void {
  writeJSON(
    KEY,
    getSessions().filter((item) => item.id !== id),
  )
}

// 把心得笔记 id 回填到某次打卡；返回是否写入成功
export function linkNote(sessionId: string, noteId: string): boolean {
  return writeJSON(
    KEY,
    getSessions().map((item) => (item.id === sessionId ? { ...item, noteId } : item)),
  )
}
