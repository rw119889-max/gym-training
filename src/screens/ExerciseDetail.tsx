import { useState } from 'react'
import type { Exercise, VideoClip } from '../types'
import { GROUP_LABELS } from '../data/exercises'
import { formatDuration, getExerciseVideos } from '../lib/videos'
import VideoPlayer from '../components/VideoPlayer'
import VideoThumb from '../components/VideoThumb'

interface Props {
  exercise: Exercise
  onBack: () => void
  onStart: () => void
}

export default function ExerciseDetail({ exercise, onBack, onStart }: Props) {
  const [videos] = useState(() => getExerciseVideos(exercise.id))
  const [watching, setWatching] = useState<VideoClip | null>(null)

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

      <h2 className="section-title">示范视频</h2>
      {videos.length === 0 ? (
        <p className="hint">还没存视频。到「视频」页上传一条，休息时就能直接看。</p>
      ) : (
        <div className="video-strip">
          {videos.map((video) => (
            <button
              key={video.id}
              className="video-open"
              type="button"
              onClick={() => setWatching(video)}
            >
              <VideoThumb videoId={video.id} className="video-cover" />
              <span className="video-item-bar">
                <span className="video-item-label">{video.label || '示范'}</span>
                <span className="video-item-meta">{formatDuration(video.duration)}</span>
              </span>
            </button>
          ))}
        </div>
      )}

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

      {watching && (
        <VideoPlayer
          clip={watching}
          title={`${exercise.name} · ${watching.label || '示范'}`}
          onClose={() => setWatching(null)}
        />
      )}
    </section>
  )
}
