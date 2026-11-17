import type { ArticleBlock, SavedArticle } from '../types'
import { readJSON, writeJSON } from './storage'

const KEY = 'savedArticles'

export function getSavedArticles(): SavedArticle[] {
  return readJSON<SavedArticle[]>(KEY, [])
}

export function getSavedArticlesOfExercise(exerciseId: string): SavedArticle[] {
  return getSavedArticles().filter((item) => item.exerciseId === exerciseId)
}

export function addSavedArticle(
  exerciseId: string,
  title: string,
  body: string,
  blocks?: ArticleBlock[],
): SavedArticle | null {
  const trimmedTitle = title.trim()
  const trimmedBody = body.trim()
  const hasImage = blocks?.some((block) => block.type === 'image') ?? false
  if (!trimmedTitle || (!trimmedBody && !hasImage)) return null
  const now = new Date().toISOString()
  const item: SavedArticle = {
    id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    exerciseId,
    title: trimmedTitle,
    body: trimmedBody,
    createdAt: now,
    updatedAt: now,
  }
  if (blocks) item.blocks = blocks
  writeJSON(KEY, [item, ...getSavedArticles()])
  return item
}

export function updateSavedArticle(
  id: string,
  title: string,
  body: string,
  blocks?: ArticleBlock[],
): void {
  const trimmedTitle = title.trim()
  const trimmedBody = body.trim()
  const hasImage = blocks?.some((block) => block.type === 'image') ?? false
  if (!trimmedTitle || (!trimmedBody && !hasImage)) return
  writeJSON(
    KEY,
    getSavedArticles().map((item) => {
      if (item.id !== id) return item
      const next: SavedArticle = {
        ...item,
        title: trimmedTitle,
        body: trimmedBody,
        updatedAt: new Date().toISOString(),
      }
      if (blocks) next.blocks = blocks
      return next
    }),
  )
}

export function deleteSavedArticle(id: string): void {
  writeJSON(
    KEY,
    getSavedArticles().filter((item) => item.id !== id),
  )
}
