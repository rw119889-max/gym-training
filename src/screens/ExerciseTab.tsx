import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { ExerciseCategory, ExerciseProfile, TrainingSession } from '../types'
import ExerciseVideos from '../components/ExerciseVideos'
import ExercisePhotos from '../components/ExercisePhotos'
import SavedArticles from '../components/SavedArticles'
import ConfirmDialog from '../components/ConfirmDialog'
import SwipeToDelete from '../components/SwipeToDelete'
import WarmupVideos from '../components/WarmupVideos'
import {
  PICKABLE_CATEGORIES,
  addExerciseProfile,
  categoryLabel,
  getExerciseProfiles,
  isDuplicateExerciseName,
  updateExerciseProfile,
} from '../lib/exerciseProfiles'
import { COACH_SERIES, PLAN_DAYS, findPlanDay } from '../lib/coachPlans'
import type { PlanDay, PlanExercise } from '../lib/coachPlans'
import { SERIES_GUIDE } from '../lib/coachGuide'
import type { GuideItem } from '../lib/coachGuide'
import { getExercisePhotos } from '../lib/exercisePhotos'
import { getSavedArticlesOfExercise } from '../lib/savedArticles'
import { formatBytes, getVideos } from '../lib/videos'
import { exportBackup, importBackup, readBackupSummary } from '../lib/backup'
import { useOverlayHistory } from '../hooks/useOverlayHistory'
import { todayKey } from '../lib/date'
import { completeSession, countByDay, getSessions, removeSession } from '../lib/trainingLog'
import { writeJSON } from '../lib/storage'
import {
  cycleInfo,
  ensureCycleStart,
  restartCycle,
  slotFor,
  slotLabel,
  weekDateKeys,
  weekdayLabel,
  WEEK_DISPLAY_ORDER,
} from '../lib/weeklyPlan'
import { addWarmup, getWarmups, removeWarmup, resetWarmups } from '../lib/warmups'
import type { WarmupItem } from '../lib/warmups'
import { getPlanOverride, removePlanOverride, setPlanOverride } from '../lib/planOverrides'
import type { PlanOverride } from '../lib/planOverrides'

type MediaKind = 'videos' | 'photos' | 'articles'
type Bucket = ExerciseCategory | 'unassigned'

type Route =
  | { level: 'home' }
  | { level: 'category'; category: Bucket }
  | { level: 'exercise'; exerciseId: string }
  | { level: 'media'; kind: MediaKind; exerciseId: string }
  | { level: 'coaches' }
  | { level: 'plan'; day: PlanDay }
  | { level: 'plan-videos'; day: PlanDay }
  | { level: 'guide' }

interface EditorState {
  id: string | null
  name: string
  category: ExerciseCategory | null
}

interface Props {
  active: boolean
  onOpenNotes: () => void
}

function bucketOf(item: ExerciseProfile): Bucket {
  return item.category ?? 'unassigned'
}

// 替换动作编辑器：从「我的动作」里选（按当日推/拉过滤），或自定义输入一个名字
function SwapEditor({
  day,
  current,
  onDone,
}: {
  day: 'push' | 'pull'
  current: PlanOverride | null
  onDone: (next: PlanOverride | null) => void
}) {
  const [custom, setCustom] = useState(current?.name ?? '')
  const profiles = getExerciseProfiles().filter((item) => item.category === day)

  return (
    <div className="swap-editor">
      <p className="swap-editor-label">从我的动作里选（{day === 'push' ? '推' : '拉'}类）：</p>
      {profiles.length > 0 ? (
        <div className="swap-picks">
          {profiles.map((item) => (
            <button
              key={item.id}
              type="button"
              className="filter-chip"
              onClick={() => onDone({ name: item.name })}
            >
              {item.name}
            </button>
          ))}
        </div>
      ) : (
        <p className="field-hint">动作库里还没有{day === 'push' ? '推' : '拉'}类动作，直接在下面输入。</p>
      )}
      <form
        className="swap-custom"
        onSubmit={(event) => {
          event.preventDefault()
          const trimmed = custom.trim()
          if (trimmed) onDone({ name: trimmed })
        }}
      >
        <input
          className="field-input"
          value={custom}
          maxLength={20}
          placeholder="或直接输入动作名，如：单手绳索臂屈伸"
          onChange={(event) => setCustom(event.target.value)}
        />
        <div className="backup-actions">
          <button className="save-btn" type="submit" disabled={!custom.trim()}>
            就练这个
          </button>
          {current && (
            <button
              className="ghost-btn small"
              type="button"
              onClick={() => onDone(null)}
            >
              还原原动作
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

// 热身卡：推/拉日各一套，可添加/删除条目、可恢复默认
function WarmupCard({ day }: { day: 'push' | 'pull' }) {
  const [items, setItems] = useState<WarmupItem[]>(() => getWarmups()[day])
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [open, setOpen] = useState(true)
  const [pendingDelete, setPendingDelete] = useState<WarmupItem | null>(null)

  const handleAdd = () => {
    const item = addWarmup(day, name, note)
    if (item) {
      setItems(getWarmups()[day])
      setName('')
      setNote('')
      setAdding(false)
    }
  }

  const handleRemove = (id: string) => {
    removeWarmup(day, id)
    setItems(getWarmups()[day])
    setPendingDelete(null)
  }

  const handleReset = () => {
    resetWarmups(day)
    setItems(getWarmups()[day])
    setAdding(false)
  }

  return (
    <div className="warmup-card">
      <button
        type="button"
        className="warmup-head"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="warmup-title">热身（先热身再上重量）</span>
        <span className="warmup-count">{items.length} 项</span>
        <span className={`plan-exercise-chevron${open ? ' is-open' : ''}`} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9.5l6 6 6-6" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="warmup-body">
          {items.length === 0 && <p className="field-hint">还没有热身项，点下方「+ 添加热身动作」。</p>}
          <ul className="warmup-list">
            {items.map((item) => (
              <SwipeToDelete
                key={item.id}
                className="warmup-item"
                onAskDelete={() => setPendingDelete(item)}
              >
                <span className="warmup-item-text">
                  <span className="warmup-item-name">{item.name}</span>
                  {item.note && <span className="warmup-item-note">{item.note}</span>}
                </span>
              </SwipeToDelete>
            ))}
          </ul>
          {adding ? (
            <div className="warmup-add">
              <input
                className="field-input"
                value={name}
                maxLength={20}
                autoFocus
                placeholder="热身动作名，如：弹力带肩环绕"
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleAdd()
                  }
                }}
              />
              <input
                className="field-input"
                value={note}
                maxLength={40}
                placeholder="要点（可留空），如：半程，十几二十次 × 2 组"
                onChange={(event) => setNote(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleAdd()
                  }
                }}
              />
              <div className="backup-actions">
                <button className="save-btn" type="button" disabled={!name.trim()} onClick={handleAdd}>
                  添加
                </button>
                <button className="ghost-btn small" type="button" onClick={() => setAdding(false)}>
                  取消
                </button>
                <button className="ghost-btn small" type="button" onClick={handleReset}>
                  恢复默认
                </button>
              </div>
            </div>
          ) : (
            <div className="backup-actions">
              <button className="ghost-btn small" type="button" onClick={() => setAdding(true)}>
                + 添加热身动作
              </button>
              <button className="ghost-btn small" type="button" onClick={handleReset}>
                恢复默认
              </button>
            </div>
          )}
        </div>
      )}
      {pendingDelete && (
        <ConfirmDialog
          message={`删掉热身项「${pendingDelete.name}」？`}
          confirmLabel="删掉"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => handleRemove(pendingDelete.id)}
        />
      )}
    </div>
  )
}

function PlanExerciseCard({
  exercise,
  index,
  day,
}: {
  exercise: PlanExercise
  index: number
  day: 'push' | 'pull'
}) {
  const [open, setOpen] = useState(false)
  // 动作替换：进入页面时读一次覆盖；替换/还原后由子组件刷新
  const [override, setOverride] = useState<PlanOverride | null>(() => getPlanOverride(exercise.id))
  const [replacing, setReplacing] = useState(false)
  const hasRegression = (exercise.regression?.length ?? 0) > 0
  const hasProgression = (exercise.progression?.length ?? 0) > 0
  const displayName = override ? override.name : exercise.name

  const applyOverride = (next: PlanOverride | null) => {
    if (next) {
      setPlanOverride(exercise.id, next)
    } else {
      removePlanOverride(exercise.id)
    }
    setOverride(next)
    setReplacing(false)
  }

  return (
    <li className={open ? 'plan-exercise is-open' : 'plan-exercise'}>
      <button
        type="button"
        className="plan-exercise-head"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="plan-exercise-index" aria-hidden="true">
          {index + 1}
        </span>
        <span className="plan-exercise-main">
          <span className="plan-exercise-name">{displayName}</span>
          {override && <span className="plan-chip is-swapped">已替换</span>}
          <span className="plan-exercise-muscles">
            {override ? `原动作：${exercise.name}` : exercise.muscles}
          </span>
          <span className="plan-exercise-tags">
            <span className="plan-chip is-sets">{exercise.sets}</span>
            <span
              className={exercise.toFailure ? 'plan-chip is-failure' : 'plan-chip is-control'}
            >
              {exercise.intensity}
            </span>
          </span>
        </span>
        <span className="plan-exercise-chevron" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9.5l6 6 6-6" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="plan-exercise-body">
          {replacing ? (
            <SwapEditor day={day} current={override} onDone={applyOverride} />
          ) : (
            <ul className="plan-tips">
              {exercise.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          )}
          <div className="swap-row">
            {replacing ? (
              <button
                type="button"
                className="ghost-btn small"
                onClick={() => setReplacing(false)}
              >
                取消替换
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="ghost-btn small"
                  onClick={() => setReplacing(true)}
                >
                  {override ? '换一个动作' : '替换动作'}
                </button>
                {override && (
                  <button
                    type="button"
                    className="ghost-btn small"
                    onClick={() => applyOverride(null)}
                  >
                    还原成 {exercise.name}
                  </button>
                )}
              </>
            )}
          </div>
          <ExerciseVideos exerciseId={exercise.id} />
          {exercise.notes && exercise.notes.length > 0 && (
            <div className="plan-block">
              <h3 className="plan-block-title">教练补充</h3>
              <GuideLines items={exercise.notes} />
            </div>
          )}
          {hasRegression || hasProgression ? (
            <div className="plan-block plan-regpro">
              {hasRegression && (
                <div className="plan-regpro-col">
                  <h3 className="plan-block-title">退阶</h3>
                  <GuideLines items={exercise.regression ?? []} />
                </div>
              )}
              {hasProgression && (
                <div className="plan-regpro-col">
                  <h3 className="plan-block-title">进阶</h3>
                  <GuideLines items={exercise.progression ?? []} />
                </div>
              )}
            </div>
          ) : null}
          {exercise.adjust && (
            <div className="plan-block plan-adjust">
              <h3 className="plan-block-title">次数 / 重量怎么调</h3>
              <p className="guide-line-text">{exercise.adjust}</p>
            </div>
          )}
          {exercise.faq && exercise.faq.length > 0 && (
            <div className="plan-block">
              <h3 className="plan-block-title">常见问题</h3>
              <FaqList entries={exercise.faq} />
            </div>
          )}
        </div>
      )}
    </li>
  )
}

function TrainingCheckin({
  day,
  label,
  sessions,
  onUndo,
}: {
  day: 'push' | 'pull'
  label: string
  sessions: TrainingSession[]
  onUndo: (id: string) => void
}) {
  const today = todayKey()
  const daySessions = sessions.filter((item) => item.day === day)
  const done = daySessions.find((item) => item.date === today)
  const last = daySessions[daySessions.length - 1]
  const nextSeq = daySessions.reduce((max, item) => Math.max(max, item.seq), 0) + 1

  return (
    <div className={`training-checkin is-${day}`}>
      <div className="training-checkin-top">
        <span className="training-checkin-title">本次训练</span>
        <span className="training-checkin-seq">
          {label} · 第 {done ? done.seq : nextSeq} 次
        </span>
      </div>
      <p className="training-checkin-meta">
        {last ? `上次：${last.date}` : '还没有记录，这是第一次'}
      </p>
      <p className="training-checkin-meta">
        {done
          ? `✓ 今天已完成第 ${done.seq} 次${done.noteId ? ' · 有心得' : ''}`
          : '还没打卡，点下方「完成本次训练」'}
      </p>
      {done && (
        <button type="button" className="ghost-btn small" onClick={() => onUndo(done.id)}>
          撤销打卡
        </button>
      )}
    </div>
  )
}

// 本周安排卡：固定周一推/周二拉/周三休/周四休/周五推/周六拉/周日休，
// 只记「是否完成跟练」，点击训练日进入对应计划
function WeekPlanCard({
  sessions,
  onOpenDay,
}: {
  sessions: TrainingSession[]
  onOpenDay: (day: 'push' | 'pull') => void
}) {
  const today = todayKey()
  const weekKeys = weekDateKeys(new Date())
  const weekSet = new Set(weekKeys)
  const doneThisWeek = sessions.filter((item) => weekSet.has(item.date)).length
  const todaySlot = slotFor(new Date().getDay())
  const todayDate = new Date()

  return (
    <div className="week-plan-card">
      <div className="week-plan-top">
        <span className="week-plan-title">本周安排</span>
        <span className="week-plan-progress">本周已完成 {doneThisWeek} / 4</span>
      </div>
      {todaySlot === 'rest' ? (
        <p className="week-plan-today is-rest">今天是休息日，恢复比硬练更重要</p>
      ) : (
        <button
          type="button"
          className="week-plan-today is-training"
          onClick={() => onOpenDay(todaySlot)}
        >
          今天：{slotLabel(todaySlot)} · 开始训练 →
        </button>
      )}
      <ul className="week-plan-rows">
        {WEEK_DISPLAY_ORDER.map((weekday) => {
          const slot = slotFor(weekday)
          const dateKey = weekKeys[WEEK_DISPLAY_ORDER.indexOf(weekday)]
          const done = sessions.some((item) => item.date === dateKey)
          const isToday = dateKey === today
          return (
            <li key={weekday}>
              {slot === 'rest' ? (
                <span className={`week-plan-row is-rest${isToday ? ' is-today' : ''}`}>
                  <span className="week-plan-day">{weekdayLabel(weekday)}</span>
                  <span className="week-plan-slot">休息</span>
                  <span className="week-plan-state" aria-hidden="true" />
                </span>
              ) : (
                <button
                  type="button"
                  className={`week-plan-row is-training${isToday ? ' is-today' : ''}`}
                  onClick={() => onOpenDay(slot)}
                  aria-label={`${weekdayLabel(weekday)}${slotLabel(slot)}，${done ? '已完成' : '未完成'}`}
                >
                  <span className="week-plan-day">
                    {weekdayLabel(weekday)}
                    {isToday ? ' · 今天' : ''}
                  </span>
                  <span className="week-plan-slot">{slotLabel(slot)}</span>
                  <span className={`week-plan-state${done ? ' is-done' : ''}`} aria-hidden="true">
                    {done ? '✓' : ''}
                  </span>
                </button>
              )}
            </li>
          )
        })}
      </ul>
      <p className="week-plan-note">
        90 天只跟练不研究：重量、组数记在训记，这里只记完成与否。
        今天 {todayDate.getFullYear()}/{todayDate.getMonth() + 1}/{todayDate.getDate()}
      </p>
    </div>
  )
}

// 90 天学习周期卡：开始日期、第几天/周、推拉次数、复盘里程碑
function CycleCard({
  sessions,
  onRestart,
}: {
  sessions: TrainingSession[]
  onRestart: () => void
}) {
  const info = cycleInfo(sessions, new Date())
  if (!info.started) {
    return (
      <div className="cycle-card">
        <h2 className="cycle-title">90 天学习周期</h2>
        <p className="cycle-line">完成第一次跟练后自动开始计时。</p>
      </div>
    )
  }
  return (
    <div className="cycle-card">
      <h2 className="cycle-title">90 天学习周期</h2>
      <p className="cycle-line">
        第 {info.dayNo} 天 · 第 {info.weekNo} 周 · 已完成推日 {info.pushCount} 次、拉日{' '}
        {info.pullCount} 次
      </p>
      <p className="cycle-meta">
        {info.finished
          ? '第 90 天已过：该复盘总结了，决定下一个三个月练什么。'
          : info.nextMilestone && `下一次复盘：第 ${info.nextMilestone} 天（还差 ${info.daysToMilestone} 天）`}
      </p>
      {info.finished && (
        <button
          type="button"
          className="ghost-btn small"
          onClick={() => {
            if (window.confirm('复盘完成后开启下一个 90 天周期？')) onRestart()
          }}
        >
          开启下一周期
        </button>
      )}
    </div>
  )
}

function GuideLine({ item }: { item: GuideItem }) {
  return (
    <p className="guide-line">
      <span className="guide-line-text">{item.text}</span>
    </p>
  )
}

function GuideLines({ items }: { items: GuideItem[] }) {
  return (
    <ul className="guide-lines">
      {items.map((item) => (
        <li key={item.text}>
          <span className="guide-line-text">{item.text}</span>
        </li>
      ))}
    </ul>
  )
}

function FaqList({ entries }: { entries: { q: string; a: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  return (
    <ul className="faq-list">
      {entries.map((entry, index) => (
        <li key={entry.q} className={openIndex === index ? 'faq-item is-open' : 'faq-item'}>
          <button
            type="button"
            className="faq-q"
            aria-expanded={openIndex === index}
            onClick={() => setOpenIndex((prev) => (prev === index ? null : index))}
          >
            <span>{entry.q}</span>
            <span className="faq-chevron" aria-hidden="true">
              ›
            </span>
          </button>
          {openIndex === index && (
            <p className="faq-a">
              <span className="guide-line-text">{entry.a}</span>
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}

function SeriesGuide({ onBack }: { onBack: () => void }) {
  const g = SERIES_GUIDE
  return (
    <section>
      <button className="back-btn" type="button" onClick={onBack}>
        ← {COACH_SERIES.title}
      </button>
      <h1 className="page-title">系列总纲</h1>
      <p className="page-sub">次数 / 重量 / 休息怎么安排</p>

      <div className="guide-section">
        <h2 className="guide-section-title">1 · 排课与红线</h2>
        <GuideLine item={g.schedule.split} />
        <GuideLines items={g.schedule.redLines} />
        <GuideLine item={g.schedule.exampleWeek} />
        <GuideLine item={g.schedule.threeDayWeek} />
        <GuideLines items={g.schedule.volumeCap} />
        <GuideLine item={g.schedule.frequencyWhy} />
      </div>

      <div className="guide-section">
        <h2 className="guide-section-title">2 · 一次训练流程</h2>
        <GuideLines items={g.session.steps} />
        <table className="guide-table">
          <thead>
            <tr>
              <th>类型</th>
              <th>次数</th>
              <th>组间歇</th>
            </tr>
          </thead>
          <tbody>
            {g.session.restTable.map((row) => (
              <tr key={row.type}>
                <td>{row.type}</td>
                <td>{row.reps}</td>
                <td>{row.rest}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <GuideLine item={g.session.restPrinciple} />

        <div className="plan-block">
          <h3 className="plan-block-title">{g.session.warmup.push.label}</h3>
          <GuideLines items={g.session.warmup.push.steps} />
        </div>
        <div className="plan-block">
          <h3 className="plan-block-title">{g.session.warmup.pull.label}</h3>
          <GuideLines items={g.session.warmup.pull.steps} />
        </div>
      </div>

      <div className="guide-section">
        <h2 className="guide-section-title">3 · 递进法则</h2>
        <GuideLine item={g.progression.oneLiner} />
        <GuideLines items={g.progression.start} />
        <ol className="guide-chain">
          {g.progression.chain.map((phase) => (
            <li key={phase.label}>
              <span className="guide-chain-label">{phase.label}</span>
              <span className="guide-chain-steps">{phase.steps.join(' → ')}</span>
            </li>
          ))}
        </ol>
        <GuideLine item={g.progression.advanceRule} />
        <table className="guide-table">
          <thead>
            <tr>
              <th>情况</th>
              <th>怎么办</th>
            </tr>
          </thead>
          <tbody>
            {g.progression.decisionFlow.map((row) => (
              <tr key={row.condition}>
                <td>{row.condition}</td>
                <td>{row.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <GuideLine item={g.progression.recordLoop} />
        <GuideLine item={g.progression.intraSet} />
        <GuideLines items={g.progression.setsRule} />
        <GuideLine item={g.progression.isolationNote} />
      </div>

      <div className="guide-section">
        <h2 className="guide-section-title">4 · 力竭口径</h2>
        <GuideLine item={g.failure.compound} />
        <GuideLine item={g.failure.isolation} />
        <p className="guide-motto">{g.failure.motto.text}</p>
      </div>

      <div className="guide-section">
        <h2 className="guide-section-title">5 · 减载与疲劳</h2>
        <GuideLines items={g.deload.monitoring} />
        <GuideLines items={g.deload.signals} />
        <GuideLine item={g.deload.signalRule} />
        <p className="guide-redline">{g.deload.redLine.text}</p>
        <GuideLines items={g.deload.steps} />
        <GuideLine item={g.deload.premise} />
      </div>

      <div className="guide-section">
        <h2 className="guide-section-title">6 · 一个月后微调</h2>
        <GuideLines items={g.monthTuning} />
      </div>

      <div className="guide-section">
        <h2 className="guide-section-title">7 · 名词表</h2>
        <ul className="guide-glossary">
          {g.glossary.map((entry) => (
            <li key={entry.term}>
              <span className="guide-term">{entry.term}</span>
              <span className="guide-line-text">{entry.def}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="guide-section">
        <h2 className="guide-section-title">8 · 常见问题</h2>
        <FaqList entries={g.faq} />
      </div>
    </section>
  )
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
  const trimmed = name.trim()
  // 实时重名提示（编辑时排除自身）；lib 层同名守卫做最后防线
  const duplicate = trimmed !== '' && isDuplicateExerciseName(trimmed, initial.id ?? undefined)

  return (
    <form
      className="exercise-add exercise-editor"
      onSubmit={(event) => {
        event.preventDefault()
        if (trimmed && category && !duplicate) onSave(trimmed, category)
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
      {!trimmed ? (
        <p className="field-hint">填一个动作名，再从下面选一个分类。</p>
      ) : duplicate ? (
        <p className="field-error" role="alert">
          已有同名动作，换一个名字。
        </p>
      ) : null}
      <div className="category-picks">
        {PICKABLE_CATEGORIES.map((item) => (
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
      {!category && trimmed && (
        <p className="field-hint">选一个分类（推 / 拉）。</p>
      )}
      <div className="backup-actions">
        <button
          className="save-btn add-exercise-btn"
          type="submit"
          disabled={!trimmed || !category || duplicate}
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

// 存储占用：文字数据（localStorage）+ 媒体与缓存（IndexedDB 等整源估算）
function StorageUsage() {
  const [textBytes, setTextBytes] = useState<number | null>(null)
  const [quotaText, setQuotaText] = useState<string | null>(null)

  useEffect(() => {
    let total = 0
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith('gt.v1.')) continue
      total += key.length + (localStorage.getItem(key)?.length ?? 0)
    }
    // localStorage 按 UTF-16 存，中文字符占 2 字节
    setTextBytes(total * 2)
    if (navigator.storage?.estimate) {
      navigator.storage
        .estimate()
        .then((est) => {
          if (typeof est.usage === 'number' && typeof est.quota === 'number') {
            setQuotaText(`${formatBytes(est.usage)} / 可用约 ${formatBytes(est.quota)}`)
          }
        })
        .catch(() => undefined)
    }
  }, [])

  // 估算完成前渲染同形状骨架行，避免内容突现跳动
  if (textBytes === null) {
    return (
      <p className="storage-line" aria-hidden="true">
        <span className="skeleton-line" />
      </p>
    )
  }
  return (
    <p className="storage-line">
      存储占用：文字数据 {formatBytes(textBytes)}
      {quotaText && ` · 图片/视频等媒体与缓存 ${quotaText}`}
      {!quotaText && '（本机浏览器未提供媒体用量估算）'}
    </p>
  )
}

export default function ExerciseTab({ active, onOpenNotes }: Props) {
  const [exercises, setExercises] = useState<ExerciseProfile[]>(() => getExerciseProfiles())
  const [route, setRoute] = useState<Route>({ level: 'home' })
  const [editing, setEditing] = useState<EditorState | null>(null)
  const [backupBusy, setBackupBusy] = useState(false)
  const [backupNotice, setBackupNotice] = useState<string | null>(null)
  const [sessions, setSessions] = useState(() => getSessions())
  const [recordsOpen, setRecordsOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  // 跨 tab 写心得期间为 true：切走时保留层级与路由，回来接着写前的计划页继续用
  const keepRouteRef = useRef(false)

  // 外部 tab（笔记写心得）可能改动记录，回到动作页时重读一次；
  // 回到本 tab 即结束挂起，恢复正常「切 tab 收层」的行为
  useEffect(() => {
    if (!active) return
    setSessions(getSessions())
    keepRouteRef.current = false
  }, [active])

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

  // 三层分别压一条历史记录，浏览器返回键逐层退回；
  // keepRouteRef 挂起期间切走 tab 不收层、不回退历史（跨 tab 写心得）
  useOverlayHistory(
    active,
    route.level !== 'home',
    () => {
      setEditing(null)
      setRoute({ level: 'home' })
    },
    undefined,
    () => keepRouteRef.current,
  )

  useOverlayHistory(
    active,
    route.level === 'exercise' || route.level === 'media',
    () => {
      setEditing(null)
      setRoute((prev) => {
        if (prev.level !== 'exercise' && prev.level !== 'media') return prev
        const item = exercises.find((entry) => entry.id === prev.exerciseId)
        return { level: 'category', category: item ? bucketOf(item) : 'unassigned' }
      })
    },
    undefined,
    () => keepRouteRef.current,
  )

  useOverlayHistory(
    active,
    route.level === 'media',
    () => {
      setEditing(null)
      setRoute((prev) =>
        prev.level === 'media' ? { level: 'exercise', exerciseId: prev.exerciseId } : prev,
      )
    },
    undefined,
    () => keepRouteRef.current,
  )

  useOverlayHistory(
    active,
    route.level === 'plan' || route.level === 'plan-videos',
    () => {
      setEditing(null)
      setRoute((prev) => (prev.level === 'plan' ? { level: 'coaches' } : prev))
    },
    undefined,
    () => keepRouteRef.current,
  )

  useOverlayHistory(
    active,
    route.level === 'plan-videos',
    () => {
      setEditing(null)
      setRoute((prev) => (prev.level === 'plan-videos' ? { level: 'plan', day: prev.day } : prev))
    },
    undefined,
    () => keepRouteRef.current,
  )

  useOverlayHistory(
    active,
    route.level === 'guide',
    () => {
      setEditing(null)
      setRoute((prev) => (prev.level === 'guide' ? { level: 'coaches' } : prev))
    },
    undefined,
    () => keepRouteRef.current,
  )

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

  const handleCheckin = (day: 'push' | 'pull') => {
    completeSession(day)
    ensureCycleStart(new Date())
    setSessions(getSessions())
  }

  const handleUndoCheckin = (id: string) => {
    if (!window.confirm('撤销这次打卡记录？')) return
    removeSession(id)
    setSessions(getSessions())
  }

  const handleRestartCycle = () => {
    if (!restartCycle(new Date())) return
    setSessions(getSessions())
  }

  const handleWriteNote = (day: 'push' | 'pull', label: string) => {
    // 未打卡先打卡（写心得即视为完成），拿到本次 session 供回填
    const session = completeSession(day)
    ensureCycleStart(new Date())
    setSessions(getSessions())
    writeJSON('noteSeed', {
      sessionId: session.id,
      title: `${label} · 第 ${session.seq} 次 · 训练心得`,
      text: `${session.date}\n\n`,
    })
    // 挂起本 tab 的历史层级与计划页路由：
    // 不做 history.back() 级联（避免与笔记页 pushState 竞态、不丢计划页状态），
    // 笔记草稿关闭后由 App 跳回本 tab，计划页原样续用
    keepRouteRef.current = true
    onOpenNotes()
  }

  const handleExport = async () => {
    setBackupBusy(true)
    setBackupNotice(null)
    try {
      await exportBackup()
    } catch {
      setBackupNotice('导出失败，再试一次。')
    } finally {
      setBackupBusy(false)
    }
  }

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBackupBusy(true)
    setBackupNotice(null)
    try {
      // 先完整解析并给出摘要，确认后才动手；导入过程失败会自动保留原数据
      const summary = await readBackupSummary(file)
      const when = summary.exportedAt ? `（导出于 ${summary.exportedAt.slice(0, 10)}）` : ''
      const ok = window.confirm(
        `备份内容${when}：\n` +
          `· 笔记 ${summary.notes} 条\n` +
          `· 菜谱 ${summary.recipes} 条\n` +
          `· 动作照片 ${summary.photos} 张\n` +
          `· 跟练记录 ${summary.sessions} 次\n` +
          `· 图片 ${summary.images} 张\n\n` +
          '导入会覆盖这台手机上的文字数据与图片，视频保留不受影响。\n' +
          '导入失败会自动保留现有数据。继续？',
      )
      if (!ok) {
        setBackupBusy(false)
        return
      }
      await importBackup(file)
      window.location.reload()
    } catch (error) {
      setBackupNotice(
        `导入失败，原有数据未受影响：${error instanceof Error ? error.message : '文件不是有效的备份'}`,
      )
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

  if (route.level === 'plan-videos') {
    return (
      <WarmupVideos day={route.day} onBack={() => setRoute({ level: 'plan', day: route.day })} />
    )
  }

  if (route.level === 'plan') {
    const day = findPlanDay(route.day)
    const today = todayKey()
    const done = sessions.find((item) => item.day === route.day && item.date === today)

    return (
      <section className="has-actionbar">
        <button className="back-btn" type="button" onClick={() => setRoute({ level: 'coaches' })}>
          ← {COACH_SERIES.title}
        </button>

        <div className="group-head">
          <h1 className="page-title">{day.label}</h1>
          <span className="group-count">{day.exercises.length} 个动作</span>
        </div>
        <p className="page-sub">
          {day.focus} · 按顺序练，点动作展开要点
        </p>

        <button
          type="button"
          className="warmup-video-entry"
          onClick={() => setRoute({ level: 'plan-videos', day: route.day })}
        >
          <span className="wve-icon" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none">
              <path d="M7 5.5v9l7.5-4.5L7 5.5Z" fill="currentColor" />
            </svg>
          </span>
          <span className="wve-text">
            <span className="wve-title">开练视频</span>
            <span className="wve-sub">
              {getVideos().filter((clip) => clip.exerciseId === `warmup:${route.day}`).length > 0
                ? `${getVideos().filter((clip) => clip.exerciseId === `warmup:${route.day}`).length} 条 · 开练前刷一遍预习`
                : '还没有视频，点进去上传动作示范'}
            </span>
          </span>
          <span className="wve-arrow" aria-hidden="true">
            ›
          </span>
        </button>

        <WarmupCard day={route.day} />

        <ol className={`plan-exercise-list is-${day.id}`}>
          {day.exercises.map((exercise, index) => (
            <PlanExerciseCard
              key={exercise.id}
              exercise={exercise}
              index={index}
              day={route.day}
            />
          ))}
        </ol>

        <TrainingCheckin
          day={route.day}
          label={day.label}
          sessions={sessions}
          onUndo={(id) => handleUndoCheckin(id)}
        />

        {/* 吸底操作栏：「完成本次训练」「写心得」始终可见，不用滚到页底找 */}
        <div className="plan-actionbar" role="toolbar" aria-label="本次训练操作">
          {done ? (
            <>
              <span className="plan-actionbar-done">
                ✓ 第 {done.seq} 次已完成{done.noteId ? ' · 有心得' : ''}
              </span>
              <button
                type="button"
                className="ghost-btn small"
                onClick={() => handleWriteNote(route.day, day.label)}
              >
                {done.noteId ? '再写心得' : '写心得'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="save-btn plan-actionbar-main"
                onClick={() => handleCheckin(route.day)}
              >
                完成本次训练
              </button>
              <button
                type="button"
                className="ghost-btn small"
                onClick={() => handleWriteNote(route.day, day.label)}
              >
                写心得
              </button>
            </>
          )}
        </div>
      </section>
    )
  }

  if (route.level === 'guide') {
    return <SeriesGuide onBack={() => setRoute({ level: 'coaches' })} />
  }

  if (route.level === 'coaches') {
    return (
      <section>
        <button className="back-btn" type="button" onClick={goHome}>
          ← 动作
        </button>

        <h1 className="page-title">{COACH_SERIES.title}</h1>
        <p className="page-sub">
          {COACH_SERIES.seriesName} · {COACH_SERIES.keptNote}
        </p>

        <WeekPlanCard sessions={sessions} onOpenDay={(day) => setRoute({ level: 'plan', day })} />

        <h2 className="section-title">每日计划</h2>
        <div className="plan-day-list">
          {PLAN_DAYS.map((day) => {
            const names = day.exercises.slice(0, 3).map((exercise) => exercise.name).join('、')
            return (
              <button
                key={day.id}
                type="button"
                className={`plan-day-card is-${day.id}`}
                onClick={() => setRoute({ level: 'plan', day: day.id })}
              >
                <span className="plan-day-glyph" aria-hidden="true">
                  {day.label.charAt(0)}
                </span>
                <span className="plan-day-body">
                  <span className="plan-day-name">
                    {day.label}
                    <span className="category-en">{day.en}</span>
                  </span>
                  <span className="plan-day-focus">{day.focus}</span>
                  <span className="plan-day-meta">
                    {day.exercises.length} 个动作 · {names} 等
                  </span>
                </span>
                <span className="module-row-arrow" aria-hidden="true">
                  ›
                </span>
              </button>
            )
          })}
        </div>

        <details className="coach-group">
          <summary>我的进度 · 周期与跟练统计</summary>
          <CycleCard sessions={sessions} onRestart={handleRestartCycle} />
          <div className="training-stats">
            <h2 className="training-stats-title">我的跟练</h2>
            <p className="training-stats-line">
              推日 {countByDay('push')} 次 · 拉日 {countByDay('pull')} 次 · 共 {sessions.length} 次
            </p>
            <p className="training-stats-meta">
              {sessions.length > 0
                ? `最近：${sessions[sessions.length - 1].date} ${sessions[sessions.length - 1].day === 'push' ? '推日' : '拉日'}`
                : '还没有跟练记录，打开推日或拉日开始第一次。'}
            </p>
            {sessions.length > 0 && (
              <>
                <button
                  type="button"
                  className="ghost-btn small training-stats-toggle"
                  aria-expanded={recordsOpen}
                  onClick={() => setRecordsOpen((prev) => !prev)}
                >
                  {recordsOpen ? '收起记录' : '查看记录'}
                </button>
                {recordsOpen && (
                  <ul className="training-records">
                    {[...sessions].reverse().slice(0, 20).map((item) => (
                      <li key={item.id} className="training-record">
                        <span className="training-record-text">
                          {item.day === 'push' ? '推日' : '拉日'} 第 {item.seq} 次 · {item.date}
                          {item.noteId ? ' · 有心得' : ''}
                        </span>
                        <button
                          type="button"
                          className="training-record-del"
                          aria-label="删除记录"
                          onClick={() => handleUndoCheckin(item.id)}
                        >
                          删除
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </details>

        <details className="coach-group">
          <summary>训练逻辑与系列总纲</summary>
          <div className="coach-principle">
            <h2 className="coach-principle-title">训练逻辑</h2>
            <p>{COACH_SERIES.principle}</p>
          </div>
          <button type="button" className="guide-entry" onClick={() => setRoute({ level: 'guide' })}>
            <span className="guide-entry-body">
              <span className="guide-entry-title">系列总纲 · 次数/重量/休息怎么安排</span>
              <span className="guide-entry-meta">
                递进链 · 力竭口径 · 减载5信号 · 一个月后微调 · 名词表 · FAQ
              </span>
            </span>
            <span className="module-row-arrow" aria-hidden="true">
              ›
            </span>
          </button>
        </details>

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
        <p className="page-sub">点动作进去看视频、照片和文章；详情页右上角「编辑」可以改名字和类别</p>

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
          !editing && <p className="hint group-empty">这个类别还没有动作。点上方「+ 新动作」添加一条。</p>
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
      <p className="page-sub">
        我的动作档案 + 跟练系列 · 本周安排在跟练模块里
      </p>

      <h2 className="section-title">跟练系列</h2>
      <button
        type="button"
        className="coach-card"
        onClick={() => {
          setEditing(null)
          setRoute({ level: 'coaches' })
        }}
      >
        <span className="coach-card-glyph" aria-hidden="true">
          凯谭
        </span>
        <span className="coach-card-body">
          <span className="coach-card-name">
            {COACH_SERIES.title}
            <span className="category-en">PPL SERIES</span>
          </span>
          <span className="coach-card-meta">
            推拉分化 · 推日 / 拉日各 5 个动作 · 组次与要点齐全 · 腿日已去掉
          </span>
        </span>
        <span className="module-row-arrow" aria-hidden="true">
          ›
        </span>
      </button>

      <h2 className="section-title">我的动作档案</h2>
      <div className="category-list">
        {PICKABLE_CATEGORIES.map((item) => {
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
                {unassigned.length} 个动作 · 点进去改成推或拉
              </span>
            </span>
            <span className="module-row-arrow" aria-hidden="true">
              ›
            </span>
          </button>
        )}
      </div>

      <h2 className="section-title">备份与数据</h2>
      <StorageUsage />
      {backupNotice && (
        <p className="notice notice-danger" role="alert">
          {backupNotice}
        </p>
      )}
      <p className="hint">数据只在这台手机上。换手机、清理浏览器前，先导出备份。</p>
      <p className="hint is-warn">
        ⚠️ 备份包含文字数据与图片；视频文件体积大，不进备份，换手机后需要重新上传。
      </p>
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