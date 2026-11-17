import type { ExerciseNote } from '../types'
import { readJSON, writeJSON } from './storage'
import { hasNoteMedia } from './noteMedia'

const KEY = 'exerciseNotes'

export interface NoteInput {
  title?: string
  text: string
  html?: string
  pinned?: boolean
}

export interface NotePatch {
  title?: string
  text?: string
  html?: string
  pinned?: boolean
}

export function getExerciseNotes(): ExerciseNote[] {
  return readJSON<ExerciseNote[]>(KEY, []).map((note) => ({
    id: note.id,
    title: typeof note.title === 'string' ? note.title : '',
    text: note.text,
    html: typeof note.html === 'string' ? note.html : undefined,
    pinned: note.pinned === true,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }))
}

// 置顶在前，其余按所选模式排；时间相同按创建时间兜底
export type NoteSort = 'updated-desc' | 'created-desc' | 'created-asc' | 'title'

export const NOTE_SORTS: NoteSort[] = ['updated-desc', 'created-desc', 'created-asc', 'title']

export function sortNotes(notes: ExerciseNote[], sort: NoteSort = 'updated-desc'): ExerciseNote[] {
  const byMode = (a: ExerciseNote, b: ExerciseNote): number => {
    switch (sort) {
      case 'created-desc':
        return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0
      case 'created-asc':
        return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
      case 'title': {
        const ta = (a.title ?? '').trim() || a.text.trim().split('\n')[0].trim()
        const tb = (b.title ?? '').trim() || b.text.trim().split('\n')[0].trim()
        return ta.localeCompare(tb, 'zh-Hans-CN')
      }
      default:
        return a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0
    }
  }
  return [...notes].sort((a, b) => {
    const pinA = a.pinned ? 1 : 0
    const pinB = b.pinned ? 1 : 0
    if (pinA !== pinB) return pinB - pinA
    const order = byMode(a, b)
    if (order !== 0) return order
    return a.createdAt < b.createdAt ? 1 : -1
  })
}

// 'pinned' 只看置顶；其余值一律全部
export function filterNotes(notes: ExerciseNote[], filter: string): ExerciseNote[] {
  if (filter === 'pinned') return notes.filter((note) => note.pinned === true)
  return notes
}

export function addExerciseNote(input: NoteInput): ExerciseNote | null {
  const title = (input.title ?? '').trim()
  const text = input.text.trim()
  if (!title && !text && !hasNoteMedia(input.html)) return null

  const now = new Date().toISOString()
  const note: ExerciseNote = {
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    text,
    html: input.html,
    pinned: input.pinned === true,
    createdAt: now,
    updatedAt: now,
  }
  writeJSON(KEY, [note, ...getExerciseNotes()])
  return note
}

export function updateExerciseNote(id: string, patch: NotePatch): void {
  const now = new Date().toISOString()
  writeJSON(
    KEY,
    getExerciseNotes().map((note) => {
      if (note.id !== id) return note
      const title = patch.title === undefined ? (note.title ?? '') : patch.title.trim()
      const text = patch.text === undefined ? note.text : patch.text.trim()
      const html = patch.html === undefined ? note.html : patch.html
      if (!title && !text && !hasNoteMedia(html)) return note
      return {
        ...note,
        title,
        text,
        html,
        pinned: patch.pinned === undefined ? note.pinned === true : patch.pinned,
        updatedAt: now,
      }
    }),
  )
}

// 置顶只改排序，不刷新「最近更新」时间
export function toggleNotePin(id: string, pinned: boolean): void {
  writeJSON(
    KEY,
    getExerciseNotes().map((note) => (note.id === id ? { ...note, pinned } : note)),
  )
}

export function deleteExerciseNote(id: string): void {
  writeJSON(KEY, getExerciseNotes().filter((note) => note.id !== id))
}
