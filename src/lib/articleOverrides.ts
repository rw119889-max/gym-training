import { readJSON, writeJSON } from './storage'

const KEY = 'articleOverrides'

// 一篇文章的整篇改写，key 是 exerciseId；随 JSON 备份保存
export function getArticleOverrides(): Record<string, string> {
  return readJSON<Record<string, string>>(KEY, {})
}

export function getArticleOverride(exerciseId: string): string | null {
  return getArticleOverrides()[exerciseId] ?? null
}

export function saveArticleOverride(exerciseId: string, body: string): void {
  writeJSON(KEY, { ...getArticleOverrides(), [exerciseId]: body })
}

export function clearArticleOverride(exerciseId: string): void {
  const next = { ...getArticleOverrides() }
  delete next[exerciseId]
  writeJSON(KEY, next)
}
