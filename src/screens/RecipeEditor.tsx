import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { Ingredient, Recipe } from '../types'
import { getRecipe, MEAL_LABELS, MEAL_SLOTS, newRecipe, saveRecipe } from '../lib/recipes'
import { compressImage } from '../lib/image'
import { putImage } from '../lib/storage'
import { formatGram, recipeNutrition } from '../lib/nutrition'
import RecipeImage from '../components/RecipeImage'
import NumberField from '../components/NumberField'

interface Props {
  recipeId: string | null
  onBack: () => void
  onSaved: (id: string) => void
}

const MACRO_FIELDS: { key: keyof Ingredient['per100g']; label: string }[] = [
  { key: 'protein', label: '蛋白 g' },
  { key: 'fat', label: '脂肪 g' },
  { key: 'carb', label: '碳水 g' },
]

export default function RecipeEditor({ recipeId, onBack, onSaved }: Props) {
  const [draft, setDraft] = useState<Recipe>(() => {
    if (recipeId) {
      const existing = getRecipe(recipeId)
      if (existing) return existing
    }
    return newRecipe()
  })
  const [preview, setPreview] = useState<string | null>(null)
  const [pendingImage, setPendingImage] = useState<Blob | null>(null)
  const [imageBusy, setImageBusy] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  const total = recipeNutrition(draft)
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
      per100g: { protein: 0, fat: 0, carb: 0 },
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
      setPreview(URL.createObjectURL(blob))
      setPendingImage(blob)
      patch({ imageId: draft.id })
    } catch {
      window.alert('图片处理失败，换一张试试')
    } finally {
      setImageBusy(false)
    }
  }

  const save = async () => {
    if (!canSave || saving) return
    setSaving(true)
    try {
      if (pendingImage) await putImage(draft.id, pendingImage)
      saveRecipe({ ...draft, name: draft.name.trim(), updatedAt: new Date().toISOString() })
      onSaved(draft.id)
    } catch {
      window.alert('保存失败，手机空间可能不够了，清理后再试。')
      setSaving(false)
    }
  }

  return (
    <section className="editor">
      <div className="editor-top">
        <button className="back-btn" type="button" disabled={saving} onClick={onBack}>
          ← 返回
        </button>
        <button className="save-btn" type="button" disabled={!canSave || saving || imageBusy} onClick={save}>
          {saving ? '保存中…' : '保存'}
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

      <div className="field">
        <span className="field-label">餐次</span>
        <div className="filter-row meal-picker">
          {MEAL_SLOTS.map((meal) => (
            <button
              key={meal}
              type="button"
              className="filter-chip"
              aria-pressed={draft.meal === meal}
              onClick={() => patch({ meal })}
            >
              {MEAL_LABELS[meal]}
            </button>
          ))}
        </div>
      </div>

      <div className="recipe-quick-fields">
        <label className="field">
          <span className="field-label">烹饪时长（分钟）</span>
          <NumberField
            className="field-input"
            min={1}
            max={180}
            inputMode="numeric"
            value={draft.cookMinutes}
            onValue={(cookMinutes) => patch({ cookMinutes })}
          />
        </label>
        <label className="field">
          <span className="field-label">用油（克）</span>
          <NumberField
            className="field-input"
            min={0}
            step="0.1"
            value={draft.oilGrams}
            onValue={(oilGrams) => patch({ oilGrams })}
          />
        </label>
        <label className="field">
          <span className="field-label">用盐（克）</span>
          <NumberField
            className="field-input"
            min={0}
            step="0.1"
            value={draft.saltGrams}
            onValue={(saltGrams) => patch({ saltGrams })}
          />
        </label>
      </div>
      <button
        className="filter-chip recipe-spicy-toggle"
        type="button"
        aria-pressed={draft.spicy}
        onClick={() => patch({ spicy: !draft.spicy })}
      >
        {draft.spicy ? '含辣' : '无辣'}
      </button>
      <p className="hint">营养数据请统一使用生重或熟重，不要混用。</p>

      <div className="nutrition-preview">
        <span>蛋白 {formatGram(total.protein)} g</span>
        <span>脂肪 {formatGram(total.fat)} g</span>
        <span>碳水 {formatGram(total.carb)} g</span>
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
              <NumberField
                className="field-input"
                min={0}
                value={item.grams}
                onValue={(grams) => patchIngredient(item.id, { grams })}
              />
            </label>
            <p className="field-label">每 100 g 营养</p>
            <div className="macro-grid">
              {MACRO_FIELDS.map((field) => (
                <label key={field.key} className="field">
                  <span className="field-label">{field.label}</span>
                  <NumberField
                    className="field-input"
                    min={0}
                    step="0.1"
                    value={item.per100g[field.key]}
                    onValue={(value) => patchPer100g(item.id, field.key, value)}
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

      <button className="cta editor-save" type="button" disabled={!canSave || saving || imageBusy} onClick={save}>
        {saving ? '保存中…' : '保存菜谱'}
      </button>
    </section>
  )
}
