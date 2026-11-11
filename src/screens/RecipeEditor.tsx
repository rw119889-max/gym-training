import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { Ingredient, Recipe } from '../types'
import { getRecipe, MEAL_LABELS, MEAL_SLOTS, newRecipe, saveRecipe } from '../lib/recipes'
import { compressImage } from '../lib/image'
import { deleteImage, putImage } from '../lib/storage'
import { formatGram, recipeNutrition } from '../lib/nutrition'
import RecipeImage from '../components/RecipeImage'
import NumberField from '../components/NumberField'

interface Props {
  recipeId: string | null
  onBack: () => void
  onSaved: (id: string) => void
}

interface PendingImage {
  id: string
  blob: Blob
  url: string
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
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([])
  const [removedIds, setRemovedIds] = useState<string[]>([])
  const [imageBusy, setImageBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const urlsRef = useRef<string[]>([])

  useEffect(() => {
    const urls = urlsRef.current
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [])

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
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    if (files.length === 0) return
    setImageBusy(true)
    try {
      const added: PendingImage[] = []
      for (const file of files) {
        const blob = await compressImage(file)
        const id = `ri-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const url = URL.createObjectURL(blob)
        urlsRef.current.push(url)
        added.push({ id, blob, url })
      }
      setPendingImages((prev) => [...prev, ...added])
      setDraft((prev) => ({
        ...prev,
        imageIds: [...prev.imageIds, ...added.map((item) => item.id)],
      }))
    } catch {
      window.alert('图片处理失败，换一张试试')
    } finally {
      setImageBusy(false)
    }
  }

  const removeImage = (id: string) => {
    const pending = pendingImages.find((item) => item.id === id)
    if (pending) {
      URL.revokeObjectURL(pending.url)
      urlsRef.current = urlsRef.current.filter((url) => url !== pending.url)
      setPendingImages((prev) => prev.filter((item) => item.id !== id))
    } else {
      setRemovedIds((prev) => [...prev, id])
    }
    setDraft((prev) => ({ ...prev, imageIds: prev.imageIds.filter((item) => item !== id) }))
  }

  const save = async () => {
    if (!canSave || saving) return
    setSaving(true)
    try {
      for (const item of pendingImages) await putImage(item.id, item.blob)
      for (const id of removedIds) await deleteImage(id)
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
        <span className="field-label">
          菜谱图片{draft.imageIds.length > 0 ? '（第一张为封面）' : ''}
        </span>
        <div className="image-picker-grid">
          {draft.imageIds.map((id, index) => {
            const pending = pendingImages.find((item) => item.id === id)
            return (
              <div key={id} className="image-picker-cell">
                {pending ? (
                  <img className="recipe-image editor-image" src={pending.url} alt={`图片 ${index + 1}`} />
                ) : (
                  <RecipeImage imageId={id} alt={`图片 ${index + 1}`} className="editor-image" />
                )}
                {index === 0 && <span className="cover-badge">封面</span>}
                <button
                  className="image-remove"
                  type="button"
                  aria-label={`删除第 ${index + 1} 张图片`}
                  onClick={() => removeImage(id)}
                >
                  ×
                </button>
              </div>
            )
          })}
          <label className="image-add-cell">
            {imageBusy ? '处理中…' : '+ 加图片'}
            <input type="file" accept="image/*" multiple hidden disabled={imageBusy} onChange={pickImage} />
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
      <p className="hint">
        营养按食材克数自动求和。克数按「实际吃进去的」填最准（如去头去刺后的量），生重熟重不要混用。
      </p>

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

      <label className="field">
        <span className="field-label">实测笔记</span>
        <textarea
          className="field-input method-input"
          rows={4}
          value={draft.notes}
          placeholder="做过一次后记：实际吃了多少克、这餐大概拿到多少蛋白/脂肪/碳水、下次怎么调整"
          onChange={(event) => patch({ notes: event.target.value })}
        />
      </label>

      <button className="cta editor-save" type="button" disabled={!canSave || saving || imageBusy} onClick={save}>
        {saving ? '保存中…' : '保存菜谱'}
      </button>
    </section>
  )
}
