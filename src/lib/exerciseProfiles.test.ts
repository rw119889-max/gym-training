import { describe, expect, it } from 'vitest'
import {
  addExerciseProfile,
  categoryLabel,
  exerciseProfileName,
  getExerciseProfiles,
  updateExerciseProfile,
} from './exerciseProfiles'

describe('动作档案', () => {
  it('首次使用只有杠铃卧推，归在推', () => {
    const list = getExerciseProfiles()
    expect(list).toHaveLength(1)
    expect(list[0].name).toBe('杠铃卧推')
    expect(list[0].id).toBe('barbell-bench')
    expect(list[0].category).toBe('push')
  })

  it('可以自己加动作，名称去空格并追加在后', () => {
    const added = addExerciseProfile('  杠铃深蹲 ', 'legs')
    expect(added?.name).toBe('杠铃深蹲')
    expect(added?.category).toBe('legs')
    expect(getExerciseProfiles().map((item) => item.name)).toEqual(['杠铃卧推', '杠铃深蹲'])
    expect(exerciseProfileName(added?.id ?? '')).toBe('杠铃深蹲')
  })

  it('可以改名字和类别', () => {
    const added = addExerciseProfile('引体向上', 'push')
    const updated = updateExerciseProfile(added?.id ?? '', {
      name: '  高位下拉 ',
      category: 'pull',
    })
    expect(updated?.name).toBe('高位下拉')
    expect(updated?.category).toBe('pull')
    const stored = getExerciseProfiles().find((item) => item.id === added?.id)
    expect(stored?.name).toBe('高位下拉')
    expect(stored?.category).toBe('pull')
  })

  it('旧数据里没有类别的卧推自动归到推，其余留在未分类', () => {
    localStorage.setItem(
      'gt.v1.exerciseProfiles',
      JSON.stringify([
        { id: 'barbell-bench', name: '杠铃卧推', createdAt: '2026-11-11T00:00:00.000Z' },
        { id: 'ex-old', name: '杠铃深蹲', createdAt: '2026-11-11T00:00:00.000Z' },
      ]),
    )
    const list = getExerciseProfiles()
    expect(list[0].category).toBe('push')
    expect(list[1].category).toBeUndefined()
    expect(categoryLabel(list[1].category)).toBe('未分类')
  })

  it('空名字不创建，也不能把名字改空', () => {
    expect(addExerciseProfile('   ', 'push')).toBeNull()
    expect(getExerciseProfiles()).toHaveLength(1)
    const bench = getExerciseProfiles()[0]
    expect(updateExerciseProfile(bench.id, { name: ' ' })).toBeNull()
    expect(getExerciseProfiles()[0].name).toBe('杠铃卧推')
  })
})
