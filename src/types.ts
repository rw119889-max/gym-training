export type ExerciseCategory = 'push' | 'pull' | 'legs'

export interface ExerciseProfile {
  id: string
  name: string
  category?: ExerciseCategory
  createdAt: string
}

export interface NutritionPer100g {
  protein: number
  fat: number
  carb: number
}

export interface Ingredient {
  id: string
  name: string
  grams: number
  per100g: NutritionPer100g
}

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'pre' | 'post' | 'snack'

export interface Recipe {
  id: string
  name: string
  meal: MealSlot
  method: string
  imageIds: string[]
  notes: string
  ingredients: Ingredient[]
  cookMinutes: number
  spicy: boolean
  oilGrams: number
  saltGrams: number
  price: number
  cookedDates?: string[]
  favorite?: boolean
  createdAt: string
  updatedAt: string
}

export interface VideoClip {
  id: string
  exerciseId: string
  label: string
  size: number
  duration: number
  createdAt: string
}

export interface ExercisePhoto {
  id: string
  exerciseId: string
  label: string
  createdAt: string
}

export interface ExerciseNote {
  id: string
  title?: string
  text: string
  html?: string
  pinned?: boolean
  topic?: string
  createdAt: string
  updatedAt: string
}

export type ArticleBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; imageId?: string; src?: string }

export interface SavedArticle {
  id: string
  exerciseId: string
  title: string
  body: string
  blocks?: ArticleBlock[]
  createdAt: string
  updatedAt: string
}

export interface TrainingSession {
  id: string
  date: string
  day: 'push' | 'pull'
  seq: number
  noteId?: string
  createdAt: string
}
