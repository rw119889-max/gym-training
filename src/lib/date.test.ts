import { describe, expect, it } from 'vitest'
import { todayKey } from './date'

describe('todayKey', () => {
  it('把日期格式化成 YYYY-MM-DD，月和日补零', () => {
    expect(todayKey(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(todayKey(new Date(2026, 10, 11))).toBe('2026-11-11')
  })

  it('默认使用当前日期', () => {
    expect(todayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
