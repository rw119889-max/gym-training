import { describe, expect, it } from 'vitest'
import {
  clearArticleOverride,
  getArticleOverride,
  saveArticleOverride,
} from './articleOverrides'

describe('文章改写覆盖层', () => {
  it('保存后能读回，动作之间互不影响', () => {
    expect(getArticleOverride('barbell-squat')).toBeNull()
    saveArticleOverride('barbell-squat', '# 我自己的版本')
    saveArticleOverride('barbell-bench', '# 卧推也改一篇')
    expect(getArticleOverride('barbell-squat')).toBe('# 我自己的版本')
    expect(getArticleOverride('barbell-bench')).toBe('# 卧推也改一篇')
    expect(getArticleOverride('conventional-deadlift')).toBeNull()
  })

  it('清掉一篇不影响其他篇', () => {
    saveArticleOverride('barbell-squat', '# 我自己的版本')
    saveArticleOverride('barbell-bench', '# 卧推也改一篇')
    clearArticleOverride('barbell-squat')
    expect(getArticleOverride('barbell-squat')).toBeNull()
    expect(getArticleOverride('barbell-bench')).toBe('# 卧推也改一篇')
    clearArticleOverride('barbell-bench')
    expect(getArticleOverride('barbell-bench')).toBeNull()
  })
})
