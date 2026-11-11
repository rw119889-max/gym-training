import type { ExerciseNote, ExerciseNoteTag } from '../types'
import { readJSON, writeJSON } from './storage'

const KEY = 'exerciseNotes'

export function getExerciseNotes(): ExerciseNote[] {
  return readJSON<ExerciseNote[]>(KEY, [])
}

export function getNotesOfExercise(exerciseId: string): ExerciseNote[] {
  return getExerciseNotes().filter((note) => note.exerciseId === exerciseId)
}

export function addExerciseNote(
  exerciseId: string,
  tag: ExerciseNoteTag | null,
  text: string,
): ExerciseNote {
  const now = new Date().toISOString()
  const note: ExerciseNote = {
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    exerciseId,
    tag,
    text: text.trim(),
    createdAt: now,
    updatedAt: now,
  }
  writeJSON(KEY, [note, ...getExerciseNotes()])
  return note
}

export function updateExerciseNote(
  id: string,
  patch: { tag: ExerciseNoteTag | null; text: string },
): void {
  writeJSON(
    KEY,
    getExerciseNotes().map((note) =>
      note.id === id
        ? { ...note, tag: patch.tag, text: patch.text.trim(), updatedAt: new Date().toISOString() }
        : note,
    ),
  )
}

export function deleteExerciseNote(id: string): void {
  writeJSON(KEY, getExerciseNotes().filter((note) => note.id !== id))
}
