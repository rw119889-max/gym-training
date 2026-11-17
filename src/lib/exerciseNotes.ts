import type { ExerciseNote } from '../types'
import { readJSON, writeJSON } from './storage'
import { hasNoteMedia } from './noteMedia'

const KEY = 'exerciseNotes'

export interface NoteInput {
  exerciseId: string | null
  title?: string
  text: string
  html?: string
  pinned?: boolean
}

export interface NotePatch {
  exerciseId?: string | null
  title?: string
  text?: string
  html?: string
  pinned?: boolean
}

export function getExerciseNotes(): ExerciseNote[] {
  return readJSON<ExerciseNote[]>(KEY, []).map((note) => ({
    id: note.id,
    exerciseId: note.exerciseId ?? null,
    title: typeof note.title === 'string' ? note.title : '',
    text: note.text,
    html: typeof note.html === 'string' ? note.html : undefined,
    pinned: note.pinned === true,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }))
}

export function getNotesOfExercise(exerciseId: string): ExerciseNote[] {
  return getExerciseNotes().filter((note) => note.exerciseId === exerciseId)
}

// 置顶在前，其余按最近更新排；时间相同按创建时间兜底
export function sortNotes(notes: ExerciseNote[]): ExerciseNote[] {
  return [...notes].sort((a, b) => {
    const pinA = a.pinned ? 1 : 0
    const pinB = b.pinned ? 1 : 0
    if (pinA !== pinB) return pinB - pinA
    if (a.updatedAt !== b.updatedAt) return a.updatedAt < b.updatedAt ? 1 : -1
    return a.createdAt < b.createdAt ? 1 : -1
  })
}

export function addExerciseNote(input: NoteInput): ExerciseNote | null {
  const title = (input.title ?? '').trim()
  const text = input.text.trim()
  if (!title && !text && !hasNoteMedia(input.html)) return null

  const now = new Date().toISOString()
  const note: ExerciseNote = {
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    exerciseId: input.exerciseId,
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
        exerciseId: patch.exerciseId === undefined ? note.exerciseId : patch.exerciseId,
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
