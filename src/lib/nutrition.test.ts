import { describe, expect, it } from 'vitest'
import { formatGram, ingredientNutrition, recipeNutrition } from './nutrition'
import type { Recipe } from '../types'

function makeRecipe(ingredients: Recipe['ingredients']): Recipe {
  return {
    id: 'r-test',
    name: '测试菜',
    meal: 'lunch',
    method: '',
    imageId: null,
    ingredients,
    cookMinutes: 10,
    spicy: false,
    oilGrams: 5,
    saltGrams: 2,
    createdAt: '',
    updatedAt: '',
  }
}

describe('ingredientNutrition', () => {
  it('按克数等比例缩放每 100g 营养', () => {
    expect(ingredientNutrition(250, { protein: 20, fat: 10, carb: 5 })).toEqual({
      protein: 50,
      fat: 25,
      carb: 12.5,
    })
  })

  it('0 克返回全 0', () => {
    expect(ingredientNutrition(0, { protein: 20, fat: 10, carb: 5 })).toEqual({
      protein: 0,
      fat: 0,
      carb: 0,
    })
  })
})

describe('recipeNutrition', () => {
  it('把多种食材的三项营养分别求和', () => {
    const recipe = makeRecipe([
      { id: 'a', name: '鸡胸', grams: 200, per100g: { protein: 30, fat: 3, carb: 0 } },
      { id: 'b', name: '米饭', grams: 150, per100g: { protein: 3, fat: 1, carb: 25 } },
    ])
    expect(recipeNutrition(recipe)).toEqual({
      protein: 60 + 4.5,
      fat: 6 + 1.5,
      carb: 0 + 37.5,
    })
  })

  it('没有食材时返回 0', () => {
    expect(recipeNutrition(makeRecipe([]))).toEqual({ protein: 0, fat: 0, carb: 0 })
  })
})

describe('formatGram', () => {
  it('整数不带小数点，非整数保留一位', () => {
    expect(formatGram(50)).toBe('50')
    expect(formatGram(50.25)).toBe('50.3')
    expect(formatGram(12.04)).toBe('12')
    expect(formatGram(0)).toBe('0')
  })
})
