import { useEffect, useRef, useState } from 'react'
import type { Exercise, ExerciseSymptom } from '../types'
import { addSymptomLog } from '../lib/logs'
import { todayKey } from '../lib/cards'
import { clearSession, loadSession, saveSession } from '../lib/session'
import { playRestDone, unlockAudio } from '../lib/audio'
import { speak } from '../lib/speech'
import { useRestTimer } from '../hooks/useRestTimer'
import { useWakeLock } from '../hooks/useWakeLock'

const REST_SECONDS = 90

type Phase = 'pre' | 'during' | 'post' | 'rest'

interface Props {
  exercise: Exercise
  onExit: () => void
}

function formatMs(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export default function ActionCard({ exercise, onExit }: Props) {
  const [restored] = useState(() => {
    const saved = loadSession()
    return saved && saved.exerciseId === exercise.id ? saved : null
  })

  const [phase, setPhase] = useState<Phase>(restored?.phase ?? 'pre')
  const [setNo, setSetNo] = useState(restored?.setNo ?? 1)
  const [checks, setChecks] = useState<boolean[]>(() =>
    restored && restored.checks.length === exercise.preChecks.length
      ? restored.checks
      : exercise.preChecks.map(() => false),
  )
  const [cue, setCue] = useState(restored?.cue ?? exercise.cue)
  const [chosen, setChosen] = useState<ExerciseSymptom | null>(
    exercise.symptoms.find((item) => item.id === restored?.chosenSymptomId) ?? null,
  )
  const [flashing, setFlashing] = useState(false)
  const timer = useRestTimer()
  const firedRef = useRef(false)

  useWakeLock(true)

  useEffect(() => {
    saveSession({
      exerciseId: exercise.id,
      date: todayKey(),
      phase,
      setNo,
      cue,
      checks,
      chosenSymptomId: chosen?.id ?? null,
      restEndAt: phase === 'rest' ? timer.endAt : null,
    })
  }, [exercise.id, phase, setNo, cue, checks, chosen, timer.endAt])

  useEffect(() => {
    if (restored?.phase === 'rest' && restored.restEndAt) {
      timer.startAt(restored.restEndAt)
    }
  }, [])

  useEffect(() => {
    document.body.classList.add('card-open')
    return () => document.body.classList.remove('card-open')
  }, [])

  const exit = () => {
    clearSession()
    onExit()
  }

  const toggleCheck = (index: number) => {
    setChecks((prev) => prev.map((value, i) => (i === index ? !value : value)))
  }

  const startSet = () => {
    unlockAudio()
    setPhase('during')
  }

  const pickSymptom = (symptom: ExerciseSymptom | null) => {
    addSymptomLog(exercise.id, symptom ? symptom.id : null)
    setChosen(symptom)
    if (symptom) setCue(symptom.fix)
    firedRef.current = false
    timer.start(REST_SECONDS)
    setPhase('rest')
  }

  const nextSet = () => {
    timer.stop()
    setPhase('pre')
    setSetNo((n) => n + 1)
    setChecks(exercise.preChecks.map(() => false))
  }

  useEffect(() => {
    if (phase !== 'rest' || !timer.finished || firedRef.current) return
    firedRef.current = true
    playRestDone()
    setFlashing(true)
    const id = window.setTimeout(() => {
      setFlashing(false)
      nextSet()
    }, 1600)
    return () => window.clearTimeout(id)
  }, [phase, timer.finished])

  return (
    <div className={`card-mode${flashing ? ' flash' : ''}`}>
      <div className="card-top">
        <button className="icon-btn" type="button" onClick={exit} aria-label="退出动作卡">
          ✕
        </button>
        <span className="card-top-title">{exercise.name}</span>
        <span className="set-badge">第 {setNo} 组</span>
      </div>

      {phase === 'pre' && (
        <>
          <div className="card-body">
            <p className="card-kicker">组前 3 项检查 · 10 秒读完</p>
            <div className="checks">
              {exercise.preChecks.map((text, index) => (
                <button
                  key={text}
                  type="button"
                  className="check-row"
                  aria-pressed={checks[index]}
                  onClick={() => toggleCheck(index)}
                >
                  <span className="check-box" aria-hidden="true">
                    {checks[index] ? '✓' : ''}
                  </span>
                  <span>{text}</span>
                </button>
              ))}
            </div>
            <p className="cue-preview">
              本组提示：<b>{cue}</b>
            </p>
          </div>
          <div className="card-actions">
            <button className="cta" type="button" onClick={startSet}>
              开始这组
            </button>
          </div>
        </>
      )}

      {phase === 'during' && (
        <>
          <div className="card-body center">
            <p className="card-kicker">本组只做一件事</p>
            <p className="cue-huge">{cue}</p>
          </div>
          <div className="card-actions row">
            <button className="ghost-btn" type="button" onClick={() => speak(cue)}>
              朗读
            </button>
            <button className="cta" type="button" onClick={() => setPhase('post')}>
              完成这组
            </button>
          </div>
        </>
      )}

      {phase === 'post' && (
        <div className="card-body">
          <p className="card-kicker">组后 1 点自查</p>
          <h2 className="post-title">这一组哪里不对？</h2>
          <div className="symptom-btns">
            {exercise.symptoms.map((symptom) => (
              <button
                key={symptom.id}
                type="button"
                className="symptom-btn"
                onClick={() => pickSymptom(symptom)}
              >
                {symptom.label}
              </button>
            ))}
            <button className="symptom-btn ok" type="button" onClick={() => pickSymptom(null)}>
              都还好
            </button>
          </div>
        </div>
      )}

      {phase === 'rest' && (
        <>
          <div className="card-body center">
            <p className="card-kicker">休息</p>
            <p className="countdown">{formatMs(timer.remainingMs)}</p>
            <div className="next-cue">
              <p className="next-cue-label">
                下一组提示
                {chosen ? ` · 这组：${chosen.label}` : ' · 这组无问题'}
              </p>
              <p className="next-cue-text">{cue}</p>
              {chosen && <p className="next-cue-note">已作为下一组唯一提示</p>}
            </div>
          </div>
          <div className="card-actions row">
            <button className="ghost-btn" type="button" onClick={() => timer.adjust(-15)}>
              −15s
            </button>
            <button className="ghost-btn" type="button" onClick={() => timer.adjust(15)}>
              +15s
            </button>
            <button className="cta" type="button" onClick={nextSet}>
              下一组
            </button>
          </div>
        </>
      )}
    </div>
  )
}
