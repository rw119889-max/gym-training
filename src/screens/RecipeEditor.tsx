import { useState } from 'react'
import type { ChangeEvent } from 'react'
import type { Ingredient, Recipe } from '../types'
import { getRecipe, newRecipe, saveRecipe } from '../lib/recipes'
import { compressImage } from '../lib/image'
import { putImage } from '../lib/storage'
import { formatGram, formatKcal, perServing, recipeNutrition } from '../lib/nutrition'
import RecipeImage from '../components/RecipeImage'

interface Props {
  recipeId: string | null
  onBack: () => void
  onSaved: (id: string) => void
}

const MACRO_FIELDS: { key: keyof Ingredient['per100g']; label: string }[] = [
  { key: 'kcal', label: '热量 kcal' },
  { key: 'protein', label: '蛋白 g' },
  { key: 'fat', label: '脂肪 g' },
  { key: 'carb', label: '碳水 g' },
]

function toNumber(value: string): number {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export default function RecipeEditor({ recipeId, onBack, onSaved }: Props) {
  const [draft, setDraft] = useState<Recipe>(() => {
    if (recipeId) {
      const existing = getRecipe(recipeId)
      if (existing) return existing
    }
    return newRecipe()
  })
  const [preview, setPreview] = useState<string | null>(null)
  const [imageBusy, setImageBusy] = useState(false)

  const total = recipeNutrition(draft)
  const each = perServing(total, draft.servings)
  const canSave = draft.name.trim().length > 0

  const patch = (values: Partial<Recipe>) => setDraft((prev) => ({ ...prev, ...values }))

  const patchIngredient = (id: string, values: Partial<Ingredient>) => {
    setDraft((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((item) => (item.id === id ? { ...item, ...values } : item)),
    }))
  }

  const patchPer100g = (id: string, key: keyof Ingredient['per100g'], value: number) => {
    setDraft((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((item) =>
        item.id === id ? { ...item, per100g: { ...item.per100g, [key]: value } } : item,
      ),
    }))
  }

  const addIngredient = () => {
    const item: Ingredient = {
      id: `i-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: '',
      grams: 100,
      per100g: { kcal: 0, protein: 0, fat: 0, carb: 0 },
    }
    setDraft((prev) => ({ ...prev, ingredients: [...prev.ingredients, item] }))
  }

  const removeIngredient = (id: string) => {
    setDraft((prev) => ({ ...prev, ingredients: prev.ingredients.filter((item) => item.id !== id) }))
  }

  const pickImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setImageBusy(true)
    try {
      const blob = await compressImage(file)
      await putImage(draft.id, blob)
      if (preview) URL.revokeObjectURL(preview)
      setPreview(URL.createObjectURL(blob))
      patch({ imageId: draft.id })
    } catch {
      window.alert('图片处理失败，换一张试试')
    } finally {
      setImageBusy(false)
    }
  }

  const save = () => {
    if (!canSave) return
    saveRecipe({ ...draft, name: draft.name.trim(), updatedAt: new Date().toISOString() })
    onSaved(draft.id)
  }

  return (
    <section className="editor">
      <div className="editor-top">
        <button className="back-btn" type="button" onClick={onBack}>
          ← 返回
        </button>
        <button className="save-btn" type="button" disabled={!canSave} onClick={save}>
          保存
        </button>
      </div>

      <label className="field">
        <span className="field-label">菜名</span>
        <input
          className="field-input"
          value={draft.name}
          onChange={(event) => patch({ name: event.target.value })}
          placeholder="例如：番茄牛腩"
        />
      </label>

      <div className="field">
        <span className="field-label">菜谱图片</span>
        <div className="image-picker">
          {preview ? (
            <img className="recipe-image editor-image" src={preview} alt="菜谱预览" />
          ) : (
            <RecipeImage imageId={draft.imageId} alt="菜谱图片" className="editor-image" />
          )}
          <label className="ghost-btn small">
            {imageBusy ? '处理中…' : draft.imageId ? '换一张' : '选择图片'}
            <input type="file" accept="image/*" hidden onChange={pickImage} disabled={imageBusy} />
          </label>
        </div>
      </div>

      <div className="field-row">
        <label className="field">
          <span className="field-label">份数</span>
          <input
            className="field-input"
            type="number"
            min={1}
            inputMode="numeric"
            value={draft.servings}
            onChange={(event) => patch({ servings: Math.max(1, toNumber(event.target.value)) })}
          />
        </label>
        <div className="field">
          <span className="field-label">快手</span>
          <button
            type="button"
            className="toggle-btn"
            aria-pressed={draft.quick}
            onClick={() => patch({ quick: !draft.quick })}
          >
            {draft.quick ? '20 分钟内能做好' : '标记为快手'}
          </button>
        </div>
      </div>

      <div className="nutrition-preview">
        <span>整份 {formatKcal(total.kcal)} kcal</span>
        <span>蛋白 {formatGram(total.protein)} g</span>
        <span>脂肪 {formatGram(total.fat)} g</span>
        <span>碳水 {formatGram(total.carb)} g</span>
        <span className="nutrition-per">
          每份 {formatKcal(each.kcal)} kcal · 蛋白 {formatGram(each.protein)} g
        </span>
      </div>

      <h2 className="section-title">食材与用量</h2>
      <div className="ingredient-list">
        {draft.ingredients.map((item) => (
          <div key={item.id} className="ingredient-card">
            <div className="ingredient-head">
              <input
                className="field-input"
                value={item.name}
                placeholder="食材名称"
                onChange={(event) => patchIngredient(item.id, { name: event.target.value })}
              />
              <button
                className="remove-btn"
                type="button"
                aria-label="删除这个食材"
                onClick={() => removeIngredient(item.id)}
              >
                ×
              </button>
            </div>
            <label className="field">
              <span className="field-label">用量（克）</span>
              <input
                className="field-input"
                type="number"
                min={0}
                inputMode="decimal"
                value={item.grams}
                onChange={(event) => patchIngredient(item.id, { grams: toNumber(event.target.value) })}
              />
            </label>
            <p className="field-label">每 100 g 营养</p>
            <div className="macro-grid">
              {MACRO_FIELDS.map((field) => (
                <label key={field.key} className="field">
                  <span className="field-label">{field.label}</span>
                  <input
                    className="field-input"
                    type="number"
                    min={0}
                    step="0.1"
                    inputMode="decimal"
                    value={item.per100g[field.key]}
                    onChange={(event) => patchPer100g(item.id, field.key, toNumber(event.target.value))}
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button className="ghost-btn small add-ingredient" type="button" onClick={addIngredient}>
        + 添加食材
      </button>

      <label className="field">
        <span className="field-label">做法</span>
        <textarea
          className="field-input method-input"
          rows={6}
          value={draft.method}
          placeholder="一、二、三……"
          onChange={(event) => patch({ method: event.target.value })}
        />
      </label>

      <button className="cta editor-save" type="button" disabled={!canSave} onClick={save}>
        保存菜谱
      </button>
    </section>
  )
}
