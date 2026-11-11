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
  it('内置 25 个动作，覆盖三大类', () => {
    const list = getExercises()
    expect(list).toHaveLength(25)
    expect(list.map((e) => e.name)).toEqual([
      '杠铃深蹲',
      '腿举',
      '传统硬拉',
      '坐姿腿屈伸',
      '腿弯举',
      '抬腿',
      '站姿自重提踵',
      '杠铃卧推',
      '上斜杠铃卧推',
      '悍马机坐姿推举',
      '器械侧平举',
      '蝴蝶机反向飞鸟',
      '悍马机三头下压',
      '躺卧器械平板卧推',
      '伸缩臂屈伸',
      '引体向上',
      '宽距高位下拉',
      '坐姿划船',
      '悍马机划船',
      '面拉',
      '器械弯举',
      '哑铃锤式弯举',
      '杠杆式坐姿划船',
      'EZ杆二头弯举',
      '分动式高位划船',
    ])
    expect(list.filter((e) => e.group === 'legs')).toHaveLength(7)
    expect(list.filter((e) => e.group === 'chest')).toHaveLength(8)
    expect(list.filter((e) => e.group === 'back')).toHaveLength(10)
  })

  it('把旧版分组迁移到腿臀腹 / 胸肩三头 / 背二头后束', () => {
    localStorage.setItem(
      'gt.v1.customExercises',
      JSON.stringify([
        { id: 'x-old-squat', name: '旧深蹲', group: 'squat' },
        { id: 'x-old-hinge', name: '旧铰链', group: 'hinge' },
        { id: 'x-old-push', name: '旧推', group: 'push' },
      ]),
    )
    expect(findExercise('x-old-squat')?.group).toBe('legs')
    expect(findExercise('x-old-hinge')?.group).toBe('legs')
    expect(findExercise('x-old-push')?.group).toBe('chest')
  })
})

describe('自定义动作', () => {
  it('添加后可查、标记为自定义、可删除', () => {
    const created = addExercise({ name: ' 杠铃划船 ', group: 'back' })
    expect(created.id.startsWith('x-')).toBe(true)
    expect(created.name).toBe('杠铃划船')
    expect(getExercises()).toHaveLength(26)
    expect(isCustomExercise(created.id)).toBe(true)
    expect(findExercise(created.id)?.group).toBe('back')

    expect(deleteExercise(created.id)).toBe(true)
    expect(getExercises()).toHaveLength(25)
  })

  it('不选类型时默认放进腿臀腹', () => {
    const created = addExercise({ name: '新动作' })
    expect(created.group).toBe('legs')
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
