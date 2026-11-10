import type { MealSlot, Recipe } from '../types'
import { readJSON, writeJSON } from './storage'

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

export function getRecipes(): Recipe[] {
  return readJSON<Recipe[]>(KEY, []).map((recipe) => ({
    ...recipe,
    meal: recipe.meal ?? 'lunch',
    cookMinutes: recipe.cookMinutes ?? 15,
    spicy: recipe.spicy ?? false,
    oilGrams: recipe.oilGrams ?? 10,
    saltGrams: recipe.saltGrams ?? 3,
  }))
}

export function isQuickFitnessRecipe(recipe: Recipe): boolean {
  return (
    recipe.cookMinutes <= 20 &&
    recipe.spicy === false &&
    recipe.oilGrams <= 10 &&
    recipe.saltGrams <= 3
  )
}

function dailySeed(date = new Date()): number {
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
  return [...key].reduce((sum, char) => sum + char.charCodeAt(0), 0)
}

export function getDailyRecipes(recipes: Recipe[], date = new Date()): Recipe[] {
  const eligible = recipes.filter(isQuickFitnessRecipe)
  if (eligible.length === 0) return []
  const seed = dailySeed(date)
  const picks: Recipe[] = []
  for (let offset = 0; offset < eligible.length && picks.length < 3; offset += 1) {
    const recipe = eligible[(seed + offset) % eligible.length]
    if (!picks.some((item) => item.id === recipe.id)) picks.push(recipe)
  }
  return picks
}

export function getRecipe(id: string): Recipe | undefined {
  return getRecipes().find((recipe) => recipe.id === id)
}

export function saveRecipe(recipe: Recipe): void {
  const list = getRecipes()
  const index = list.findIndex((item) => item.id === recipe.id)
  if (index >= 0) {
    list[index] = recipe
  } else {
    list.unshift(recipe)
  }
  writeJSON(KEY, list)
}

export function deleteRecipe(id: string): void {
  writeJSON(
    KEY,
    getRecipes().filter((recipe) => recipe.id !== id),
  )
}

export function newRecipe(): Recipe {
  const now = new Date().toISOString()
  return {
    id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    meal: 'lunch',
    method: '',
    imageId: null,
    ingredients: [],
    cookMinutes: 15,
    spicy: false,
    oilGrams: 10,
    saltGrams: 3,
    createdAt: now,
    updatedAt: now,
  }
}
