import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import ActionCard from './ActionCard'
import ExerciseDetail from './ExerciseDetail'
import { EXERCISES, GROUP_LABELS } from '../data/exercises'
import { getPinnedKeys, pinKey, rankSymptoms, togglePin } from '../lib/logs'
import type { SymptomCount } from '../lib/logs'
import { exportBackup, importBackup } from '../lib/backup'

type View = { name: 'list' } | { name: 'detail'; id: string } | { name: 'card'; id: string }

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

export default function TrainingTab() {
  const [view, setView] = useState<View>({ name: 'list' })
  const [pins, setPins] = useState<string[]>(() => getPinnedKeys())
  const [backupBusy, setBackupBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

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

  const exercise = view.name === 'list' ? undefined : EXERCISES.find((e) => e.id === view.id)

  if (view.name === 'card' && exercise) {
    return <ActionCard exercise={exercise} onExit={() => setView({ name: 'detail', id: exercise.id })} />
  }

  if (view.name === 'detail' && exercise) {
    return (
      <ExerciseDetail
        exercise={exercise}
        onBack={() => setView({ name: 'list' })}
        onStart={() => setView({ name: 'card', id: exercise.id })}
      />
    )
  }

  const ranking = buildRanking(pins)

  return (
    <section>
      <h1 className="page-title">动作库</h1>
      <p className="page-sub">这一组怎么练对</p>

      <div className="exercise-list">
        {EXERCISES.map((item) => (
          <button
            key={item.id}
            type="button"
            className="exercise-row"
            onClick={() => setView({ name: 'detail', id: item.id })}
          >
            <span className="exercise-name">{item.name}</span>
            <span className="exercise-meta">
              {GROUP_LABELS[item.group]} · {item.symptoms.length} 项症状
            </span>
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
