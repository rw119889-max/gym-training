import { describe, expect, it } from 'vitest'
import {
  deleteRecipe,
  getRecipe,
  getRecipes,
  newRecipe,
  saveRecipe,
} from './recipes'

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
  })
})
