import { useCallback, useEffect, useRef, useState } from 'react'
import type { MealSlot, Recipe } from '../types'
import RecipeEditor from './RecipeEditor'
import RecipeImage from '../components/RecipeImage'
import RecipeVideos from '../components/RecipeVideos'
import {
  deleteRecipe,
  duplicateRecipe,
  formatPrice,
  getRecipes,
  markCookedToday,
  MEAL_LABELS,
  MEAL_SLOTS,
  sortRecipes,
  toggleFavorite,
} from '../lib/recipes'
import type { RecipeSort } from '../lib/recipes'
import { deleteImage, readJSON, writeJSON } from '../lib/storage'
import { formatGram, recipeNutrition } from '../lib/nutrition'
import { todayKey } from '../lib/date'
import { useNotice } from '../hooks/useNotice'

type View = { name: 'list' } | { name: 'detail'; id: string } | { name: 'edit'; id: string | null }
type Filter = 'all' | MealSlot

interface Props {
  active: boolean
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: '全部' },
  ...MEAL_SLOTS.map((meal) => ({ id: meal, label: MEAL_LABELS[meal] })),
]

const SORTS: { id: RecipeSort; label: string }[] = [
  { id: 'default', label: '默认' },
  { id: 'cooked', label: '最近做过' },
  { id: 'favorite', label: '收藏优先' },
]

interface DetailProps {
  recipe: Recipe
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleFavorite: () => void
  onCooked: () => void
  onDuplicate: () => void
}

function RecipeDetail({
  recipe,
  onBack,
  onEdit,
  onDelete,
  onToggleFavorite,
  onCooked,
  onDuplicate,
}: DetailProps) {
  const total = recipeNutrition(recipe)
  const cooked = recipe.cookedDates ?? []
  const lastCooked = cooked[cooked.length - 1]

  return (
    <section>
      <div className="detail-top">
        <button className="back-btn" type="button" onClick={onBack}>
          ← 食谱
        </button>
        <div className="detail-top-tools">
          <button
            type="button"
            className={recipe.favorite ? 'ghost-btn small is-fav' : 'ghost-btn small'}
            aria-pressed={recipe.favorite === true}
            onClick={onToggleFavorite}
          >
            {recipe.favorite ? '★ 已收藏' : '☆ 收藏'}
          </button>
          <button className="ghost-btn small" type="button" onClick={onEdit}>
            编辑
          </button>
        </div>
      </div>

      {recipe.imageIds.length > 0 && (
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

      <RecipeVideos recipeId={recipe.id} />

      <div className="recipe-head">
        <h1 className="page-title">{recipe.name}</h1>
        <span className="group-tag">{MEAL_LABELS[recipe.meal]}</span>
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
        {recipe.cookMinutes} 分钟 · {recipe.spicy ? '含辣' : '无辣'} · 用油 {formatGram(recipe.oilGrams)}g · 用盐 {formatGram(recipe.saltGrams)}g · {formatPrice(recipe.price)}
      </p>

      <div className="cook-actions">
        <button type="button" className="save-btn" onClick={onCooked}>
          今天实际做了一次
        </button>
        <button type="button" className="ghost-btn small" onClick={onDuplicate}>
          复制这道菜
        </button>
      </div>
      {cooked.length > 0 && (
        <p className="cook-facts">
          做过 {cooked.length} 次 · 最近 {lastCooked}
        </p>
      )}

      <h2 className="section-title">食材与用量</h2>
      {recipe.ingredients.length === 0 ? (
        <p className="hint">还没有食材。点右上角「编辑」添加，填好克数就能自动算出营养。</p>
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
      <p className="method-text">{recipe.method || '还没写做法。点右上角「编辑」补上步骤，下次照着做就行。'}</p>

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
  const [sort, setSort] = useState<RecipeSort>(() => {
    const saved = readJSON<string>('recipeSort', 'default')
    return SORTS.some((item) => item.id === saved) ? (saved as RecipeSort) : 'default'
  })
  const viewRef = useRef(view)
  viewRef.current = view
  const activeRef = useRef(active)
  activeRef.current = active
  // 编辑页脏状态：硬件返回键离开编辑页前先确认，避免未保存内容直接丢失
  const editDirtyRef = useRef(false)
  const editConfirmedRef = useRef(false)
  const { show: showNotice, node: noticeNode } = useNotice()

  const handleEditDirty = useCallback((dirty: boolean) => {
    editDirtyRef.current = dirty
    if (!dirty) editConfirmedRef.current = false
  }, [])

  useEffect(() => {
    const onPop = (event: PopStateEvent) => {
      if (!activeRef.current) return
      const current = viewRef.current
      if (current.name === 'list') return
      if (current.name === 'edit') {
        if (editDirtyRef.current && !editConfirmedRef.current) {
          if (!window.confirm('还没保存，离开会丢掉这次的修改。继续？')) {
            // 取消这次返回：把编辑页所在层级重新压回历史栈
            window.history.pushState({ gtDepth: current.id ? 2 : 1 }, '')
            return
          }
          editConfirmedRef.current = true
        }
        if (editConfirmedRef.current) editConfirmedRef.current = false
      }
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
        onDirtyChange={handleEditDirty}
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
      <section>
        {noticeNode}
        <RecipeDetail
        recipe={current}
        onBack={back}
        onEdit={() => goEdit(current.id)}
        onToggleFavorite={() => {
          if (!toggleFavorite(current.id)) {
            showNotice('写入失败（手机存储可能已满），稍后再试。')
            return
          }
          refresh()
        }}
        onCooked={() => {
          if (!markCookedToday(current.id, todayKey())) {
            showNotice('写入失败（手机存储可能已满），稍后再试。')
            return
          }
          refresh()
        }}
        onDuplicate={() => {
          const copy = duplicateRecipe(current.id)
          if (!copy) {
            showNotice('复制失败（手机存储可能已满），稍后再试。')
            return
          }
          refresh()
          goEdit(copy.id)
        }}
        onDelete={() => {
          if (!window.confirm(`删除「${current.name}」？`)) return
          for (const id of current.imageIds) void deleteImage(id)
          deleteRecipe(current.id)
          refresh()
          back()
        }}
      />
      </section>
    )
  }

  const filtered = filter === 'all' ? recipes : recipes.filter((recipe) => recipe.meal === filter)
  const visible = sortRecipes(filtered, sort)

  const changeSort = (next: RecipeSort) => {
    setSort(next)
    writeJSON('recipeSort', next)
  }

  return (
    <section>
      {noticeNode}
      <div className="page-head">
        <h1 className="page-title">食谱</h1>
        <button className="save-btn page-head-action" type="button" onClick={goNew}>
          + 新建菜谱
        </button>
      </div>

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

      <div className="list-tools">
        <label className="notes-view-ctl">
          <select
            value={sort}
            aria-label="排序方式"
            onChange={(event) => changeSort(event.target.value as RecipeSort)}
          >
            {SORTS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {recipes.length === 0 ? (
        <div className="empty">
          <p className="empty-title">还没有菜谱</p>
          <p className="empty-desc">菜名、做法、食材克数，蛋白/脂肪/碳水自动算。按餐次分类，建好后随时能改。</p>
        </div>
      ) : visible.length === 0 ? (
        <p className="hint">这个餐次下还没有菜谱。切到「全部」看其他菜谱，或新建一条归到本餐次。</p>
      ) : (
        <div className="recipe-list">
          {visible.map((recipe) => {
            const total = recipeNutrition(recipe)
            const cooked = recipe.cookedDates ?? []
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
                    {recipe.favorite && <span className="is-fav">★</span>}
                    {cooked.length > 0 && <span>做过 {cooked.length} 次</span>}
                    <span>{recipe.cookMinutes} 分钟</span>
                    {!recipe.spicy && <span>无辣</span>}
                    {recipe.oilGrams <= 10 && <span>少油</span>}
                    {recipe.saltGrams <= 3 && <span>少盐</span>}
                    {recipe.price > 0 && <span>{formatPrice(recipe.price)}</span>}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      )}

    </section>
  )
}
