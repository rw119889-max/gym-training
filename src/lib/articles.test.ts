import { describe, expect, it } from 'vitest'
import { ARTICLES } from '../data/articles'
import { getArticleView, parseArticleBody } from './articles'
import { saveArticleOverride, clearArticleOverride } from './articleOverrides'

describe('内置底稿', () => {
  it('三个动作各有一篇，内容非空', () => {
    expect(ARTICLES.map((a) => a.exerciseId)).toEqual([
      'barbell-squat',
      'barbell-bench',
      'conventional-deadlift',
    ])
    for (const article of ARTICLES) {
      expect(article.title.length).toBeGreaterThan(0)
      expect(article.intro.length).toBeGreaterThan(0)
      expect(article.body.length).toBeGreaterThan(500)
      expect(article.body).toContain('# ')
    }
  })
})

describe('getArticleView', () => {
  it('没有改写时返回内置底稿', () => {
    const view = getArticleView('barbell-squat')
    expect(view?.overridden).toBe(false)
    expect(view?.body).toBe(ARTICLES[0].body)
  })

  it('有改写时正文换成改写版，标题不变', () => {
    saveArticleOverride('barbell-squat', '# 改写后的深蹲')
    const view = getArticleView('barbell-squat')
    expect(view?.overridden).toBe(true)
    expect(view?.body).toBe('# 改写后的深蹲')
    expect(view?.title).toBe(ARTICLES[0].title)
    clearArticleOverride('barbell-squat')
  })

  it('不存在的动作返回 null', () => {
    expect(getArticleView('no-such')).toBeNull()
  })
})

describe('parseArticleBody', () => {
  it('「# 」开头是标题，其余每行一段，空行跳过', () => {
    const blocks = parseArticleBody('# 力学\n第一段。\n\n第二段。\n# 呼吸\n第三段。')
    expect(blocks).toEqual([
      { type: 'h', text: '力学' },
      { type: 'p', text: '第一段。' },
      { type: 'p', text: '第二段。' },
      { type: 'h', text: '呼吸' },
      { type: 'p', text: '第三段。' },
    ])
  })
})
