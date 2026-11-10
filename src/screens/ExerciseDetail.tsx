import type { Exercise } from '../types'
import { GROUP_LABELS } from '../data/exercises'

interface Props {
  exercise: Exercise
  onBack: () => void
  onStart: () => void
}

export default function ExerciseDetail({ exercise, onBack, onStart }: Props) {
  return (
    <section className="detail-page">
      <button className="back-btn" type="button" onClick={onBack}>
        ← 动作库
      </button>

      <header className="detail-head">
        <h1 className="page-title">{exercise.name}</h1>
        <span className="group-tag">{GROUP_LABELS[exercise.group]}</span>
      </header>

      <div className="cue-box">
        <p className="cue-box-label">本组唯一提示</p>
        <p className="cue-box-text">{exercise.cue}</p>
      </div>

      <h2 className="section-title">组前 3 项检查</h2>
      <ol className="detail-checks">
        {exercise.preChecks.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ol>

      <h2 className="section-title">哪里不对 → 怎么改</h2>
      <ul className="symptom-map">
        {exercise.symptoms.map((symptom) => (
          <li key={symptom.id}>
            <span className="symptom-map-label">{symptom.label}</span>
            <span className="symptom-map-fix">{symptom.fix}</span>
          </li>
        ))}
      </ul>

      <h2 className="section-title">常见错误</h2>
      <div className="mistakes">
        {exercise.commonMistakes.map((mistake) => (
          <details key={mistake.name} className="mistake">
            <summary>{mistake.name}</summary>
            <dl>
              <dt>症状</dt>
              <dd>{mistake.symptom}</dd>
              <dt>原因</dt>
              <dd>{mistake.cause}</dd>
              <dt>纠正</dt>
              <dd>{mistake.fix}</dd>
            </dl>
          </details>
        ))}
      </div>

      <div className="detail-cta">
        <button className="cta" type="button" onClick={onStart}>
          开始这个动作
        </button>
      </div>
    </section>
  )
}
