import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { VideoClip } from '../types'
import { exerciseProfileName, getExerciseProfiles } from '../lib/exerciseProfiles'
import { PLAN_DAYS } from '../lib/coachPlans'
import { inspectVideo } from '../lib/videoFile'
import {
  addVideo,
  deleteVideoClip,
  formatBytes,
  formatDuration,
  getVideos,
  MAX_CLIP_BYTES,
  MAX_TOTAL_BYTES,
  totalVideoBytes,
  updateVideo,
} from '../lib/videos'
import { deletePoster, deleteVideo, getVideo, putPoster, putVideo } from '../lib/storage'
import VideoPlayer from './VideoPlayer'
import VideoThumb from './VideoThumb'

interface Props {
  exerciseId: string
  // 动作档案的视频二级页显示上传入口；计划页动作卡下方不显示（避免大块视频区占屏）
  showUpload?: boolean
}

const COACH_EXERCISE_IDS = new Set(
  PLAN_DAYS.flatMap((day) => day.exercises.map((exercise) => exercise.id)),
)

export default function ExerciseVideos({ exerciseId, showUpload = false }: Props) {
  const [clips, setClips] = useState<VideoClip[]>(() => getVideos())
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ tone: 'warning' | 'danger'; text: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const refresh = () => setClips(getVideos())

  useEffect(() => {
    setClips(getVideos())
    setAdding(false)
    setTitle('')
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

  // 计划页动作卡下方：没视频就不渲染。视频二级页即使空也要渲染上传入口
  if (mine.length === 0 && orphans.length === 0 && !showUpload) return null

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    if (files.length === 0) return

    const oversize = files.filter((file) => file.size > MAX_CLIP_BYTES)
    if (
      oversize.length > 0 &&
      !window.confirm(`有 ${oversize.length} 条超过 200 MB，确定都存到手机上？`)
    ) {
      return
    }
    const incoming = files.reduce((sum, file) => sum + file.size, 0)
    if (
      totalVideoBytes() + incoming > MAX_TOTAL_BYTES &&
      !window.confirm('视频一共要超过 2 GB 了。建议先删掉几条不常用的，继续？')
    ) {
      return
    }

    setBusy(true)
    setNotice(null)
    let failed = 0
    let quota = false
    if (navigator.storage?.persist) void navigator.storage.persist().catch(() => undefined)
    for (const file of files) {
      try {
        const info = await inspectVideo(file)
        if (!info.playable) {
          failed += 1
          continue
        }
        const id = `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        await putVideo(id, file)
        if (info.poster) await putPoster(id, info.poster)
        const saved = await getVideo(id)
        if (!saved) {
          await Promise.all([deleteVideo(id), deletePoster(id)])
          failed += 1
          continue
        }
        addVideo({
          id,
          exerciseId,
          label: title.trim(),
          size: file.size,
          duration: Math.round(info.duration),
          createdAt: new Date().toISOString(),
        })
      } catch (error) {
        if (error instanceof DOMException && error.name === 'QuotaExceededError') quota = true
        failed += 1
      }
    }
    setBusy(false)
    refresh()
    setAdding(false)
    setTitle('')
    if (failed > 0) {
      setNotice(
        quota
          ? { tone: 'warning', text: '手机空间不够了。先删几条视频，或者清理空间后再传。' }
          : { tone: 'danger', text: `有 ${failed} 条视频没存上，先转成 MP4（H.264）再试。` },
      )
    }
  }

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
      {notice && (
        <p className={`notice notice-${notice.tone}`} role="status">
          {notice.text}
        </p>
      )}

      {showUpload && (
        adding ? (
          <div className="video-upload">
            <label className="field">
              <span className="field-label">标题（可留空，之后能改）</span>
              <input
                className="field-input"
                value={title}
                maxLength={30}
                placeholder="如：侧面起杠 / 最后一组"
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <div className="backup-actions">
              <button
                className="ghost-btn small"
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                {busy ? '保存中…' : '选择视频（可多选）'}
              </button>
              <button
                className="ghost-btn small"
                type="button"
                disabled={busy}
                onClick={() => {
                  setAdding(false)
                  setTitle('')
                }}
              >
                取消
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              multiple
              hidden
              onChange={(event) => void handleFiles(event)}
            />
            <p className="hint">原片直接存本机，不压缩。一次可选多条，标题之后逐条改。</p>
          </div>
        ) : (
          <button className="ghost-btn small video-add" type="button" onClick={() => setAdding(true)}>
            + 上传视频
          </button>
        )
      )}

      {mine.length === 0 ? (
        showUpload ? (
          <p className="hint">还没有视频。把示范片段传上来，休息时点开循环看。</p>
        ) : null
      ) : (
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
