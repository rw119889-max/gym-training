import type { SymptomLog } from '../types'
import { readJSON, writeJSON } from './storage'
import { todayKey } from './date'

const LOG_KEY = 'symptomLogs'
const PIN_KEY = 'pinnedSymptoms'
const MAX_LOGS = 500

export interface SymptomCount {
  exerciseId: string
  symptomId: string
  count: number
}

export function pinKey(exerciseId: string, symptomId: string): string {
  return `${exerciseId}:${symptomId}`
}

export function addSymptomLog(exerciseId: string, symptomId: string | null): void {
  const logs = readJSON<SymptomLog[]>(LOG_KEY, [])
  const entry: SymptomLog = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: todayKey(),
    exerciseId,
    symptomId,
  }
  writeJSON(LOG_KEY, [entry, ...logs].slice(0, MAX_LOGS))
}

export function getSymptomLogs(): SymptomLog[] {
  return readJSON<SymptomLog[]>(LOG_KEY, [])
}

export function rankSymptoms(): SymptomCount[] {
  const counts = new Map<string, SymptomCount>()
  for (const log of getSymptomLogs()) {
    if (!log.symptomId) continue
    const key = pinKey(log.exerciseId, log.symptomId)
    const found = counts.get(key)
    if (found) {
      found.count += 1
    } else {
      counts.set(key, { exerciseId: log.exerciseId, symptomId: log.symptomId, count: 1 })
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count)
}

export function getPinnedKeys(): string[] {
  return readJSON<string[]>(PIN_KEY, [])
}

export function togglePin(key: string): string[] {
  const pins = getPinnedKeys()
  const next = pins.includes(key) ? pins.filter((k) => k !== key) : [...pins, key]
  writeJSON(PIN_KEY, next)
  return next
}
