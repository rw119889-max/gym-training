import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import ActionCard from './ActionCard'
import ArticleScreen from './ArticleScreen'
import ExerciseDetail from './ExerciseDetail'
import { findExercise, getExercises } from '../lib/exercises'
import { getPinnedKeys, pinKey, rankSymptoms, togglePin } from '../lib/logs'
import type { SymptomCount } from '../lib/logs'
import { exportBackup, importBackup } from '../lib/backup'
import { clearSession, loadSession } from '../lib/session'

const EXERCISES = getExercises()

type View =
  | { name: 'list' }
  | { name: 'detail'; id: string }
  | { name: 'card'; id: string }
  | { name: 'article'; id: string }

function depthOf(view: View): number {
  if (view.name === 'list') return 0
  return view.name === 'detail' ? 1 : 2
}

interface RankedRow extends SymptomCount {
  key: string
  title: string
}

function buildRanking(pins: string[]): RankedRow[] {
  const rows: RankedRow[] = []
  for (const item of rankSymptoms()) {
    const exercise = EXERCISES.find((e) => e.id === item.exerciseId)
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
  const [view, setView] = useState<View>(() => {
    const session = loadSession()
    if (session && findExercise(session.exerciseId)) return { name: 'card', id: session.exerciseId }
    if (session) clearSession()
    return { name: 'list' }
  })
  const [pins, setPins] = useState<string[]>(() => getPinnedKeys())
  const [backupBusy, setBackupBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const viewRef = useRef(view)
  viewRef.current = view
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    const depth = depthOf(viewRef.current)
    if (activeRef.current && depth > 0) window.history.pushState({ gtDepth: depth }, '')

    const onPop = (event: PopStateEvent) => {
      if (!activeRef.current) return
      const current = viewRef.current
      if (current.name === 'list') return
      const target =
        event.state && typeof event.state.gtDepth === 'number' ? event.state.gtDepth : 0
      if (current.name === 'card' && target < 2) clearSession()
      if (target <= 0) {
        setView({ name: 'list' })
      } else if (target === 1 && (current.name === 'card' || current.name === 'article')) {
        setView({ name: 'detail', id: current.id })
      }
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
    setView({ name: 'card', id })
  }

  const goArticle = (id: string) => {
    window.history.pushState({ gtDepth: 2 }, '')
    setView({ name: 'article', id })
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
    } else {
      setView({ name: 'list' })
    }
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
    view.name === 'detail' || view.name === 'card' || view.name === 'article'
      ? findExercise(view.id)
      : undefined

  if (view.name === 'card' && exercise) {
    return <ActionCard exercise={exercise} onExit={back} />
  }

  if (view.name === 'article' && exercise) {
    return <ArticleScreen exercise={exercise} onBack={back} />
  }

  if (view.name === 'detail' && exercise) {
    return (
      <ExerciseDetail
        exercise={exercise}
        onBack={back}
        onStart={() => goCard(exercise.id)}
        onArticle={() => goArticle(exercise.id)}
      />
    )
  }

  const ranking = buildRanking(pins)

  return (
    <section>
      <h1 className="page-title">训练</h1>
      <p className="page-sub">三个月死磕三个动作 · 练之前看一遍示范</p>

      <div className="exercise-list">
        {EXERCISES.map((item) => (
          <button
            key={item.id}
            type="button"
            className="exercise-row"
            onClick={() => goDetail(item.id)}
          >
            <span>{item.name}</span>
            <span className="exercise-meta">{item.symptoms.length} 项症状</span>
          </button>
        ))}
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
