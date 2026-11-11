import { useEffect, useState } from 'react'
import type { Exercise, ExerciseSymptom, VideoClip } from '../types'
import { addSymptomLog } from '../lib/logs'
import { todayKey } from '../lib/date'
import { clearSession, loadSession, saveSession } from '../lib/session'
import { speak } from '../lib/speech'
import { getExerciseVideos } from '../lib/videos'
import { useWakeLock } from '../hooks/useWakeLock'
import { useFocusTrap } from '../hooks/useFocusTrap'
import VideoPlayer from '../components/VideoPlayer'

type Phase = 'pre' | 'during' | 'post' | 'rest'

interface Props {
  exercise: Exercise
  onExit: () => void
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
  const [videos] = useState(() => getExerciseVideos(exercise.id))
  const [watching, setWatching] = useState<VideoClip | null>(null)
  const trapRef = useFocusTrap<HTMLDivElement>()

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
    })
  }, [exercise.id, phase, setNo, cue, checks, chosen])

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
    setPhase('during')
  }

  const pickSymptom = (symptom: ExerciseSymptom | null) => {
    addSymptomLog(exercise.id, symptom ? symptom.id : null)
    setChosen(symptom)
    if (symptom) setCue(symptom.fix)
    setPhase('rest')
  }

  const nextSet = () => {
    setPhase('pre')
    setSetNo((n) => n + 1)
    setChecks(exercise.preChecks.map(() => false))
  }

  return (
    <div className="card-mode" ref={trapRef}>
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
          <p className="card-safety">如果出现锐痛、麻木或疼痛持续加重，不要继续硬做。</p>
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
            <p className="card-kicker">休息 · 下一组别再犯</p>
            <p className="rest-hint">组间计时和铃声用训记的，这里只留提示</p>
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
            {videos.length > 0 && (
              <button className="ghost-btn" type="button" onClick={() => setWatching(videos[0])}>
                看示范
              </button>
            )}
            <button className="cta" type="button" onClick={nextSet}>
              开始下一组
            </button>
          </div>
        </>
      )}

      {watching && (
        <VideoPlayer
          clip={watching}
          title={`${exercise.name} · ${watching.label || '示范'}`}
          onClose={() => setWatching(null)}
        />
      )}
    </div>
  )
}
