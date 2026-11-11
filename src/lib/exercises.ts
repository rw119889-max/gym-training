import { EXERCISES } from '../data/exercises'
import type { Exercise } from '../types'

export function getExercises(): Exercise[] {
  return EXERCISES
}

export function findExercise(id: string): Exercise | undefined {
  return EXERCISES.find((exercise) => exercise.id === id)
}

export function exerciseName(id: string): string {
  return findExercise(id)?.name ?? '已删除的动作'
}
