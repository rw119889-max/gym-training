import { useState } from 'react'
import type { Exercise, ExerciseGroup, VideoClip } from '../types'
import { GROUP_LABELS } from '../data/exercises'
import {
  deleteExercise,
  isCustomExercise,
  updateExercise,
} from '../lib/exercises'
import { deleteVideoClip, formatDuration, getExerciseVideos } from '../lib/videos'
import VideoPlayer from '../components/VideoPlayer'
import VideoThumb from '../components/VideoThumb'

interface Props {
  exercise: Exercise
  backLabel?: string
  onBack: () => void
  onStart: () => void
  onChanged: () => void
  onDeleted: () => void
}

export default function ExerciseDetail({
  exercise,
  backLabel = '← 动作库',
  onBack,
  onStart,
  onChanged,
  onDeleted,
}: Props) {
  const [videos] = useState(() => getExerciseVideos(exercise.id))
  const [watching, setWatching] = useState<VideoClip | null>(null)
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(exercise.name)
  const [draftCue, setDraftCue] = useState(exercise.cue)
  const [draftGroup, setDraftGroup] = useState<ExerciseGroup>(exercise.group)
  const custom = isCustomExercise(exercise.id)

  const startEdit = () => {
    setDraftName(exercise.name)
    setDraftCue(exercise.cue)
    setDraftGroup(exercise.group)
    setEditing(true)
  }

  const saveEdit = () => {
    const name = draftName.trim()
    if (!name) return
    updateExercise(exercise.id, { name, cue: draftCue, group: draftGroup })
    onChanged()
    setEditing(false)
  }

  const handleDelete = async () => {
    if (!window.confirm(`删除「${exercise.name}」这个动作？`)) return
    if (
      videos.length > 0 &&
      !window.confirm(`这个动作下还有 ${videos.length} 条视频，会一起删掉。继续？`)
    ) {
      return
    }
    for (const clip of videos) await deleteVideoClip(clip.id)
    deleteExercise(exercise.id)
    onDeleted()
  }

  if (editing) {
    return (
      <section>
        <div className="editor-top">
          <h1 className="page-title">编辑动作</h1>
          <button className="save-btn" type="button" disabled={!draftName.trim()} onClick={saveEdit}>
            保存
          </button>
        </div>

        <label className="field">
          <span className="field-label">动作名称</span>
          <input
            className="field-input"
            value={draftName}
            maxLength={20}
            autoFocus
            onChange={(event) => setDraftName(event.target.value)}
          />
        </label>

        {custom ? (
          <>
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
            <label className="field cue-edit-field">
              <span className="field-label">本组唯一提示</span>
              <input
                className="field-input"
                value={draftCue}
                maxLength={30}
                onChange={(event) => setDraftCue(event.target.value)}
              />
            </label>
          </>
        ) : (
          <p className="hint">内置动作只改名称，组前检查和提示保持不变。</p>
        )}

        <button className="text-btn" type="button" onClick={() => setEditing(false)}>
          取消
        </button>
      </section>
    )
  }

  return (
    <section>
      <button className="back-btn" type="button" onClick={onBack}>
        {backLabel}
      </button>

      <header className="detail-head">
        <h1 className="page-title">{exercise.name}</h1>
        <span className="group-tag">{GROUP_LABELS[exercise.group]}</span>
        <button className="ghost-btn small head-edit" type="button" onClick={startEdit}>
          编辑
        </button>
      </header>

      <div className="cue-box">
        <p className="cue-box-label">本组唯一提示</p>
        <p className="cue-box-text">{exercise.cue}</p>
      </div>

      <div className="feeling-box">
        <p className="cue-box-label">应该感觉到</p>
        <p className="cue-box-text">{exercise.targetFeeling}</p>
      </div>

      <h2 className="section-title">安全提醒</h2>
      <ul className="safety-list">
        {exercise.safetyNotes.map((note) => <li key={note}>{note}</li>)}
      </ul>

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
              <VideoThumb videoId={video.id} />
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

      {exercise.commonMistakes.length > 0 && (
        <>
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
        </>
      )}

      <div className="detail-cta">
        <button className="cta" type="button" onClick={onStart}>
          开始这个动作
        </button>
      </div>

      {custom && (
        <button className="text-btn" type="button" onClick={() => void handleDelete()}>
          删除这个动作
        </button>
      )}

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
