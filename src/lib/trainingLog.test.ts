import { describe, expect, it } from 'vitest'
import type { TrainingSession } from '../types'
import {
  completeSession,
  countByDay,
  getSessions,
  getSessionsByDay,
  lastSessionOfDay,
  linkNote,
  removeSession,
} from './trainingLog'
import { todayKey } from './date'

function seed(items: TrainingSession[]): void {
  localStorage.setItem('gt.v1.trainingLog', JSON.stringify(items))
}

function makeSession(day: 'push' | 'pull', seq: number, date = todayKey()): TrainingSession {
  return {
    id: `s-test-${day}-${seq}`,
    date,
    day,
    seq,
    createdAt: new Date().toISOString(),
  }
}

describe('跟练记录数据层', () => {
  it('空态返回空数组，坏数据被过滤', () => {
    expect(getSessions()).toEqual([])

    seed([
      makeSession('push', 1),
      { id: 'bad', day: 'legs', date: todayKey(), seq: 1 } as unknown as TrainingSession,
      { id: 'bad2', day: 'push' } as unknown as TrainingSession,
    ])
    expect(getSessions()).toHaveLength(1)
    expect(getSessions()[0].day).toBe('push')
  })

  it('同一天同一 day 打卡幂等，第二次返回旧记录', () => {
    const first = completeSession('push')
    const second = completeSession('push')
    expect(second.id).toBe(first.id)
    expect(second.seq).toBe(first.seq)
    expect(getSessions()).toHaveLength(1)
  })

  it('seq 按 day 独立递增，互不串号', () => {
    seed([makeSession('push', 1, '2026-11-01'), makeSession('push', 2, '2026-11-03')])
    const thirdPush = completeSession('push')
    expect(thirdPush.seq).toBe(3)

    const firstPull = completeSession('pull')
    expect(firstPull.seq).toBe(1)
    expect(countByDay('push')).toBe(3)
    expect(countByDay('pull')).toBe(1)
  })

  it('getSessionsByDay 与 lastSessionOfDay 结果正确', () => {
    seed([
      makeSession('push', 1, '2026-11-01'),
      makeSession('pull', 1, '2026-11-02'),
      makeSession('push', 2, '2026-11-03'),
    ])
    expect(getSessionsByDay('push').map((s) => s.seq)).toEqual([1, 2])
    expect(lastSessionOfDay('push')?.seq).toBe(2)
    expect(lastSessionOfDay('pull')?.seq).toBe(1)
  })

  it('删除一条后其他记录 seq 不变', () => {
    seed([
      makeSession('push', 1, '2026-11-01'),
      makeSession('push', 2, '2026-11-03'),
      makeSession('push', 3, '2026-11-05'),
    ])
    removeSession('s-test-push-2')
    expect(getSessions().map((s) => s.seq)).toEqual([1, 3])
  })

  it('删过中间记录后新打卡序号不撞号', () => {
    // 剩 seq 1、3（中间 2 已删），下次应是 4 而不是 3
    seed([makeSession('push', 1, '2026-11-01'), makeSession('push', 3, '2026-11-05')])
    expect(completeSession('push').seq).toBe(4)
  })

  it('linkNote 回填 noteId，重复 link 覆盖', () => {
    const session = completeSession('pull')
    linkNote(session.id, 'n-first')
    expect(getSessions().find((s) => s.id === session.id)?.noteId).toBe('n-first')
    linkNote(session.id, 'n-second')
    expect(getSessions().find((s) => s.id === session.id)?.noteId).toBe('n-second')
  })

  it('缺 noteId 的旧记录归一化为 undefined', () => {
    seed([makeSession('push', 1)])
    expect(getSessions()[0].noteId).toBeUndefined()
  })
})
