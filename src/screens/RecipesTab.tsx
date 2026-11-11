import { useEffect, useRef, useState } from 'react'
import type { MealSlot, Recipe } from '../types'
import RecipeEditor from './RecipeEditor'
import RecipeImage from '../components/RecipeImage'
import {
  deleteRecipe,
  getRecipes,
  MEAL_LABELS,
  MEAL_SLOTS,
} from '../lib/recipes'
import { deleteImage } from '../lib/storage'
import { formatGram, recipeNutrition } from '../lib/nutrition'

type View = { name: 'list' } | { name: 'detail'; id: string } | { name: 'edit'; id: string | null }
type Filter = 'all' | MealSlot

interface Props {
  active: boolean
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: '全部' },
  ...MEAL_SLOTS.map((meal) => ({ id: meal, label: MEAL_LABELS[meal] })),
]

interface DetailProps {
  recipe: Recipe
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
}

function RecipeDetail({ recipe, onBack, onEdit, onDelete }: DetailProps) {
  const total = recipeNutrition(recipe)

  return (
    <section>
      <button className="back-btn" type="button" onClick={onBack}>
        ← 食谱
      </button>

      {recipe.imageIds.length === 0 ? (
        <RecipeImage imageId={null} alt={recipe.name} className="detail-image" />
      ) : (
        <div className="detail-images">
          {recipe.imageIds.map((id, index) => (
            <RecipeImage
              key={id}
              imageId={id}
              alt={`${recipe.name} · 图 ${index + 1}`}
              className="detail-image"
            />
          ))}
        </div>
      )}

      <div className="recipe-head">
        <h1 className="page-title">{recipe.name}</h1>
        <span className="group-tag">{MEAL_LABELS[recipe.meal]}</span>
        <button className="ghost-btn small head-edit" type="button" onClick={onEdit}>
          编辑
        </button>
      </div>

      <div className="macro-cards">
        <div className="macro-card">
          <span className="macro-value">{formatGram(total.protein)}</span>
          <span className="macro-label">蛋白 g</span>
        </div>
        <div className="macro-card">
          <span className="macro-value">{formatGram(total.fat)}</span>
          <span className="macro-label">脂肪 g</span>
        </div>
        <div className="macro-card">
          <span className="macro-value">{formatGram(total.carb)}</span>
          <span className="macro-label">碳水 g</span>
        </div>
      </div>

      <p className="recipe-facts">
        {recipe.cookMinutes} 分钟 · {recipe.spicy ? '含辣' : '无辣'} · 用油 {formatGram(recipe.oilGrams)}g · 用盐 {formatGram(recipe.saltGrams)}g
      </p>

      <h2 className="section-title">食材与用量</h2>
      {recipe.ingredients.length === 0 ? (
        <p className="hint">还没有食材。</p>
      ) : (
        <ul className="ingredient-table">
          {recipe.ingredients.map((item) => (
            <li key={item.id}>
              <span className="ingredient-name">{item.name || '未命名食材'}</span>
              <span className="ingredient-grams">{formatGram(item.grams)} g</span>
            </li>
          ))}
        </ul>
      )}

      <h2 className="section-title">做法</h2>
      <p className="method-text">{recipe.method || '还没有写做法。'}</p>

      <h2 className="section-title">实测笔记</h2>
      <p className="method-text">
        {recipe.notes || '还没记。做一次之后，把实际吃了多少、这餐拿到的营养、下次怎么调整写进编辑页。'}
      </p>

      <div className="detail-actions">
        <button className="danger-btn" type="button" onClick={onDelete}>
          删除这道菜
        </button>
      </div>
    </section>
  )
}

export default function RecipesTab({ active }: Props) {
  const [view, setView] = useState<View>({ name: 'list' })
  const [recipes, setRecipes] = useState<Recipe[]>(() => getRecipes())
  const [filter, setFilter] = useState<Filter>('all')
  const viewRef = useRef(view)
  viewRef.current = view
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    const onPop = (event: PopStateEvent) => {
      if (!activeRef.current) return
      const current = viewRef.current
      if (current.name === 'list') return
      const target = typeof event.state?.gtDepth === 'number' ? event.state.gtDepth : 0
      if (target <= 0) setView({ name: 'list' })
      else if (target === 1) {
        if (current.id) setView({ name: 'detail', id: current.id })
        else setView({ name: 'list' })
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const refresh = () => setRecipes(getRecipes())

  const goDetail = (id: string) => {
    window.history.pushState({ gtDepth: 1 }, '')
    setView({ name: 'detail', id })
  }

  const goEdit = (id: string) => {
    window.history.pushState({ gtDepth: 2 }, '')
    setView({ name: 'edit', id })
  }

  const goNew = () => {
    window.history.pushState({ gtDepth: 1 }, '')
    setView({ name: 'edit', id: null })
  }

  const back = () => {
    const depth = window.history.state?.gtDepth
    if (typeof depth === 'number' && depth > 0) {
      window.history.back()
      return
    }
    const current = viewRef.current
    setView(
      current.name === 'edit' && current.id
        ? { name: 'detail', id: current.id }
        : { name: 'list' },
    )
  }

  if (view.name === 'edit') {
    const editingExisting = view.id !== null
    return (
      <RecipeEditor
        recipeId={view.id}
        onBack={back}
        onSaved={(id) => {
          refresh()
          if (editingExisting) window.history.back()
          else setView({ name: 'detail', id })
        }}
      />
    )
  }

  const current = view.name === 'detail' ? recipes.find((recipe) => recipe.id === view.id) : undefined

  if (view.name === 'detail' && current) {
    return (
      <RecipeDetail
        recipe={current}
        onBack={back}
        onEdit={() => goEdit(current.id)}
        onDelete={() => {
          if (!window.confirm(`删除「${current.name}」？`)) return
          for (const id of current.imageIds) void deleteImage(id)
          deleteRecipe(current.id)
          refresh()
          back()
        }}
      />
    )
  }

  const visible = filter === 'all' ? recipes : recipes.filter((recipe) => recipe.meal === filter)

  return (
    <section>
      <h1 className="page-title">食谱</h1>
      <p className="page-sub">今天吃什么</p>

      <div className="filter-row">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="filter-chip"
            aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {recipes.length === 0 ? (
        <div className="empty">
          <p className="empty-title">还没有菜谱</p>
          <p className="empty-desc">菜名、做法、食材克数，蛋白/脂肪/碳水自动算。按餐次分类，建好后随时能改。</p>
        </div>
      ) : visible.length === 0 ? (
        <p className="hint">这个餐次下还没有菜谱。</p>
      ) : (
        <div className="recipe-list">
          {visible.map((recipe) => {
            const total = recipeNutrition(recipe)
            return (
              <button
                key={recipe.id}
                type="button"
                className="recipe-card"
                onClick={() => goDetail(recipe.id)}
              >
                <RecipeImage
                  imageId={recipe.imageIds[0] ?? null}
                  alt={recipe.name}
                  className="recipe-thumb"
                />
                <span className="recipe-card-body">
                  <span className="recipe-card-name">{recipe.name}</span>
                  <span className="recipe-card-meta">
                    {MEAL_LABELS[recipe.meal]} · 蛋白 {formatGram(total.protein)} g · 脂肪{' '}
                    {formatGram(total.fat)} g · 碳水 {formatGram(total.carb)} g
                  </span>
                  <span className="recipe-badges">
                    <span>{recipe.cookMinutes} 分钟</span>
                    {!recipe.spicy && <span>无辣</span>}
                    {recipe.oilGrams <= 10 && <span>少油</span>}
                    {recipe.saltGrams <= 3 && <span>少盐</span>}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      )}

      <button className="cta new-recipe" type="button" onClick={goNew}>
        + 新建菜谱
      </button>
    </section>
  )
}
