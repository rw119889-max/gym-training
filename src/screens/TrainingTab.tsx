import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import ActionCard from './ActionCard'
import ExerciseDetail from './ExerciseDetail'
import { GROUP_LABELS } from '../data/exercises'
import { addExercise, getExercises, getRecentExerciseIds, markRecentExercise } from '../lib/exercises'
import type { Exercise, ExerciseGroup } from '../types'
import { getPinnedKeys, pinKey, rankSymptoms, togglePin } from '../lib/logs'
import type { SymptomCount } from '../lib/logs'
import { exportBackup, importBackup } from '../lib/backup'
import { clearSession, loadSession } from '../lib/session'

type View = { name: 'list' } | { name: 'detail'; id: string } | { name: 'card'; id: string }

function depthOf(view: View): number {
  if (view.name === 'list') return 0
  return view.name === 'detail' ? 1 : 2
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

export default function TrainingTab() {
  const [view, setView] = useState<View>(() => {
    const active = loadSession()
    return active ? { name: 'card', id: active.exerciseId } : { name: 'list' }
  })
  const [pins, setPins] = useState<string[]>(() => getPinnedKeys())
  const [exercises, setExercises] = useState<Exercise[]>(() => getExercises())
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  const [recentIds, setRecentIds] = useState<string[]>(() => getRecentExerciseIds())
  const [draftName, setDraftName] = useState('')
  const [draftGroup, setDraftGroup] = useState<ExerciseGroup>('squat')
  const [backupBusy, setBackupBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const viewRef = useRef(view)
  viewRef.current = view

  useEffect(() => {
    const depth = depthOf(viewRef.current)
    if (depth > 0) window.history.pushState({ gtDepth: depth }, '')

    const onPop = (event: PopStateEvent) => {
      const current = viewRef.current
      if (current.name === 'list') return
      const target =
        event.state && typeof event.state.gtDepth === 'number' ? event.state.gtDepth : 0
      if (current.name === 'card' && target < 2) clearSession()
      if (target <= 0) setView({ name: 'list' })
      else if (target === 1) setView({ name: 'detail', id: current.id })
    }

    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const goDetail = (id: string) => {
    window.history.pushState({ gtDepth: 1 }, '')
    setView({ name: 'detail', id })
  }

  const goCard = (id: string) => {
    window.history.pushState({ gtDepth: 2 }, '')
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
    setView(
      current.name === 'card' ? { name: 'detail', id: current.id } : { name: 'list' },
    )
  }

  const refreshExercises = () => setExercises(getExercises())

  const handleAdd = () => {
    const name = draftName.trim()
    if (!name) return
    const created = addExercise({ name, group: draftGroup })
    refreshExercises()
    setDraftName('')
    setDraftGroup('squat')
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
    if (!window.confirm('导入会覆盖这台手机上的现有数据，继续？')) return
    setBackupBusy(true)
    try {
      await importBackup(file)
      window.location.reload()
    } catch {
      window.alert('导入失败：文件不是有效的备份')
      setBackupBusy(false)
    }
  }

  const exercise = view.name === 'list' ? undefined : exercises.find((e) => e.id === view.id)

  if (view.name === 'card' && exercise) {
    return <ActionCard exercise={exercise} onExit={back} />
  }

  if (view.name === 'detail' && exercise) {
    return (
      <ExerciseDetail
        exercise={exercise}
        onBack={back}
        onStart={() => goCard(exercise.id)}
        onChanged={refreshExercises}
        onDeleted={() => {
          refreshExercises()
          if (window.history.state?.gtDepth) {
            window.history.replaceState({ gtDepth: 0 }, '')
          }
          setView({ name: 'list' })
        }}
      />
    )
  }

  const ranking = buildRanking(pins, exercises)
  const normalizedQuery = query.trim().toLowerCase()
  const visibleExercises = exercises
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
      <h1 className="page-title">动作库</h1>
      <p className="page-sub">这一组怎么练对</p>

      <label className="field exercise-search">
        <span className="field-label">快速查动作</span>
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
            <span className="exercise-name">{item.name}</span>
            <span className="exercise-meta">
              {GROUP_LABELS[item.group]} · {item.symptoms.length} 项症状
            </span>
          </button>
        ))}
      </div>

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
            {(Object.keys(GROUP_LABELS) as ExerciseGroup[]).map((group) => (
              <button
                key={group}
                type="button"
                className="filter-chip"
                aria-pressed={draftGroup === group}
                onClick={() => setDraftGroup(group)}
              >
                {GROUP_LABELS[group]}
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
          onClick={() => setAdding(true)}
        >
          + 添加动作
        </button>
      )}

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
