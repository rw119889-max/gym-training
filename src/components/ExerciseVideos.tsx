import { useEffect, useState } from 'react'
import type { VideoClip } from '../types'
import { exerciseProfileName, getExerciseProfiles } from '../lib/exerciseProfiles'
import { PLAN_DAYS } from '../lib/coachPlans'
import { deleteVideoClip, formatBytes, formatDuration, getVideos, updateVideo } from '../lib/videos'
import VideoPlayer from './VideoPlayer'
import VideoThumb from './VideoThumb'

interface Props {
  exerciseId: string
}

const COACH_EXERCISE_IDS = new Set(
  PLAN_DAYS.flatMap((day) => day.exercises.map((exercise) => exercise.id)),
)

// 动作详情里的视频展示：上传已收敛到推/拉日「开练视频」页（WarmupVideos），
// 这里只负责看已绑定的视频和整理旧视频。没有视频时整块不渲染。
export default function ExerciseVideos({ exerciseId }: Props) {
  const [clips, setClips] = useState<VideoClip[]>(() => getVideos())
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const refresh = () => setClips(getVideos())

  useEffect(() => {
    setClips(getVideos())
    setEditingId(null)
    setPlayingId(null)
  }, [exerciseId])

  const mine = clips.filter((clip) => clip.exerciseId === exerciseId)
  const playingIndex = playingId ? mine.findIndex((clip) => clip.id === playingId) : -1
  const profiles = getExerciseProfiles()
  const orphans = clips.filter(
    (clip) =>
      // 菜谱（recipe:）与开练视频（warmup:）有自己的归属，不算孤儿
      !clip.exerciseId.startsWith('recipe:') &&
      !clip.exerciseId.startsWith('warmup:') &&
      !COACH_EXERCISE_IDS.has(clip.exerciseId) &&
      !profiles.some((item) => item.id === clip.exerciseId),
  )

  if (mine.length === 0 && orphans.length === 0) return null

  const handleDelete = async (clip: VideoClip) => {
    if (!window.confirm('只删除 App 内保存的副本，不会删除相册原片。删除后需重新上传。继续？')) return
    await deleteVideoClip(clip.id)
    if (playingId === clip.id) setPlayingId(null)
    if (editingId === clip.id) setEditingId(null)
    refresh()
  }

  const saveEdit = () => {
    if (!editingId) return
    updateVideo(editingId, { label: editTitle.trim() })
    setEditingId(null)
    refresh()
  }

  const moveHere = (clip: VideoClip) => {
    updateVideo(clip.id, { exerciseId })
    refresh()
  }

  const used = clips.reduce((sum, clip) => sum + clip.size, 0)

  return (
    <>
      {mine.length > 0 && (
        <div className="video-grid">
          {mine.map((clip) =>
            editingId === clip.id ? (
              <div key={clip.id} className="media-edit-card">
                <input
                  className="field-input"
                  value={editTitle}
                  maxLength={30}
                  autoFocus
                  onChange={(event) => setEditTitle(event.target.value)}
                />
                <div className="media-edit-actions">
                  <button className="save-btn" type="button" onClick={saveEdit}>
                    保存
                  </button>
                  <button className="ghost-btn small" type="button" onClick={() => setEditingId(null)}>
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <div key={clip.id} className="video-item">
                <button className="video-open" type="button" onClick={() => setPlayingId(clip.id)}>
                  <VideoThumb videoId={clip.id} />
                  <span className="video-item-bar">
                    <span className="video-item-label">{clip.label || '未命名视频'}</span>
                    <span className="video-item-meta">
                      {formatDuration(clip.duration)} · {formatBytes(clip.size)}
                    </span>
                  </span>
                </button>
                <button
                  className="video-edit"
                  type="button"
                  aria-label={`改标题 ${clip.label || '未命名视频'}`}
                  onClick={() => {
                    setEditingId(clip.id)
                    setEditTitle(clip.label)
                  }}
                >
                  改
                </button>
                <button
                  className="video-delete"
                  type="button"
                  aria-label={`删除 ${clip.label || '未命名视频'}`}
                  onClick={() => void handleDelete(clip)}
                >
                  ×
                </button>
              </div>
            ),
          )}
        </div>
      )}

      {orphans.length > 0 && (
        <details className="fold fold-sub">
          <summary>
            其他动作的视频 <span className="fold-count">{orphans.length}</span>
          </summary>
          <div className="fold-body">
            <p className="hint">以前绑在已移除动作上的视频。可以移到当前动作，或直接删掉。</p>
            {orphans.map((clip) => (
              <div key={clip.id} className="orphan-row">
                <span className="orphan-name">
                  {exerciseProfileName(clip.exerciseId)} · {clip.label || formatDuration(clip.duration)}
                </span>
                <button className="ghost-btn small" type="button" onClick={() => moveHere(clip)}>
                  移到这里
                </button>
                <button className="note-action" type="button" onClick={() => void handleDelete(clip)}>
                  ×
                </button>
              </div>
            ))}
          </div>
        </details>
      )}

      {mine.length > 0 && (
        <p className="hint video-usage">
          视频 {formatBytes(used)}。视频不进备份，删了网站数据就没了，原片请留在相册。
        </p>
      )}

      {playingIndex >= 0 && (
        <VideoPlayer
          clips={mine}
          initialIndex={playingIndex}
          onClose={() => setPlayingId(null)}
        />
      )}
    </>
  )
}
