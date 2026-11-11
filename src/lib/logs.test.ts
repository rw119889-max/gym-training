import { describe, expect, it } from 'vitest'
import {
  addSymptomLog,
  getPinnedKeys,
  getSymptomLogs,
  pinKey,
  rankSymptoms,
  togglePin,
} from './logs'
import { todayKey } from './date'

describe('addSymptomLog / getSymptomLogs', () => {
  it('记录带今天的日期，最新的排在最前', () => {
    addSymptomLog('e1', 's1')
    addSymptomLog('e1', 's2')
    const logs = getSymptomLogs()
    expect(logs).toHaveLength(2)
    expect(logs[0].symptomId).toBe('s2')
    expect(logs[0].date).toBe(todayKey())
  })

  it('最多保留 500 条', () => {
    for (let i = 0; i < 505; i += 1) addSymptomLog('e', 's')
    expect(getSymptomLogs()).toHaveLength(500)
  })
})

describe('rankSymptoms', () => {
  it('按 (动作, 症状) 计数并降序，忽略“都还好”', () => {
    addSymptomLog('e1', 's1')
    addSymptomLog('e1', 's1')
    addSymptomLog('e1', 's2')
    addSymptomLog('e2', 's1')
    addSymptomLog('e1', null)
    const ranked = rankSymptoms()
    expect(ranked[0]).toEqual({ exerciseId: 'e1', symptomId: 's1', count: 2 })
    expect(ranked).toHaveLength(3)
  })
})

describe('置顶', () => {
  it('pinKey 用冒号拼接', () => {
    expect(pinKey('e1', 's1')).toBe('e1:s1')
  })

  it('togglePin 先加入再移除', () => {
    const key = pinKey('e1', 's1')
    expect(togglePin(key)).toEqual([key])
    expect(getPinnedKeys()).toEqual([key])
    expect(togglePin(key)).toEqual([])
  })
})
