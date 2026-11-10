import { useState } from 'react'
import { CARDS } from '../data/cards'
import { EXERCISES } from '../data/exercises'
import type { CardProgress, KnowledgeCard } from '../types'
import {
  completeCard,
  dueDate,
  earliestDue,
  formatDateLabel,
  loadProgress,
  pickDueCard,
  saveProgress,
  todayKey,
} from '../lib/cards'

interface DoneState {
  card: KnowledgeCard
  nextDue: string
  exerciseName: string | null
}

export default function KnowledgeTab() {
  const [progress, setProgress] = useState<CardProgress[]>(() => loadProgress())
  const [done, setDone] = useState<DoneState | null>(null)

  const finishedToday = progress.find((entry) => entry.lastUsed === todayKey())
  const card = done || finishedToday ? null : pickDueCard(progress)
  const nextDue = earliestDue(progress)

  const finish = (target: KnowledgeCard, exerciseId: string | null) => {
    const updated = completeCard(progress, target.id, exerciseId)
    saveProgress(updated)
    setProgress(updated)
    setDone({
      card: target,
      nextDue: dueDate(updated[0]),
      exerciseName: exerciseId
        ? EXERCISES.find((exercise) => exercise.id === exerciseId)?.name ?? null
        : null,
    })
  }

  const completedCard = done
    ? done.card
    : finishedToday
      ? CARDS.find((item) => item.id === finishedToday.cardId) ?? null
      : null
  const completedDue = done ? done.nextDue : finishedToday ? dueDate(finishedToday) : null

  if (completedCard && completedDue) {
    const suffix = done
      ? done.exerciseName
        ? ` · 用在${done.exerciseName}`
        : ' · 只读'
      : ''
    return (
      <section>
        <h1 className="page-title">今天用上了</h1>
        <p className="page-sub">
          《{completedCard.title}》{suffix}
        </p>

        <div className="empty">
          <p className="empty-title">明天再来</p>
          <p className="empty-desc">下一张到期：{formatDateLabel(completedDue)}</p>
        </div>

        <p className="hint">
          已学 {progress.length} / {CARDS.length} 张
        </p>
      </section>
    )
  }

  if (!card) {
    return (
      <section>
        <h1 className="page-title">知识</h1>
        <p className="page-sub">每天一张 · 用一次</p>

        <div className="empty">
          <p className="empty-title">今天的卡已经用完</p>
          <p className="empty-desc">
            {nextDue ? `下一张 ${formatDateLabel(nextDue)} 到期。` : '明天开始新的卡片。'}
            看完就用一次，比收藏有用。
          </p>
        </div>

        <p className="hint">
          已学 {progress.length} / {CARDS.length} 张
        </p>
      </section>
    )
  }

  return (
    <section>
      <h1 className="page-title">知识</h1>
      <p className="page-sub">每天一张 · 用一次</p>

      <article className="knowledge-card">
        <p className="card-kicker">今日一张</p>
        <h2 className="knowledge-title">{card.title}</h2>
        <p className="knowledge-summary">{card.summary}</p>
        <ul className="knowledge-body">
          {card.body.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <div className="knowledge-apply">
          <span className="knowledge-apply-label">今天怎么用</span>
          <p>{card.apply}</p>
        </div>
      </article>

      <p className="section-title">今天用在哪一组？</p>
      <div className="knowledge-choices">
        {EXERCISES.map((exercise) => (
          <button
            key={exercise.id}
            type="button"
            className="ghost-btn"
            onClick={() => finish(card, exercise.id)}
          >
            {exercise.name}
          </button>
        ))}
      </div>
      <button className="text-btn" type="button" onClick={() => finish(card, null)}>
        今天只读，用不上
      </button>

      <p className="hint">
        已学 {progress.length} / {CARDS.length} 张 · 明天见
      </p>
    </section>
  )
}
