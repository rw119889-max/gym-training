import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { ExerciseCategory, ExerciseProfile } from '../types'
import ExerciseVideos from '../components/ExerciseVideos'
import ExercisePhotos from '../components/ExercisePhotos'
import SavedArticles from '../components/SavedArticles'
import {
  EXERCISE_CATEGORIES,
  addExerciseProfile,
  categoryLabel,
  getExerciseProfiles,
  updateExerciseProfile,
} from '../lib/exerciseProfiles'
import { getExercisePhotos } from '../lib/exercisePhotos'
import { getSavedArticlesOfExercise } from '../lib/savedArticles'
import { formatBytes, getVideos } from '../lib/videos'
import { exportBackup, importBackup } from '../lib/backup'
import { useOverlayHistory } from '../hooks/useOverlayHistory'

type MediaKind = 'videos' | 'photos' | 'articles'
type Bucket = ExerciseCategory | 'unassigned'

type Route =
  | { level: 'home' }
  | { level: 'category'; category: Bucket }
  | { level: 'exercise'; exerciseId: string }
  | { level: 'media'; kind: MediaKind; exerciseId: string }

interface EditorState {
  id: string | null
  name: string
  category: ExerciseCategory | null
}

interface Props {
  active: boolean
}

function bucketOf(item: ExerciseProfile): Bucket {
  return item.category ?? 'unassigned'
}

function ExerciseEditor({
  initial,
  submitLabel,
  onSave,
  onCancel,
}: {
  initial: EditorState
  submitLabel: string
  onSave: (name: string, category: ExerciseCategory) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial.name)
  const [category, setCategory] = useState<ExerciseCategory | null>(initial.category)

  return (
    <form
      className="exercise-add exercise-editor"
      onSubmit={(event) => {
        event.preventDefault()
        if (name.trim() && category) onSave(name, category)
      }}
    >
      <input
        className="field-input"
        value={name}
        maxLength={20}
        autoFocus
        placeholder="动作名，如：杠铃深蹲"
        onChange={(event) => setName(event.target.value)}
      />
      <div className="category-picks">
        {EXERCISE_CATEGORIES.map((item) => (
          <button
            key={item.id}
            type="button"
            className="filter-chip"
            aria-pressed={category === item.id}
            onClick={() => setCategory(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="backup-actions">
        <button
          className="save-btn add-exercise-btn"
          type="submit"
          disabled={!name.trim() || !category}
        >
          {submitLabel}
        </button>
        <button className="ghost-btn small" type="button" onClick={onCancel}>
          取消
        </button>
      </div>
    </form>
  )
}

export default function ExerciseTab({ active }: Props) {
  const [exercises, setExercises] = useState<ExerciseProfile[]>(() => getExerciseProfiles())
  const [route, setRoute] = useState<Route>({ level: 'home' })
  const [editing, setEditing] = useState<EditorState | null>(null)
  const [backupBusy, setBackupBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const goHome = () => {
    setEditing(null)
    setRoute({ level: 'home' })
  }

  const openCategory = (category: Bucket) => {
    setEditing(null)
    setRoute({ level: 'category', category })
  }

  const openExercise = (exerciseId: string) => {
    setEditing(null)
    setRoute({ level: 'exercise', exerciseId })
  }

  // 三层分别压一条历史记录，浏览器返回键逐层退回
  useOverlayHistory(active, route.level !== 'home', () => {
    setEditing(null)
    setRoute({ level: 'home' })
  })

  useOverlayHistory(active, route.level === 'exercise' || route.level === 'media', () => {
    setEditing(null)
    setRoute((prev) => {
      if (prev.level !== 'exercise' && prev.level !== 'media') return prev
      const item = exercises.find((entry) => entry.id === prev.exerciseId)
      return { level: 'category', category: item ? bucketOf(item) : 'unassigned' }
    })
  })

  useOverlayHistory(active, route.level === 'media', () => {
    setEditing(null)
    setRoute((prev) =>
      prev.level === 'media' ? { level: 'exercise', exerciseId: prev.exerciseId } : prev,
    )
  })

  const startAdd = () => {
    setEditing({
      id: null,
      name: '',
      category:
        route.level === 'category' && route.category !== 'unassigned' ? route.category : null,
    })
  }

  const startEdit = (item: ExerciseProfile) => {
    setEditing({ id: item.id, name: item.name, category: item.category ?? null })
  }

  const saveExercise = (name: string, category: ExerciseCategory) => {
    if (!editing) return
    if (editing.id) {
      const before = exercises.find((item) => item.id === editing.id)
      const updated = updateExerciseProfile(editing.id, { name, category })
      if (!updated) return
      setExercises(getExerciseProfiles())
      setEditing(null)
      if (route.level === 'category' && before && before.category !== category) {
        setRoute({ level: 'category', category })
      }
      if (route.level === 'exercise' && before && before.category !== category) {
        setRoute({ level: 'category', category })
      }
      return
    }

    const created = addExerciseProfile(name, category)
    if (!created) return
    setExercises(getExerciseProfiles())
    setEditing(null)
    setRoute({ level: 'category', category })
  }

  const handleExport = async () => {
    setBackupBusy(true)
    try {
      await exportBackup()
    } catch {
      window.alert('导出失败，再试一次')
    } finally {
      setBackupBusy(false)
    }
  }

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (
      !window.confirm(
        '导入会用备份覆盖这台手机上的文字数据与图片（菜谱、动作照片）。视频保留，不受影响。继续？',
      )
    ) {
      return
    }
    setBackupBusy(true)
    try {
      await importBackup(file)
      window.location.reload()
    } catch {
      window.alert('导入失败：文件不是有效的备份')
      setBackupBusy(false)
    }
  }

  const activeExercise =
    route.level === 'exercise' || route.level === 'media'
      ? exercises.find((item) => item.id === route.exerciseId)
      : undefined

  if (route.level === 'media' && activeExercise) {
    return (
      <section>
        <button
          className="back-btn"
          type="button"
          onClick={() => {
            setEditing(null)
            setRoute({ level: 'exercise', exerciseId: activeExercise.id })
          }}
        >
          ← {activeExercise.name}
        </button>
        <h1 className="page-title subpage-title">
          {route.kind === 'videos' ? '视频' : route.kind === 'photos' ? '照片' : '收藏文章'}
        </h1>

        {route.kind === 'videos' && <ExerciseVideos exerciseId={activeExercise.id} />}
        {route.kind === 'photos' && <ExercisePhotos exerciseId={activeExercise.id} />}
        {route.kind === 'articles' && (
          <SavedArticles
            exerciseId={activeExercise.id}
            exerciseName={activeExercise.name}
            onBack={() => setRoute({ level: 'exercise', exerciseId: activeExercise.id })}
          />
        )}
      </section>
    )
  }

  if (route.level === 'exercise' && activeExercise) {
    const mineVideos = getVideos().filter((clip) => clip.exerciseId === activeExercise.id)
    const videoBytes = mineVideos.reduce((sum, clip) => sum + clip.size, 0)
    const photoCount = getExercisePhotos(activeExercise.id).length
    const articleCount = getSavedArticlesOfExercise(activeExercise.id).length

    return (
      <section>
        <button
          className="back-btn"
          type="button"
          onClick={() => openCategory(bucketOf(activeExercise))}
        >
          ← {categoryLabel(activeExercise.category)}
        </button>

        <div className="group-head">
          <h1 className="page-title">{activeExercise.name}</h1>
          {!editing && (
            <button
              className="ghost-btn small"
              type="button"
              onClick={() => startEdit(activeExercise)}
            >
              编辑
            </button>
          )}
        </div>
        <p className="page-sub">视频、照片、文章，点开就是二级页</p>

        {editing && (
          <ExerciseEditor
            key={editing.id ?? 'new'}
            initial={editing}
            submitLabel="保存"
            onSave={saveExercise}
            onCancel={() => setEditing(null)}
          />
        )}

        <div className="module-list">
          <button
            className="module-row"
            type="button"
            onClick={() => setRoute({ level: 'media', kind: 'videos', exerciseId: activeExercise.id })}
          >
            <span className="module-row-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="3.5" />
                <path d="M10.5 9.2v5.6l4.6-2.8z" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <span className="module-row-text">
              <span className="module-row-title">视频</span>
              <span className="module-row-meta">
                {mineVideos.length === 0
                  ? '还没有上传'
                  : `${mineVideos.length} 条 · ${formatBytes(videoBytes)}`}
              </span>
            </span>
            <span className="module-row-arrow" aria-hidden="true">
              ›
            </span>
          </button>

          <button
            className="module-row"
            type="button"
            onClick={() => setRoute({ level: 'media', kind: 'photos', exerciseId: activeExercise.id })}
          >
            <span className="module-row-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="3.5" />
                <path d="M6 16.5l4.2-4.4 3 3 2.3-2.3 2.5 3.7" />
                <circle cx="15.6" cy="9.4" r="1.3" />
              </svg>
            </span>
            <span className="module-row-text">
              <span className="module-row-title">照片</span>
              <span className="module-row-meta">
                {photoCount === 0 ? '还没有上传' : `${photoCount} 张`}
              </span>
            </span>
            <span className="module-row-arrow" aria-hidden="true">
              ›
            </span>
          </button>

          <button
            className="module-row"
            type="button"
            onClick={() => setRoute({ level: 'media', kind: 'articles', exerciseId: activeExercise.id })}
          >
            <span className="module-row-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 4h12v16l-6-4.2L6 20z" />
              </svg>
            </span>
            <span className="module-row-text">
              <span className="module-row-title">收藏文章</span>
              <span className="module-row-meta">
                {articleCount === 0 ? '还没有收藏' : `${articleCount} 篇`}
              </span>
            </span>
            <span className="module-row-arrow" aria-hidden="true">
              ›
            </span>
          </button>
        </div>
      </section>
    )
  }

  if (route.level === 'category') {
    const label = route.category === 'unassigned' ? '未分类' : categoryLabel(route.category)
    const items = exercises.filter((item) => bucketOf(item) === route.category)
    const clips = getVideos()

    return (
      <section>
        <button className="back-btn" type="button" onClick={goHome}>
          ← 动作
        </button>

        <div className="group-head">
          <h1 className="page-title">{label}</h1>
          <span className="group-count">{items.length} 个动作</span>
        </div>
        <p className="page-sub">点动作进去看视频、照片和文章；「编辑」可以改名字和类别</p>

        {editing ? (
          <ExerciseEditor
            key={editing.id ?? 'new'}
            initial={editing}
            submitLabel={editing.id ? '保存' : '添加'}
            onSave={saveExercise}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <button className="ghost-btn small group-add" type="button" onClick={startAdd}>
            + 新动作
          </button>
        )}

        {items.length === 0 ? (
          !editing && <p className="hint group-empty">这个类别还没有动作。</p>
        ) : (
          <ul className="exercise-grid">
            {items.map((item) => {
              const parts: string[] = []
              const videoCount = clips.filter((clip) => clip.exerciseId === item.id).length
              const photoCount = getExercisePhotos(item.id).length
              const articleCount = getSavedArticlesOfExercise(item.id).length
              if (videoCount > 0) parts.push(`视频 ${videoCount}`)
              if (photoCount > 0) parts.push(`照片 ${photoCount}`)
              if (articleCount > 0) parts.push(`文章 ${articleCount}`)

              return (
                <li key={item.id} className="exercise-card">
                  <button
                    type="button"
                    className="exercise-card-open"
                    onClick={() => openExercise(item.id)}
                  >
                    <span className="exercise-card-name">{item.name}</span>
                    <span className="exercise-card-meta">
                      {parts.length > 0 ? parts.join(' · ') : '还没有内容'}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="exercise-card-edit"
                    aria-label={`编辑 ${item.name}`}
                    onClick={() => startEdit(item)}
                  >
                    编辑
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    )
  }

  const unassigned = exercises.filter((item) => !item.category)

  return (
    <section>
      <h1 className="page-title">动作</h1>
      <p className="page-sub">按推、拉、腿分开存；点进去是自己的动作</p>

      <div className="category-list">
        {EXERCISE_CATEGORIES.map((item) => {
          const list = exercises.filter((exercise) => exercise.category === item.id)
          const names = list.slice(0, 3).map((exercise) => exercise.name).join('、')
          return (
            <button
              key={item.id}
              type="button"
              className="category-card"
              onClick={() => openCategory(item.id)}
            >
              <span className="category-glyph" aria-hidden="true">
                {item.label}
              </span>
              <span className="category-body">
                <span className="category-name">
                  {item.label}
                  <span className="category-en">{item.en}</span>
                </span>
                <span className="category-meta">
                  {list.length === 0
                    ? '还没有动作'
                    : `${list.length} 个动作${names ? ` · ${names}${list.length > 3 ? ' 等' : ''}` : ''}`}
                </span>
              </span>
              <span className="module-row-arrow" aria-hidden="true">
                ›
              </span>
            </button>
          )
        })}

        {unassigned.length > 0 && (
          <button
            type="button"
            className="category-card is-unassigned"
            onClick={() => openCategory('unassigned')}
          >
            <span className="category-glyph" aria-hidden="true">
              ?
            </span>
            <span className="category-body">
              <span className="category-name">未分类</span>
              <span className="category-meta">
                {unassigned.length} 个动作 · 点进去改成推、拉或腿
              </span>
            </span>
            <span className="module-row-arrow" aria-hidden="true">
              ›
            </span>
          </button>
        )}
      </div>

      <h2 className="section-title">数据</h2>
      <p className="hint">数据只在这台手机上。换手机、清理浏览器前，先导出备份。</p>
      <div className="backup-actions">
        <button
          className="ghost-btn small"
          type="button"
          onClick={handleExport}
          disabled={backupBusy}
        >
          导出备份
        </button>
        <button
          className="ghost-btn small"
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={backupBusy}
        >
          导入备份
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={handleImport}
        />
      </div>
    </section>
  )
}