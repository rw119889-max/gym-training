import { describe, expect, it } from 'vitest'
import {
  addExercise,
  deleteExercise,
  findExercise,
  getExercises,
  getRecentExerciseIds,
  isCustomExercise,
  markRecentExercise,
  updateExercise,
} from './exercises'

describe('getExercises', () => {
  it('默认只有 3 个内置动作', () => {
    const list = getExercises()
    expect(list).toHaveLength(3)
    expect(list.map((e) => e.name)).toEqual(['杠铃深蹲', '硬拉', '杠铃卧推'])
  })
})

describe('自定义动作', () => {
  it('添加后可查、标记为自定义、可删除', () => {
    const created = addExercise({ name: ' 杠铃划船 ', group: 'hinge' })
    expect(created.id.startsWith('x-')).toBe(true)
    expect(created.name).toBe('杠铃划船')
    expect(getExercises()).toHaveLength(4)
    expect(isCustomExercise(created.id)).toBe(true)
    expect(findExercise(created.id)?.group).toBe('hinge')

    expect(deleteExercise(created.id)).toBe(true)
    expect(getExercises()).toHaveLength(3)
  })

  it('删除内置动作返回 false', () => {
    expect(deleteExercise('barbell-squat')).toBe(false)
  })

  it('可以改自定义动作的名称和提示', () => {
    const created = addExercise({ name: '划船' })
    updateExercise(created.id, { name: '划船X', cue: '贴身上拉' })
    expect(findExercise(created.id)?.name).toBe('划船X')
    expect(findExercise(created.id)?.cue).toBe('贴身上拉')
  })
})

describe('内置动作改名', () => {
  it('改名生效，改回原名后不留残余覆盖', () => {
    updateExercise('barbell-squat', { name: '深蹲改' })
    expect(findExercise('barbell-squat')?.name).toBe('深蹲改')

    updateExercise('barbell-squat', { name: '杠铃深蹲' })
    expect(findExercise('barbell-squat')?.name).toBe('杠铃深蹲')
  })
})

describe('markRecentExercise', () => {
  it('去重、最新在前、最多保留 5 个', () => {
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f']) markRecentExercise(id)
    expect(getRecentExerciseIds()).toEqual(['f', 'e', 'd', 'c', 'b'])

    markRecentExercise('d')
    expect(getRecentExerciseIds()).toEqual(['d', 'f', 'e', 'c', 'b'])
  })
})
