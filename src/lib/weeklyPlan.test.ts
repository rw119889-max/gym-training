import { describe, expect, it } from 'vitest'
import type { TrainingSession } from '../types'
import {
  cycleInfo,
  ensureCycleStart,
  restartCycle,
  slotFor,
  weekDateKeys,
} from './weeklyPlan'

function session(day: 'push' | 'pull', date: string): TrainingSession {
  return { id: `s-${date}-${day}`, date, day, seq: 1, createdAt: `${date}T10:00:00.000Z` }
}

describe('固定周计划', () => {
  it('周一推、周二拉、周三休、周四休、周五推、周六拉、周日休', () => {
    expect(slotFor(1)).toBe('push')
    expect(slotFor(2)).toBe('pull')
    expect(slotFor(3)).toBe('rest')
    expect(slotFor(4)).toBe('rest')
    expect(slotFor(5)).toBe('push')
    expect(slotFor(6)).toBe('pull')
    expect(slotFor(0)).toBe('rest')
  })

  it('weekDateKeys 从周一开始、连续 7 天，今天落在对应位置', () => {
    // 2026-11-18 是周三
    const keys = weekDateKeys(new Date(2026, 10, 18))
    expect(keys).toEqual([
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
    ])
  })

  it('周日时本周是「上周一到现在这个周日」的 7 天', () => {
    const keys = weekDateKeys(new Date(2026, 10, 22))
    expect(keys[0]).toBe('2026-11-16')
    expect(keys[6]).toBe('2026-11-22')
  })
})

describe('90 天学习周期', () => {
  it('未打卡且未记录开始日期时不启动', () => {
    expect(cycleInfo([], new Date(2026, 10, 18)).started).toBe(false)
  })

  it('从开始日起算第几天/第几周与推拉次数', () => {
    ensureCycleStart(new Date(2026, 10, 1)) // 2026-11-01
    const sessions = [
      session('push', '2026-11-02'),
      session('pull', '2026-11-03'),
      session('push', '2026-11-06'),
    ]
    const info = cycleInfo(sessions, new Date(2026, 10, 18))
    expect(info.started).toBe(true)
    expect(info.start).toBe('2026-11-01')
    expect(info.dayNo).toBe(18)
    expect(info.weekNo).toBe(3)
    expect(info.pushCount).toBe(2)
    expect(info.pullCount).toBe(1)
    expect(info.nextMilestone).toBe(30)
    expect(info.daysToMilestone).toBe(12)
  })

  it('第 90 天后视为周期完成，无下一个里程碑', () => {
    ensureCycleStart(new Date(2026, 7, 20)) // 2026-08-20
    const info = cycleInfo([], new Date(2026, 10, 18))
    expect(info.finished).toBe(true)
    expect(info.nextMilestone).toBeNull()
  })

  it('没有显式开始日期时回退用最早一次打卡日', () => {
    const sessions = [session('push', '2026-11-10')]
    const info = cycleInfo(sessions, new Date(2026, 10, 18))
    expect(info.started).toBe(true)
    expect(info.start).toBe('2026-11-10')
    expect(info.dayNo).toBe(9)
  })

  it('restartCycle 把开始日期重置为今天', () => {
    expect(restartCycle(new Date(2026, 10, 18))).toBe(true)
    const info = cycleInfo([], new Date(2026, 10, 18))
    expect(info.start).toBe('2026-11-18')
    expect(info.dayNo).toBe(1)
  })
})
