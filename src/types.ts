export interface ExerciseSymptom {
  id: string
  label: string
  fix: string
}

export interface CommonMistake {
  name: string
  symptom: string
  cause: string
  fix: string
}

export interface Exercise {
  id: string
  name: string
  preChecks: [string, string, string]
  cue: string
  targetFeeling: string
  safetyNotes: string[]
  symptoms: ExerciseSymptom[]
  commonMistakes: CommonMistake[]
}

export interface SymptomLog {
  id: string
  date: string
  exerciseId: string
  symptomId: string | null
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

export type ExerciseNoteTag = 'mistake' | 'activation' | 'muscles' | 'feeling'

export interface ExercisePhoto {
  id: string
  exerciseId: string
  label: string
  createdAt: string
}

export interface ExerciseNote {
  id: string
  exerciseId: string
  tag: ExerciseNoteTag | null
  text: string
  createdAt: string
  updatedAt: string
}

export interface Article {
  exerciseId: string
  title: string
  intro: string
  body: string
}
