import type { Recipe } from '../types'

export interface Nutrition {
  protein: number
  fat: number
  carb: number
}

export const ZERO_NUTRITION: Nutrition = { protein: 0, fat: 0, carb: 0 }

export function ingredientNutrition(grams: number, per100g: Nutrition): Nutrition {
  const factor = grams / 100
  return {
    protein: per100g.protein * factor,
    fat: per100g.fat * factor,
    carb: per100g.carb * factor,
  }
}

export function recipeNutrition(recipe: Recipe): Nutrition {
  return recipe.ingredients.reduce<Nutrition>((total, ingredient) => {
    const item = ingredientNutrition(ingredient.grams, ingredient.per100g)
    return {
      protein: total.protein + item.protein,
      fat: total.fat + item.fat,
      carb: total.carb + item.carb,
    }
  }, ZERO_NUTRITION)
}

export function formatGram(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}