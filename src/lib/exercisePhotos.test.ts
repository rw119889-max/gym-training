import { describe, expect, it } from 'vitest'
import { addExercisePhoto, getExercisePhotos, getPhotos } from './exercisePhotos'
import type { ExercisePhoto } from '../types'

function photo(id: string, exerciseId: string): ExercisePhoto {
  return { id, exerciseId, label: id, createdAt: '' }
}

describe('照片元数据', () => {
  it('新条目头插、按动作筛选', () => {
    addExercisePhoto(photo('p1', 'barbell-squat'))
    addExercisePhoto(photo('p2', 'barbell-bench'))
    expect(getPhotos().map((p) => p.id)).toEqual(['p2', 'p1'])
    expect(getExercisePhotos('barbell-squat').map((p) => p.id)).toEqual(['p1'])
    expect(getExercisePhotos('nope')).toEqual([])
  })
})
