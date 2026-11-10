import { useState } from 'react'
import type { MealSlot, Recipe } from '../types'
import RecipeEditor from './RecipeEditor'
import RecipeImage from '../components/RecipeImage'
import { deleteRecipe, getRecipes, MEAL_LABELS, MEAL_SLOTS } from '../lib/recipes'
import { deleteImage } from '../lib/storage'
import { formatGram, formatKcal, recipeNutrition } from '../lib/nutrition'

type View = { name: 'list' } | { name: 'detail'; id: string } | { name: 'edit'; id: string | null }
type Filter = 'all' | MealSlot

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

      <RecipeImage imageId={recipe.imageId} alt={recipe.name} className="detail-image" />

      <div className="recipe-head">
        <h1 className="page-title">{recipe.name}</h1>
        <span className="group-tag">{MEAL_LABELS[recipe.meal]}</span>
        <button className="ghost-btn small head-edit" type="button" onClick={onEdit}>
          编辑
        </button>
      </div>

      <div className="macro-cards">
        <div className="macro-card">
          <span className="macro-value">{formatKcal(total.kcal)}</span>
          <span className="macro-label">kcal</span>
        </div>
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

      <h2 className="section-title">食材与用量</h2>
      {recipe.ingredients.length === 0 ? (
        <p className="hint">还没有食材。</p>
      ) : (
        <ul className="ingredient-table">
          {recipe.ingredients.map((item) => (
            <li key={item.id}>
              <span className="ingredient-name">{item.name || '未命名食材'}</span>
              <span className="ingredient-grams">{formatGram(item.grams)} g</span>
              <span className="ingredient-kcal">
                {formatKcal((item.per100g.kcal * item.grams) / 100)} kcal
              </span>
            </li>
          ))}
        </ul>
      )}

      <h2 className="section-title">做法</h2>
      <p className="method-text">{recipe.method || '还没有写做法。'}</p>

      <div className="detail-actions">
        <button className="danger-btn" type="button" onClick={onDelete}>
          删除这道菜
        </button>
      </div>
    </section>
  )
}

export default function RecipesTab() {
  const [view, setView] = useState<View>({ name: 'list' })
  const [recipes, setRecipes] = useState<Recipe[]>(() => getRecipes())
  const [filter, setFilter] = useState<Filter>('all')

  const refresh = () => setRecipes(getRecipes())

  if (view.name === 'edit') {
    return (
      <RecipeEditor
        recipeId={view.id}
        onBack={() => setView(view.id ? { name: 'detail', id: view.id } : { name: 'list' })}
        onSaved={(id) => {
          refresh()
          setView({ name: 'detail', id })
        }}
      />
    )
  }

  const current = view.name === 'detail' ? recipes.find((recipe) => recipe.id === view.id) : undefined

  if (view.name === 'detail' && current) {
    return (
      <RecipeDetail
        recipe={current}
        onBack={() => setView({ name: 'list' })}
        onEdit={() => setView({ name: 'edit', id: current.id })}
        onDelete={() => {
          if (!window.confirm(`删除「${current.name}」？`)) return
          if (current.imageId) void deleteImage(current.imageId)
          deleteRecipe(current.id)
          refresh()
          setView({ name: 'list' })
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
          <p className="empty-desc">菜名、做法、食材克数，四项营养自动算。按餐次分类，建好后随时能改。</p>
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
                onClick={() => setView({ name: 'detail', id: recipe.id })}
              >
                <RecipeImage imageId={recipe.imageId} alt={recipe.name} className="recipe-thumb" />
                <span className="recipe-card-body">
                  <span className="recipe-card-name">{recipe.name}</span>
                  <span className="recipe-card-meta">
                    {MEAL_LABELS[recipe.meal]} · {formatKcal(total.kcal)} kcal · 蛋白{' '}
                    {formatGram(total.protein)} g
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      )}

      <button className="cta new-recipe" type="button" onClick={() => setView({ name: 'edit', id: null })}>
        + 新建菜谱
      </button>
    </section>
  )
}
