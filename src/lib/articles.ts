import { ARTICLES } from '../data/articles'
import { getArticleOverride } from './articleOverrides'

export interface ArticleView {
  title: string
  intro: string
  body: string
  overridden: boolean
}

export function getArticleView(exerciseId: string): ArticleView | null {
  const article = ARTICLES.find((item) => item.exerciseId === exerciseId)
  if (!article) return null
  const override = getArticleOverride(exerciseId)
  if (override === null) {
    return { title: article.title, intro: article.intro, body: article.body, overridden: false }
  }
  return { title: article.title, intro: article.intro, body: override, overridden: true }
}

// 正文写法约定：以「# 」开头的一行是标题，其余每行一段
export type ArticleBlock = { type: 'h' | 'p'; text: string }

export function parseArticleBody(body: string): ArticleBlock[] {
  const blocks: ArticleBlock[] = []
  for (const line of body.split('\n')) {
    const text = line.trim()
    if (!text) continue
    if (text.startsWith('# ')) {
      blocks.push({ type: 'h', text: text.slice(2) })
    } else {
      blocks.push({ type: 'p', text })
    }
  }
  return blocks
}
