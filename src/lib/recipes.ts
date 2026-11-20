import type { CookMode, MealSlot, Recipe } from '../types'
import { readJSON, writeJSON } from './storage'
import { deleteVideoClip, getVideos } from './videos'

const KEY = 'recipes'

export const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'pre', 'post', 'snack']

export const MEAL_LABELS: Record<MealSlot, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  pre: '练前餐',
  post: '练后餐',
  snack: '加餐',
}

export const COOK_MODES: CookMode[] = ['airfryer', 'pan', 'ricecooker', 'steam', 'boil']

export const COOK_MODE_LABELS: Record<CookMode, string> = {
  airfryer: '空气炸锅',
  pan: '平底锅',
  ricecooker: '电饭锅',
  steam: '清蒸',
  boil: '水煮',
}

const MODE_IDS = new Set<string>(COOK_MODES)

// 白名单归一：脏数据/旧值一律去掉 mode，回落「不限」
function normalizeMode(value: unknown): CookMode | undefined {
  return typeof value === 'string' && MODE_IDS.has(value) ? (value as CookMode) : undefined
}

// 旧数据只有 imageId 单图、没有 notes；读取时补齐，并把单图迁移成 imageIds 数组
function normalizeRecipe(raw: Recipe): Recipe {
  const { imageId, ...rest } = raw as Recipe & { imageId?: string | null }
  return {
    ...rest,
    meal: rest.meal ?? 'lunch',
    mode: normalizeMode(rest.mode),
    cookMinutes: rest.cookMinutes ?? 15,
    spicy: rest.spicy ?? false,
    oilGrams: rest.oilGrams ?? 10,
    saltGrams: rest.saltGrams ?? 3,
    imageIds: rest.imageIds ?? (imageId ? [imageId] : []),
    notes: rest.notes ?? '',
    price: rest.price ?? 0,
    cookedDates: Array.isArray(rest.cookedDates)
      ? rest.cookedDates.filter((item): item is string => typeof item === 'string')
      : [],
    favorite: rest.favorite === true,
  }
}

export function formatPrice(price: number): string {
  if (!(price > 0)) return '未标价'
  return `¥${Math.round(price * 100) / 100}`
}

export function getRecipes(): Recipe[] {
  return readJSON<Recipe[]>(KEY, []).map(normalizeRecipe)
}

export function getRecipe(id: string): Recipe | undefined {
  return getRecipes().find((recipe) => recipe.id === id)
}

// 返回是否写入成功；false = 存储失败，上层须保持编辑态
export function saveRecipe(recipe: Recipe): boolean {
  const list = getRecipes()
  const index = list.findIndex((item) => item.id === recipe.id)
  if (index >= 0) {
    list[index] = recipe
  } else {
    list.unshift(recipe)
  }
  return writeJSON(KEY, list)
}

export function deleteRecipe(id: string): void {
  writeJSON(
    KEY,
    getRecipes().filter((recipe) => recipe.id !== id),
  )
  // 顺带清掉菜谱绑定的视频（recipe:<id> 归属），避免孤儿文件
  for (const clip of getVideos().filter((video) => video.exerciseId === `recipe:${id}`)) {
    void deleteVideoClip(clip.id)
  }
}

export function newRecipe(): Recipe {
  const now = new Date().toISOString()
  return {
    id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    meal: 'lunch',
    method: '',
    imageIds: [],
    notes: '',
    ingredients: [],
    cookMinutes: 15,
    spicy: false,
    oilGrams: 10,
    saltGrams: 3,
    price: 0,
    cookedDates: [],
    favorite: false,
    createdAt: now,
    updatedAt: now,
  }
}

// 复制菜谱：新 id、新食材行 id，图片引用原样共享（图片本体还在图库里），
// 做过记录与收藏不带走。复制完直接进编辑器改名/换餐次。
export function duplicateRecipe(id: string): Recipe | null {
  const src = getRecipe(id)
  if (!src) return null
  const now = new Date().toISOString()
  const copy: Recipe = {
    ...src,
    id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: `${src.name}（副本）`,
    imageIds: [...src.imageIds],
    ingredients: src.ingredients.map((item) => ({
      ...item,
      id: `i-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 4)}`,
    })),
    cookedDates: [],
    favorite: false,
    createdAt: now,
    updatedAt: now,
  }
  return writeJSON(KEY, [copy, ...getRecipes()]) ? copy : null
}

// 记录「今天实际做了一次」；同一天重复点只记一次，最多保留最近 60 条
export function markCookedToday(id: string, today: string): boolean {
  return writeJSON(
    KEY,
    getRecipes().map((recipe) => {
      if (recipe.id !== id) return recipe
      // 按日期排序后再截断，避免回填旧日期时把最近的记录挤掉
      const cooked = [...(recipe.cookedDates ?? []).filter((item) => item !== today), today]
        .sort()
        .slice(-60)
      return { ...recipe, cookedDates: cooked, updatedAt: recipe.updatedAt }
    }),
  )
}

export function toggleFavorite(id: string): boolean {
  return writeJSON(
    KEY,
    getRecipes().map((recipe) =>
      recipe.id === id ? { ...recipe, favorite: recipe.favorite !== true } : recipe,
    ),
  )
}

// 排序：最近创建（新建在前）/ 最近做过（没做过的按更新时间垫底）/ 收藏优先
// 原 'default' 一档更名为 'created'，读取旧持久化值时映射
export type RecipeSort = 'created' | 'cooked' | 'favorite'

export function normalizeRecipeSort(value: string | null): RecipeSort {
  if (value === 'cooked' || value === 'favorite' || value === 'created') return value
  return 'created'
}

export function sortRecipes(recipes: Recipe[], mode: RecipeSort): Recipe[] {
  const lastCooked = (recipe: Recipe): string =>
    recipe.cookedDates?.[recipe.cookedDates.length - 1] ?? ''
  const list = [...recipes]
  if (mode === 'cooked') {
    return list.sort((a, b) => {
      const la = lastCooked(a)
      const lb = lastCooked(b)
      if (la && lb && la !== lb) return la < lb ? 1 : -1
      if (la !== lb) return la ? -1 : 1
      return a.updatedAt < b.updatedAt ? 1 : -1
    })
  }
  if (mode === 'favorite') {
    return list.sort((a, b) => {
      const fa = a.favorite ? 1 : 0
      const fb = b.favorite ? 1 : 0
      if (fa !== fb) return fb - fa
      return a.updatedAt < b.updatedAt ? 1 : -1
    })
  }
  // created：按创建时间倒序（新的在前），不依赖存储/导入顺序
  return list.sort((a, b) => {
    const ca = a.createdAt ?? ''
    const cb = b.createdAt ?? ''
    return ca === cb ? 0 : ca < cb ? 1 : -1
  })
}

// —— 常用食材（最近使用）——

const ING_HISTORY_KEY = 'ingredientHistory'
const ING_HISTORY_MAX = 24

export function getRecentIngredients(): string[] {
  const stored = readJSON<unknown>(ING_HISTORY_KEY, [])
  if (!Array.isArray(stored)) return []
  return stored.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
}

// 保存菜谱时把用到的食材名沉淀进常用列表，最近用过的排最前
export function rememberIngredients(names: string[]): boolean {
  const used = names
    .map((name) => name.trim())
    .filter((name) => name !== '')
  if (used.length === 0) return true
  const merged = [...new Set([...used, ...getRecentIngredients()])].slice(0, ING_HISTORY_MAX)
  return writeJSON(ING_HISTORY_KEY, merged)
}
