import type { Recipe } from '../types'
import { readJSON, writeJSON } from './storage'

const KEY = 'recipes'

export function getRecipes(): Recipe[] {
  return readJSON<Recipe[]>(KEY, [])
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
    method: '',
    servings: 1,
    quick: false,
    imageId: null,
    ingredients: [],
    createdAt: now,
    updatedAt: now,
  }
}
