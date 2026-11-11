import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import ActionCard from './ActionCard'
import ExerciseDetail from './ExerciseDetail'
import { GROUP_HINTS, GROUP_LABELS } from '../data/exercises'
import { addExercise, getExercises, getRecentExerciseIds, markRecentExercise } from '../lib/exercises'
import type { Exercise, ExerciseGroup } from '../types'
import { getPinnedKeys, pinKey, rankSymptoms, togglePin } from '../lib/logs'
import type { SymptomCount } from '../lib/logs'
import { exportBackup, importBackup } from '../lib/backup'
import { clearSession, loadSession } from '../lib/session'

const GROUPS = Object.keys(GROUP_LABELS) as ExerciseGroup[]

type View =
  | { name: 'categories' }
  | { name: 'list'; group: ExerciseGroup }
  | { name: 'detail'; id: string }
  | { name: 'card'; id: string }

function depthOf(view: View): number {
  if (view.name === 'categories') return 0
  if (view.name === 'list') return 1
  return view.name === 'detail' ? 2 : 3
}

function groupFromView(view: View, exercises: Exercise[]): ExerciseGroup | undefined {
  if (view.name === 'list') return view.group
  if (view.name === 'detail' || view.name === 'card') {
    return exercises.find((item) => item.id === view.id)?.group
  }
  return undefined
}

interface RankedRow extends SymptomCount {
  key: string
  title: string
}

function buildRanking(pins: string[], exercises: Exercise[]): RankedRow[] {
  const rows: RankedRow[] = []
  for (const item of rankSymptoms()) {
    const exercise = exercises.find((e) => e.id === item.exerciseId)
    const symptom = exercise?.symptoms.find((s) => s.id === item.symptomId)
    if (!exercise || !symptom) continue
    rows.push({
      ...item,
      key: pinKey(item.exerciseId, item.symptomId),
      title: `${exercise.name} · ${symptom.label}`,
    })
  }
  return rows
    .sort((a, b) => {
      const pinDelta = Number(pins.includes(b.key)) - Number(pins.includes(a.key))
      return pinDelta !== 0 ? pinDelta : b.count - a.count
    })
    .slice(0, 5)
}

interface Props {
  active: boolean
}

export default function TrainingTab({ active }: Props) {
  const [exercises, setExercises] = useState<Exercise[]>(() => getExercises())
  const [view, setView] = useState<View>(() => {
    const session = loadSession()
    return session ? { name: 'card', id: session.exerciseId } : { name: 'categories' }
  })
  const [pins, setPins] = useState<string[]>(() => getPinnedKeys())
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  const [recentIds, setRecentIds] = useState<string[]>(() => getRecentExerciseIds())
  const [draftName, setDraftName] = useState('')
  const [draftGroup, setDraftGroup] = useState<ExerciseGroup>('legs')
  const [backupBusy, setBackupBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const viewRef = useRef(view)
  viewRef.current = view
  const activeRef = useRef(active)
  activeRef.current = active
  const exercisesRef = useRef(exercises)
  exercisesRef.current = exercises

  useEffect(() => {
    const depth = depthOf(viewRef.current)
    if (activeRef.current && depth > 0) window.history.pushState({ gtDepth: depth }, '')

    const onPop = (event: PopStateEvent) => {
      if (!activeRef.current) return
      const current = viewRef.current
      if (current.name === 'categories') return
      const target =
        event.state && typeof event.state.gtDepth === 'number' ? event.state.gtDepth : 0
      if (current.name === 'card' && target < 3) clearSession()
      if (target <= 0) {
        setView({ name: 'categories' })
      } else if (target === 1) {
        const group =
          (event.state?.group as ExerciseGroup | undefined) ??
          groupFromView(current, exercisesRef.current) ??
          'legs'
        setAdding(false)
        setView({ name: 'list', group })
      } else if (target === 2 && current.name === 'card') {
        setView({ name: 'detail', id: current.id })
      }
    }

    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const refreshExercises = () => {
    const next = getExercises()
    exercisesRef.current = next
    setExercises(next)
  }

  const goCategory = (group: ExerciseGroup) => {
    window.history.pushState({ gtDepth: 1, group }, '')
    setQuery('')
    setAdding(false)
    setView({ name: 'list', group })
  }

  const goDetail = (id: string) => {
    const group = exercisesRef.current.find((item) => item.id === id)?.group
    window.history.pushState({ gtDepth: 2, group }, '')
    setView({ name: 'detail', id })
  }

  const goCard = (id: string) => {
    const group = exercisesRef.current.find((item) => item.id === id)?.group
    window.history.pushState({ gtDepth: 3, group }, '')
    setRecentIds(markRecentExercise(id))
    setView({ name: 'card', id })
  }

  const back = () => {
    const depth = window.history.state?.gtDepth
    if (typeof depth === 'number' && depth > 0) {
      window.history.back()
      return
    }
    const current = viewRef.current
    if (current.name === 'card') {
      setView({ name: 'detail', id: current.id })
    } else if (current.name === 'detail') {
      const group = groupFromView(current, exercisesRef.current) ?? 'legs'
      setView({ name: 'list', group })
    } else {
      setView({ name: 'categories' })
    }
  }

  const handleAdd = () => {
    const name = draftName.trim()
    if (!name) return
    const created = addExercise({ name, group: draftGroup })
    refreshExercises()
    setDraftName('')
    setAdding(false)
    goDetail(created.id)
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
    if (!window.confirm('导入会用备份覆盖这台手机上的文字数据与菜谱图片（本机视频保留，不受影响）。继续？')) return
    setBackupBusy(true)
    try {
      await importBackup(file)
      window.location.reload()
    } catch {
      window.alert('导入失败：文件不是有效的备份')
      setBackupBusy(false)
    }
  }

  const exercise =
    view.name === 'detail' || view.name === 'card'
      ? exercises.find((item) => item.id === view.id)
      : undefined

  if (view.name === 'card' && exercise) {
    return <ActionCard exercise={exercise} onExit={back} />
  }

  if (view.name === 'detail' && exercise) {
    return (
      <ExerciseDetail
        exercise={exercise}
        backLabel={`← ${GROUP_LABELS[exercise.group]}`}
        onBack={back}
        onStart={() => goCard(exercise.id)}
        onChanged={refreshExercises}
        onDeleted={() => {
          const group = exercise.group
          refreshExercises()
          const depth = window.history.state?.gtDepth
          if (typeof depth === 'number' && depth > 0) {
            window.history.replaceState({ gtDepth: 1, group }, '')
          }
          setView({ name: 'list', group })
        }}
      />
    )
  }

  if (view.name === 'list') {
    const group = view.group
    const normalizedQuery = query.trim().toLowerCase()
    const visibleExercises = exercises
      .filter((item) => item.group === group)
      .filter((item) => !normalizedQuery || item.name.toLowerCase().includes(normalizedQuery))
      .sort((a, b) => {
        const aRecent = recentIds.indexOf(a.id)
        const bRecent = recentIds.indexOf(b.id)
        if (aRecent < 0 && bRecent < 0) return 0
        if (aRecent < 0) return 1
        if (bRecent < 0) return -1
        return aRecent - bRecent
      })

    return (
      <section>
        <button className="back-btn" type="button" onClick={back}>
          ← 动作库
        </button>
        <h1 className="page-title">{GROUP_LABELS[group]}</h1>
        <p className="page-sub">{GROUP_HINTS[group]}</p>

        <label className="field exercise-search">
          <span className="field-label">本类快速查</span>
          <input
            className="field-input"
            value={query}
            placeholder="搜索动作名称"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <div className="exercise-list">
          {visibleExercises.map((item) => (
            <button
              key={item.id}
              type="button"
              className="exercise-row"
              onClick={() => goDetail(item.id)}
            >
              <span>{item.name}</span>
              <span className="exercise-meta">
                {recentIds.includes(item.id) ? '最近练过' : `${item.symptoms.length} 项症状`}
              </span>
            </button>
          ))}
        </div>

        {visibleExercises.length === 0 && (
          <div className="empty">
            <p className="empty-title">这一类还没有这个动作</p>
            <p className="empty-desc">换个关键词，或在下面自己添加一个。</p>
          </div>
        )}

        {adding ? (
          <div className="exercise-add">
            <label className="field">
              <span className="field-label">动作名称</span>
              <input
                className="field-input"
                value={draftName}
                maxLength={20}
                placeholder="如：杠铃划船"
                autoFocus
                onChange={(event) => setDraftName(event.target.value)}
              />
            </label>
            <p className="field-label">类型</p>
            <div className="filter-row">
              {GROUPS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="filter-chip"
                  aria-pressed={draftGroup === item}
                  onClick={() => setDraftGroup(item)}
                >
                  {GROUP_LABELS[item]}
                </button>
              ))}
            </div>
            <div className="backup-actions">
              <button
                className="save-btn"
                type="button"
                disabled={!draftName.trim()}
                onClick={handleAdd}
              >
                添加
              </button>
              <button
                className="ghost-btn small"
                type="button"
                onClick={() => {
                  setAdding(false)
                  setDraftName('')
                }}
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <button
            className="ghost-btn small exercise-add-btn"
            type="button"
            onClick={() => {
              setDraftGroup(group)
              setAdding(true)
            }}
          >
            + 添加动作
          </button>
        )}
      </section>
    )
  }

  // 兜底：详情/卡片里的动作已被删除
  if (view.name === 'detail' || view.name === 'card') {
    return (
      <section>
        <div className="empty">
          <p className="empty-title">这个动作不见了</p>
          <p className="empty-desc">可能刚被删掉。回到动作库重新选一个。</p>
        </div>
        <button className="ghost-btn small" type="button" onClick={back}>
          返回
        </button>
      </section>
    )
  }

  const ranking = buildRanking(pins, exercises)

  return (
    <section>
      <h1 className="page-title">训练</h1>
      <p className="page-sub">先选大类，再挑今天练的动作</p>

      <div className="group-list">
        {GROUPS.map((group) => {
          const count = exercises.filter((item) => item.group === group).length
          return (
            <button
              key={group}
              type="button"
              className="group-card"
              onClick={() => goCategory(group)}
            >
              <span className="group-card-body">
                <span className="group-card-title">{GROUP_LABELS[group]}</span>
                <span className="group-card-sub">{GROUP_HINTS[group]}</span>
              </span>
              <span className="group-card-side">
                <span className="group-card-count">{count} 个动作</span>
                <span className="group-card-arrow" aria-hidden="true">
                  →
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <h2 className="section-title">我的高频错误</h2>
      {ranking.length === 0 ? (
        <p className="hint">还没有记录。练完一组点一下症状，这里会按次数自己排出来。</p>
      ) : (
        <ul className="rank-list">
          {ranking.map((row) => (
            <li key={row.key} className="rank-row">
              <div className="rank-main">
                <span className="rank-label">{row.title}</span>
                <span className="rank-count">{row.count} 次</span>
              </div>
              <button
                type="button"
                className="pin-btn"
                aria-pressed={pins.includes(row.key)}
                onClick={() => setPins(togglePin(row.key))}
              >
                {pins.includes(row.key) ? '已置顶' : '置顶'}
              </button>
            </li>
          ))}
        </ul>
      )}

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
