import { useCallback, useEffect, useRef, useState } from 'react'
import type { CookMode, MealSlot, Recipe } from '../types'
import RecipeEditor from './RecipeEditor'
import RecipeImage from '../components/RecipeImage'
import RecipeVideos from '../components/RecipeVideos'
import {
  COOK_MODES,
  COOK_MODE_LABELS,
  deleteRecipe,
  duplicateRecipe,
  formatPrice,
  getRecipes,
  markCookedToday,
  MEAL_LABELS,
  MEAL_SLOTS,
  normalizeRecipeSort,
  sortRecipes,
  toggleFavorite,
} from '../lib/recipes'
import type { RecipeSort } from '../lib/recipes'
import { deleteImage, readJSON, writeJSON } from '../lib/storage'
import { formatGram, recipeNutrition } from '../lib/nutrition'
import { todayKey } from '../lib/date'
import { useNotice } from '../hooks/useNotice'

type View = { name: 'list' } | { name: 'detail'; id: string } | { name: 'edit'; id: string | null }
type Filter = 'all' | MealSlot | CookMode

interface Props {
  active: boolean
}

const MEAL_FILTERS: { id: MealSlot; label: string }[] = MEAL_SLOTS.map((meal) => ({
  id: meal,
  label: MEAL_LABELS[meal],
}))

const MODE_FILTERS: { id: CookMode; label: string }[] = COOK_MODES.map((mode) => ({
  id: mode,
  label: COOK_MODE_LABELS[mode],
}))

const SORTS: { id: RecipeSort; label: string }[] = [
  { id: 'created', label: '最近创建' },
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
        <span className="group-tag">
          {MEAL_LABELS[recipe.meal]}
          {recipe.mode && ` · ${COOK_MODE_LABELS[recipe.mode]}`}
        </span>
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
  const [sort, setSort] = useState<RecipeSort>(() => normalizeRecipeSort(readJSON<string>('recipeSort', 'created')))
  const [popOpen, setPopOpen] = useState<null | 'filter' | 'sort'>(null)

  useEffect(() => {
    if (!popOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPopOpen(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [popOpen])
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

  // 筛选为单选互斥：选餐次列餐次、选做法列做法，「全部」重置
  const filtered =
    filter === 'all'
      ? recipes
      : recipes.filter((recipe) =>
          (MEAL_SLOTS as readonly string[]).includes(filter)
            ? recipe.meal === filter
            : recipe.mode === filter,
        )
  const visible = sortRecipes(filtered, sort)

  const changeSort = (next: RecipeSort) => {
    setSort(next)
    writeJSON('recipeSort', next)
  }

  const filterLabel =
    filter === 'all'
      ? '全部'
      : [...MEAL_FILTERS, ...MODE_FILTERS].find((item) => item.id === filter)?.label ?? '全部'
  const sortLabel = SORTS.find((item) => item.id === sort)?.label ?? '最近创建'

  return (
    <section>
      {noticeNode}
      <div className="page-head">
        <h1 className="page-title">食谱</h1>
        <button className="save-btn page-head-action" type="button" onClick={goNew}>
          + 新建菜谱
        </button>
      </div>

      {recipes.length > 0 && (
        <div className="notes-view-row">
          <div className={popOpen === 'filter' ? 'notes-ctl-wrap is-open' : 'notes-ctl-wrap'}>
            <button
              type="button"
              className="notes-ctl-btn"
              aria-haspopup="listbox"
              aria-expanded={popOpen === 'filter'}
              onClick={() => setPopOpen(popOpen === 'filter' ? null : 'filter')}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M4 5.5h16M7 12h10M10 18.5h4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              <span>{filterLabel}</span>
              <svg className="notes-ctl-chevron" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 9.5l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {popOpen === 'filter' && (
              <div className="notes-pop" role="listbox" aria-label="筛选菜谱">
                <p className="notes-pop-group">按餐次</p>
                {[{ id: 'all' as Filter, label: '全部' }, ...MEAL_FILTERS].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={filter === item.id}
                    className={filter === item.id ? 'notes-pop-item is-active' : 'notes-pop-item'}
                    onClick={() => {
                      setFilter(item.id)
                      setPopOpen(null)
                    }}
                  >
                    <span>{item.label}</span>
                    {filter === item.id && (
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="notes-pop-check">
                        <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                ))}
                <p className="notes-pop-group">按做法</p>
                {MODE_FILTERS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={filter === item.id}
                    className={filter === item.id ? 'notes-pop-item is-active' : 'notes-pop-item'}
                    onClick={() => {
                      setFilter(item.id)
                      setPopOpen(null)
                    }}
                  >
                    <span>{item.label}</span>
                    {filter === item.id && (
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="notes-pop-check">
                        <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={popOpen === 'sort' ? 'notes-ctl-wrap is-open' : 'notes-ctl-wrap'}>
            <button
              type="button"
              className="notes-ctl-btn"
              aria-haspopup="listbox"
              aria-expanded={popOpen === 'sort'}
              onClick={() => setPopOpen(popOpen === 'sort' ? null : 'sort')}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M8 5.5v13m0 0l-3.5-3.5M8 18.5l3.5-3.5M16 18.5v-13m0 0l-3.5 3.5M16 5.5l3.5 3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>{sortLabel}</span>
              <svg className="notes-ctl-chevron" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 9.5l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {popOpen === 'sort' && (
              <div className="notes-pop" role="listbox" aria-label="排序方式">
                {SORTS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={sort === item.id}
                    className={sort === item.id ? 'notes-pop-item is-active' : 'notes-pop-item'}
                    onClick={() => {
                      changeSort(item.id)
                      setPopOpen(null)
                    }}
                  >
                    <span>{item.label}</span>
                    {sort === item.id && (
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="notes-pop-check">
                        <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="notes-view-count">{visible.length} 道</span>
        </div>
      )}
      {popOpen && (
        <button
          type="button"
          className="notes-pop-backdrop"
          aria-label="关闭菜单"
          onClick={() => setPopOpen(null)}
        />
      )}

      {recipes.length === 0 ? (
        <div className="empty">
          <p className="empty-title">还没有菜谱</p>
          <p className="empty-desc">菜名、做法、食材克数，蛋白/脂肪/碳水自动算。按餐次分类，建好后随时能改。</p>
        </div>
      ) : visible.length === 0 ? (
        <p className="hint">这个筛选下还没有菜谱。切到「全部」看其他菜谱，或在编辑菜谱时选上对应餐次/做法。</p>
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
                    {MEAL_LABELS[recipe.meal]}
                    {recipe.mode && ` · ${COOK_MODE_LABELS[recipe.mode]}`} · 蛋白{' '}
                    {formatGram(total.protein)} g · 脂肪 {formatGram(total.fat)} g · 碳水{' '}
                    {formatGram(total.carb)} g
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
