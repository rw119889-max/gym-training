import { readJSON, removeKey, writeJSON } from './storage'
import { todayKey } from './cards'

export type CardPhase = 'pre' | 'during' | 'post' | 'rest'

export interface CardSession {
  exerciseId: string
  date: string
  phase: CardPhase
  setNo: number
  cue: string
  checks: boolean[]
  chosenSymptomId: string | null
}

const KEY = 'cardSession'

export function loadSession(): CardSession | null {
  const session = readJSON<CardSession | null>(KEY, null)
  if (!session) return null
  if (session.date !== todayKey()) {
    removeKey(KEY)
    return null
  }
  return session
}

export function saveSession(session: CardSession): void {
  writeJSON(KEY, session)
}

export function clearSession(): void {
  removeKey(KEY)
}
