import { describe, expect, it } from 'vitest'
import {
  addExerciseNote,
  deleteExerciseNote,
  getExerciseNotes,
  getNotesOfExercise,
  sortNotes,
  toggleNotePin,
  updateExerciseNote,
} from './exerciseNotes'

describe('笔记 CRUD', () => {
  it('可以写训练笔记，也可以不关联动作', () => {
    const a = addExerciseNote({
      exerciseId: 'barbell-squat',
      text: '  膝盖又内扣了  ',
    })
    expect(a?.text).toBe('膝盖又内扣了')
    expect(a?.title).toBe('')
    expect(a?.createdAt).toBe(a?.updatedAt)

    const b = addExerciseNote({ exerciseId: null, title: ' 今天休息 ', text: '' })
    expect(b?.exerciseId).toBeNull()
    expect(b?.title).toBe('今天休息')

    expect(getNotesOfExercise('barbell-squat').map((n) => n.id)).toEqual([a?.id])
    expect(getNotesOfExercise('barbell-bench')).toEqual([])
  })

  it('可以改标题、动作与内容，也可以删除', () => {
    const a = addExerciseNote({ exerciseId: null, title: '', text: '臀有感觉' })
    if (!a) throw new Error('note missing')

    updateExerciseNote(a.id, {
      exerciseId: 'barbell-squat',
      title: '深蹲',
      text: '髋部发力更顺了',
    })
    const edited = getExerciseNotes().find((n) => n.id === a.id)
    if (!edited) throw new Error('note missing')
    expect(edited.title).toBe('深蹲')
    expect(edited.exerciseId).toBe('barbell-squat')
    expect(edited.text).toBe('髋部发力更顺了')
    expect(edited.updatedAt >= a.createdAt).toBe(true)

    deleteExerciseNote(a.id)
    expect(getExerciseNotes()).toEqual([])
  })

  it('标题和正文都为空时不创建，也不能把已有笔记改空', () => {
    expect(addExerciseNote({ exerciseId: null, title: '   ', text: '  ' })).toBeNull()

    const a = addExerciseNote({ exerciseId: null, title: '', text: '有内容' })
    if (!a) throw new Error('note missing')
    updateExerciseNote(a.id, { title: ' ', text: ' ' })
    expect(getExerciseNotes()[0].text).toBe('有内容')
  })

  it('置顶笔记排在最前，且不改最近更新时间', () => {
    const older = addExerciseNote({ exerciseId: null, title: '旧', text: '先写的' })
    const newer = addExerciseNote({ exerciseId: null, title: '新', text: '后写的' })
    if (!older || !newer) throw new Error('note missing')

    toggleNotePin(older.id, true)
    const sorted = sortNotes(getExerciseNotes())
    expect(sorted[0].id).toBe(older.id)
    expect(getExerciseNotes().find((n) => n.id === older.id)?.updatedAt).toBe(older.updatedAt)
  })

  it('可以保存富文本与正文里的媒体引用', () => {
    const a = addExerciseNote({
      exerciseId: null,
      title: '',
      text: '',
      html: '<div><b>只有图片</b></div><div><img data-image-id="ni-1"></div>',
    })
    expect(a?.html).toContain('data-image-id="ni-1"')
    expect(a?.text).toBe('')

    if (!a) throw new Error('note missing')
    updateExerciseNote(a.id, {
      text: '改过的文字',
      html: '<div>改过的文字</div>',
    })
    const edited = getExerciseNotes()[0]
    expect(edited.text).toBe('改过的文字')
    expect(edited.html).toBe('<div>改过的文字</div>')
  })

  it('旧笔记没有标题/置顶时按空/未置顶读取，旧标签字段被忽略', () => {
    localStorage.setItem(
      'gt.v1.exerciseNotes',
      JSON.stringify([
        {
          id: 'n1',
          exerciseId: 'barbell-bench',
          text: '肩胛先收紧',
          tag: 'activation',
          createdAt: '2026-11-10T08:00:00.000Z',
          updatedAt: '2026-11-10T08:00:00.000Z',
        },
      ]),
    )
    const [note] = getExerciseNotes()
    expect(note.title).toBe('')
    expect(note.pinned).toBe(false)
    expect('tag' in note).toBe(false)
  })
})
