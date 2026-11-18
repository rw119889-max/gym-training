import type { ExerciseCategory, ExerciseProfile } from '../types'
import { readJSON, writeJSON } from './storage'

const KEY = 'exerciseProfiles'

export const EXERCISE_CATEGORIES: { id: ExerciseCategory; label: string; en: string }[] = [
  { id: 'push', label: '推', en: 'PUSH' },
  { id: 'pull', label: '拉', en: 'PULL' },
  { id: 'legs', label: '腿', en: 'LEGS' },
]

// 首页与新增/编辑只开放推、拉；腿类别仍保留在数据里，旧动作与备份不受影响
export const PICKABLE_CATEGORIES = EXERCISE_CATEGORIES.filter((item) => item.id !== 'legs')

// 先把杠铃卧推做透；后续动作从页面里自己加
const SEED: ExerciseProfile[] = [
  {
    id: 'barbell-bench',
    name: '杠铃卧推',
    category: 'push',
    createdAt: '2026-11-11T00:00:00.000Z',
  },
]

const UNASSIGNED_LABEL = '未分类'

export function isExerciseCategory(value: unknown): value is ExerciseCategory {
  return value === 'push' || value === 'pull' || value === 'legs'
}

export function categoryLabel(category: ExerciseCategory | undefined): string {
  return EXERCISE_CATEGORIES.find((item) => item.id === category)?.label ?? UNASSIGNED_LABEL
}

// 旧版档案没有类别：卧推本来就是推，其余先放「未分类」等用户自己归类
function normalize(item: ExerciseProfile): ExerciseProfile {
  if (isExerciseCategory(item.category)) return item
  if (item.id === 'barbell-bench') return { ...item, category: 'push' }
  return { ...item, category: undefined }
}

export function getExerciseProfiles(): ExerciseProfile[] {
  const stored = readJSON<ExerciseProfile[] | null>(KEY, null)
  return stored && stored.length > 0 ? stored.map(normalize) : SEED
}

export function findExerciseProfile(id: string): ExerciseProfile | undefined {
  return getExerciseProfiles().find((item) => item.id === id)
}

export function addExerciseProfile(
  name: string,
  category: ExerciseCategory,
): ExerciseProfile | null {
  const trimmed = name.trim()
  if (!trimmed) return null
  const item: ExerciseProfile = {
    id: `ex-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: trimmed,
    category,
    createdAt: new Date().toISOString(),
  }
  writeJSON(KEY, [...getExerciseProfiles(), item])
  return item
}

export function updateExerciseProfile(
  id: string,
  patch: { name?: string; category?: ExerciseCategory },
): ExerciseProfile | null {
  const list = getExerciseProfiles()
  const current = list.find((item) => item.id === id)
  if (!current) return null
  const name = patch.name === undefined ? current.name : patch.name.trim()
  if (!name) return null

  const updated: ExerciseProfile = {
    ...current,
    name,
    category: patch.category ?? current.category,
  }
  writeJSON(
    KEY,
    list.map((item) => (item.id === id ? updated : item)),
  )
  return updated
}

export function exerciseProfileName(id: string): string {
  return findExerciseProfile(id)?.name ?? '已删除的动作'
}