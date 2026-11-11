import { describe, expect, it } from 'vitest'
import { exerciseName, findExercise, getExercises } from './exercises'

describe('getExercises', () => {
  it('只内置 3 个动作，顺序为深蹲 → 卧推 → 硬拉', () => {
    const list = getExercises()
    expect(list.map((e) => e.id)).toEqual([
      'barbell-squat',
      'barbell-bench',
      'conventional-deadlift',
    ])
    expect(list.map((e) => e.name)).toEqual(['杠铃深蹲', '杠铃卧推', '传统硬拉'])
  })

  it('每个动作都有 3 项组前检查、4 个症状 chip 和常见错误', () => {
    for (const exercise of getExercises()) {
      expect(exercise.preChecks).toHaveLength(3)
      expect(exercise.symptoms).toHaveLength(4)
      expect(exercise.commonMistakes.length).toBeGreaterThan(0)
      expect(exercise.safetyNotes.length).toBeGreaterThan(0)
    }
  })
})

describe('findExercise / exerciseName', () => {
  it('能查到内置动作，未知 id 给占位名', () => {
    expect(findExercise('barbell-squat')?.name).toBe('杠铃深蹲')
    expect(findExercise('nope')).toBeUndefined()
    expect(exerciseName('nope')).toBe('已删除的动作')
  })
})
