import { CARDS } from '../data/cards'
import type { CardProgress, KnowledgeCard } from '../types'
import { readJSON, writeJSON } from './storage'

const KEY = 'cardProgress'
const INTERVALS = [1, 3, 7, 14, 30]

export function todayKey(date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function addDays(key: string, days: number): string {
  const [year, month, day] = key.split('-').map(Number)
  return todayKey(new Date(year, month - 1, day + days))
}

export function dueDate(entry: CardProgress): string {
  const index = Math.min(Math.max(entry.stage - 1, 0), INTERVALS.length - 1)
  return addDays(entry.lastUsed, INTERVALS[index])
}

export function formatDateLabel(key: string): string {
  const [, month, day] = key.split('-').map(Number)
  return `${month} 月 ${day} 日`
}

export function loadProgress(): CardProgress[] {
  return readJSON<CardProgress[]>(KEY, [])
}

export function saveProgress(progress: CardProgress[]): void {
  writeJSON(KEY, progress)
}

export function pickDueCard(progress: CardProgress[], today = todayKey()): KnowledgeCard | null {
  const map = new Map(progress.map((entry) => [entry.cardId, entry]))
  const reviews = CARDS.filter((card) => {
    const entry = map.get(card.id)
    return entry !== undefined && dueDate(entry) <= today
  }).sort((a, b) => {
    const left = map.get(a.id)
    const right = map.get(b.id)
    return dueDate(left!).localeCompare(dueDate(right!))
  })
  if (reviews.length > 0) return reviews[0]
  return CARDS.find((card) => !map.has(card.id)) ?? null
}

export function completeCard(
  progress: CardProgress[],
  cardId: string,
  exerciseId: string | null,
): CardProgress[] {
  const existing = progress.find((entry) => entry.cardId === cardId)
  const entry: CardProgress = {
    cardId,
    stage: (existing?.stage ?? 0) + 1,
    lastUsed: todayKey(),
    usedCount: (existing?.usedCount ?? 0) + (exerciseId ? 1 : 0),
  }
  return [entry, ...progress.filter((item) => item.cardId !== cardId)]
}

export function earliestDue(progress: CardProgress[]): string | null {
  if (progress.length === 0) return null
  return progress.map(dueDate).sort()[0]
}
