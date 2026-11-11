import { describe, expect, it } from 'vitest'
import {
  addExerciseNote,
  deleteExerciseNote,
  getExerciseNotes,
  getNotesOfExercise,
  updateExerciseNote,
} from './exerciseNotes'

describe('笔记 CRUD', () => {
  it('添加头插、文本去空格、可改标签与内容、可删除', () => {
    const a = addExerciseNote('barbell-squat', 'mistake', '  膝盖又内扣了  ')
    expect(a.text).toBe('膝盖又内扣了')
    expect(a.createdAt).toBe(a.updatedAt)

    const b = addExerciseNote('barbell-squat', null, '臀有感觉')
    expect(getNotesOfExercise('barbell-squat').map((n) => n.id)).toEqual([b.id, a.id])
    expect(getNotesOfExercise('barbell-bench')).toEqual([])

    updateExerciseNote(a.id, { tag: 'feeling', text: '髋部发力更顺了' })
    const edited = getExerciseNotes().find((n) => n.id === a.id)
    if (!edited) throw new Error('note missing')
    expect(edited.tag).toBe('feeling')
    expect(edited.text).toBe('髋部发力更顺了')
    expect(edited.updatedAt >= a.createdAt).toBe(true)

    deleteExerciseNote(b.id)
    expect(getExerciseNotes().map((n) => n.id)).toEqual([a.id])
  })
})
