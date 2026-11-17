import type { ExercisePhoto } from '../types'
import { deleteImage, readJSON, writeJSON } from './storage'

const KEY = 'exercisePhotos'

export function getPhotos(): ExercisePhoto[] {
  return readJSON<ExercisePhoto[]>(KEY, [])
}

export function getExercisePhotos(exerciseId: string): ExercisePhoto[] {
  return getPhotos().filter((photo) => photo.exerciseId === exerciseId)
}

export function addExercisePhoto(photo: ExercisePhoto): void {
  writeJSON(KEY, [photo, ...getPhotos()])
}

export function updateExercisePhotoLabel(id: string, label: string): void {
  writeJSON(
    KEY,
    getPhotos().map((photo) => (photo.id === id ? { ...photo, label: label.trim() } : photo)),
  )
}

export async function deleteExercisePhoto(id: string): Promise<void> {
  writeJSON(KEY, getPhotos().filter((photo) => photo.id !== id))
  await deleteImage(id)
}
