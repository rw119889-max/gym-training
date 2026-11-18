import { describe, expect, it } from 'vitest'
import {
  deleteRecipe,
  duplicateRecipe,
  formatPrice,
  getRecipe,
  getRecentIngredients,
  getRecipes,
  markCookedToday,
  newRecipe,
  rememberIngredients,
  saveRecipe,
  sortRecipes,
  toggleFavorite,
} from './recipes'
import type { Recipe } from '../types'

function seedRecipe(partial: Partial<Recipe>): Recipe {
  const base = newRecipe()
  const recipe: Recipe = { ...base, ...partial, createdAt: base.createdAt, updatedAt: base.updatedAt }
  expect(saveRecipe(recipe)).toBe(true)
  return recipe
}

describe('newRecipe', () => {
  it('给出合理的默认值', () => {
    const recipe = newRecipe()
    expect(recipe.id.startsWith('r-')).toBe(true)
    expect(recipe.name).toBe('')
    expect(recipe.meal).toBe('lunch')
    expect(recipe.ingredients).toEqual([])
    expect(recipe.cookMinutes).toBe(15)
    expect(recipe.spicy).toBe(false)
    expect(recipe.oilGrams).toBe(10)
    expect(recipe.saltGrams).toBe(3)
    expect(recipe.imageIds).toEqual([])
    expect(recipe.notes).toBe('')
    expect(recipe.price).toBe(0)
  })
})

describe('formatPrice', () => {
  it('0 视为未标价，其余按元显示并抹掉浮点尾巴', () => {
    expect(formatPrice(0)).toBe('未标价')
    expect(formatPrice(28)).toBe('¥28')
    expect(formatPrice(28.5)).toBe('¥28.5')
    expect(formatPrice(0.1 + 0.2)).toBe('¥0.3')
  })
})

describe('saveRecipe / getRecipe / deleteRecipe', () => {
  it('新建保存后能读回', () => {
    const recipe = { ...newRecipe(), name: '鸡胸' }
    saveRecipe(recipe)
    expect(getRecipes()).toHaveLength(1)
    expect(getRecipe(recipe.id)?.name).toBe('鸡胸')
  })

  it('同 id 覆盖，新 id 头插（最新在前）', () => {
    const a = { ...newRecipe(), name: 'A' }
    const b = { ...newRecipe(), name: 'B' }
    saveRecipe(a)
    saveRecipe(b)
    expect(getRecipes().map((r) => r.name)).toEqual(['B', 'A'])

    saveRecipe({ ...a, name: 'A2' })
    expect(getRecipe(a.id)?.name).toBe('A2')
    expect(getRecipes()).toHaveLength(2)
  })

  it('多图顺序保存后不变', () => {
    const recipe = { ...newRecipe(), name: '多图', imageIds: ['a', 'b', 'c'] }
    saveRecipe(recipe)
    expect(getRecipe(recipe.id)?.imageIds).toEqual(['a', 'b', 'c'])
  })

  it('删除后不再存在', () => {
    const recipe = { ...newRecipe(), name: 'A' }
    saveRecipe(recipe)
    deleteRecipe(recipe.id)
    expect(getRecipes()).toHaveLength(0)
  })

  it('读取旧数据时补齐缺失的默认值，单图自动迁移成数组', () => {
    localStorage.setItem(
      'gt.v1.recipes',
      JSON.stringify([{ id: 'old', name: '旧菜', method: '', imageId: 'legacy-img', ingredients: [] }]),
    )
    const [recipe] = getRecipes()
    expect(recipe.meal).toBe('lunch')
    expect(recipe.cookMinutes).toBe(15)
    expect(recipe.spicy).toBe(false)
    expect(recipe.oilGrams).toBe(10)
    expect(recipe.saltGrams).toBe(3)
    expect(recipe.imageIds).toEqual(['legacy-img'])
    expect(recipe.notes).toBe('')
    expect(recipe.price).toBe(0)
  })
})

describe('做过记录 / 收藏 / 排序 / 复制 / 常用食材', () => {
  it('markCookedToday 同一天幂等，最多保留 60 条', () => {
    const recipe = seedRecipe({ name: '鸡胸' })
    expect(markCookedToday(recipe.id, '2026-11-17')).toBe(true)
    expect(markCookedToday(recipe.id, '2026-11-17')).toBe(true)
    expect(markCookedToday(recipe.id, '2026-11-18')).toBe(true)
    const stored = getRecipe(recipe.id)
    expect(stored?.cookedDates).toEqual(['2026-11-17', '2026-11-18'])
    for (let i = 1; i <= 70; i += 1) {
      markCookedToday(recipe.id, `2025-01-${String((i % 28) + 1).padStart(2, '0')}`)
    }
    expect(getRecipe(recipe.id)?.cookedDates?.length).toBeLessThanOrEqual(60)
  })

  it('toggleFavorite 切换收藏', () => {
    const recipe = seedRecipe({ name: '牛腩' })
    expect(recipe.favorite).toBe(false)
    expect(toggleFavorite(recipe.id)).toBe(true)
    expect(getRecipe(recipe.id)?.favorite).toBe(true)
    expect(toggleFavorite(recipe.id)).toBe(true)
    expect(getRecipe(recipe.id)?.favorite).toBe(false)
  })

  it('sortRecipes：最近做过把做过的排前面，收藏优先把收藏排前面', () => {
    const a = seedRecipe({ name: 'A', updatedAt: '2026-11-01T00:00:00.000Z' })
    const b = seedRecipe({ name: 'B', updatedAt: '2026-11-02T00:00:00.000Z' })
    markCookedToday(a.id, '2026-11-18')

    expect(sortRecipes([a, b], 'default')).toEqual([a, b])
    // 过记录后重新读，sortRecipes 只看传入的对象本身
    const cookedA = getRecipe(a.id)
    if (!cookedA) throw new Error('missing')
    expect(sortRecipes([cookedA, b], 'cooked').map((r) => r.id)).toEqual([a.id, b.id])
    expect(sortRecipes([b, cookedA], 'cooked').map((r) => r.id)).toEqual([a.id, b.id])

    toggleFavorite(b.id)
    const favB = getRecipe(b.id)
    if (!favB) throw new Error('missing')
    expect(sortRecipes([a, favB], 'favorite').map((r) => r.id)).toEqual([b.id, a.id])
  })

  it('duplicateRecipe 复制为新记录：新 id、副本名、不带走做过与收藏', () => {
    const src = seedRecipe({
      name: '番茄牛腩',
      meal: 'dinner',
      favorite: true,
      cookedDates: ['2026-11-01'],
    })
    const copy = duplicateRecipe(src.id)
    if (!copy) throw new Error('copy missing')
    expect(copy.id).not.toBe(src.id)
    expect(copy.name).toBe('番茄牛腩（副本）')
    expect(copy.meal).toBe('dinner')
    expect(copy.favorite).toBe(false)
    expect(copy.cookedDates).toEqual([])
    expect(getRecipes().some((r) => r.id === copy.id)).toBe(true)
  })

  it('常用食材：去重、最近用的排前、上限 24', () => {
    expect(rememberIngredients(['鸡蛋', '番茄', '鸡蛋'])).toBe(true)
    expect(rememberIngredients(['鸡胸'])).toBe(true)
    const list = getRecentIngredients()
    expect(list.slice(0, 3)).toEqual(['鸡胸', '鸡蛋', '番茄'])
    for (let i = 0; i < 30; i += 1) {
      rememberIngredients([`食材${i}`])
    }
    expect(getRecentIngredients().length).toBeLessThanOrEqual(24)
  })

  it('rememberIngredients 空数组与空白名不写入', () => {
    const before = getRecentIngredients()
    expect(rememberIngredients([])).toBe(true)
    expect(rememberIngredients(['   '])).toBe(true)
    expect(getRecentIngredients()).toEqual(before)
  })
})
