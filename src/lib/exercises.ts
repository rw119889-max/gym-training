import { EXERCISES as BUILT_IN } from '../data/exercises'
import type { Exercise, ExerciseGroup } from '../types'
import { readJSON, writeJSON } from './storage'

const CUSTOM_KEY = 'customExercises'
const NAME_KEY = 'exerciseNames'

export interface ExercisePatch {
  name?: string
  group?: ExerciseGroup
  cue?: string
}

function getCustom(): Exercise[] {
  return readJSON<Exercise[]>(CUSTOM_KEY, [])
}

function getNameOverrides(): Record<string, string> {
  return readJSON<Record<string, string>>(NAME_KEY, {})
}

export function getExercises(): Exercise[] {
  const overrides = getNameOverrides()
  const builtIn = BUILT_IN.map((exercise) =>
    overrides[exercise.id] ? { ...exercise, name: overrides[exercise.id] } : exercise,
  )
  return [...builtIn, ...getCustom()]
}

export function findExercise(id: string): Exercise | undefined {
  return getExercises().find((exercise) => exercise.id === id)
}

export function exerciseName(id: string): string {
  return findExercise(id)?.name ?? '已删除的动作'
}

export function isCustomExercise(id: string): boolean {
  return getCustom().some((exercise) => exercise.id === id)
}

export function addExercise(input: ExercisePatch & { name: string }): Exercise {
  const name = input.name.trim()
  const exercise: Exercise = {
    id: `x-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
    name,
    group: input.group ?? 'squat',
    preChecks: [
      '站好：脚踩实，身体在杠 / 器械的正下方',
      '核心：吸一口气绷住，腰不塌',
      '重量：留 1–2 次余量，动作不变形',
    ],
    cue: input.cue?.trim() || '慢下，稳住，全程控制',
    symptoms: [
      { id: 'form', label: '动作变形 / 控制不住', fix: '减重量，把速度放慢' },
      { id: 'pain', label: '关节不舒服', fix: '停下这组，换轻重量找感觉' },
    ],
    commonMistakes: [],
  }
  writeJSON(CUSTOM_KEY, [...getCustom(), exercise])
  return exercise
}

export function updateExercise(id: string, patch: ExercisePatch): void {
  const name = patch.name?.trim()
  const custom = getCustom()
  if (custom.some((exercise) => exercise.id === id)) {
    writeJSON(
      CUSTOM_KEY,
      custom.map((exercise) =>
        exercise.id === id
          ? {
              ...exercise,
              name: name || exercise.name,
              group: patch.group ?? exercise.group,
              cue: patch.cue?.trim() || exercise.cue,
            }
          : exercise,
      ),
    )
    return
  }

  if (name) {
    const overrides = getNameOverrides()
    const builtIn = BUILT_IN.find((exercise) => exercise.id === id)
    if (builtIn && builtIn.name === name) delete overrides[id]
    else overrides[id] = name
    writeJSON(NAME_KEY, overrides)
  }
}

export function deleteExercise(id: string): boolean {
  const custom = getCustom()
  const next = custom.filter((exercise) => exercise.id !== id)
  if (next.length === custom.length) return false
  writeJSON(CUSTOM_KEY, next)
  return true
}
