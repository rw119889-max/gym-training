export type ExerciseGroup = 'legs' | 'chest' | 'back'

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
  group: ExerciseGroup
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
  imageId: string | null
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
