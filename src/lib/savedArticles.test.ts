import { describe, expect, it } from 'vitest'
import {
  addSavedArticle,
  deleteSavedArticle,
  getSavedArticlesOfExercise,
  updateSavedArticle,
} from './savedArticles'

describe('收藏文章', () => {
  it('标题和正文都填才收藏，按动作筛选', () => {
    const a = addSavedArticle('barbell-bench', '  卧推肩痛怎么办 ', ' 正文第一段 ')
    addSavedArticle('barbell-bench', '', '只有正文')
    addSavedArticle('squat', '深蹲', '正文')

    expect(a?.title).toBe('卧推肩痛怎么办')
    expect(a?.body).toBe('正文第一段')
    expect(getSavedArticlesOfExercise('barbell-bench')).toHaveLength(1)
    expect(getSavedArticlesOfExercise('squat')).toHaveLength(1)
  })

  it('可改可删', () => {
    const item = addSavedArticle('barbell-bench', '旧标题', '旧正文')
    if (!item) throw new Error('article missing')
    updateSavedArticle(item.id, '新标题', '新正文')
    const updated = getSavedArticlesOfExercise('barbell-bench')[0]
    expect(updated.title).toBe('新标题')
    expect(updated.body).toBe('新正文')

    deleteSavedArticle(item.id)
    expect(getSavedArticlesOfExercise('barbell-bench')).toEqual([])
  })
})
