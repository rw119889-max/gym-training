import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { VideoClip } from '../types'
import { getExercises, getRecentExerciseIds, markRecentExercise } from '../lib/exercises'
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
import VideoPlayer from '../components/VideoPlayer'
import VideoThumb from '../components/VideoThumb'

interface Props {
  active: boolean
}

export default function VideoTab({ active }: Props) {
  const [clips, setClips] = useState<VideoClip[]>(() => getVideos())
  const [exercises, setExercises] = useState(() => getExercises())
  const [playing, setPlaying] = useState<VideoClip | null>(null)
  const [adding, setAdding] = useState(false)
  const [editingClip, setEditingClip] = useState<VideoClip | null>(null)
  const [exerciseId, setExerciseId] = useState(() => {
    const available = getExercises()
    const recent = getRecentExerciseIds().find((id) => available.some((exercise) => exercise.id === id))
    return recent ?? available[0]?.id ?? ''
  })
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [usage, setUsage] = useState<StorageEstimate | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const refresh = () => setClips(getVideos())

  useEffect(() => {
    if (!active) return
    setExercises(getExercises())
    setClips(getVideos())
  }, [active])

  useEffect(() => {
    let cancelled = false
    if (!navigator.storage?.estimate) return
    navigator.storage
      .estimate()
      .then((value) => {
        if (!cancelled) setUsage(value)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [clips])

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!exerciseId) {
      window.alert('先到「训练」页添加一个动作，视频才能绑定。')
      return
    }

    if (
      file.size > MAX_CLIP_BYTES &&
      !window.confirm(`这条视频 ${formatBytes(file.size)}，超过 200 MB。确定存到手机上？`)
    ) {
      return
    }
    if (
      totalVideoBytes() + file.size > MAX_TOTAL_BYTES &&
      !window.confirm('视频一共要超过 2 GB 了。建议先删掉几条不常用的，继续？')
    ) {
      return
    }

    setBusy(true)
    try {
      const info = await inspectVideo(file)
      if (!info.playable) {
        window.alert('这个视频这台手机可能播不了，先转成 MP4（H.264）再传。')
        return
      }

      if (navigator.storage?.persist) void navigator.storage.persist().catch(() => undefined)
      const id = `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      await putVideo(id, file)
      if (info.poster) await putPoster(id, info.poster)
      const saved = await getVideo(id)
      if (!saved) {
        await Promise.all([deleteVideo(id), deletePoster(id)])
        throw new Error('video-save-verification-failed')
      }
      markRecentExercise(exerciseId)
      addVideo({
        id,
        exerciseId,
        label: label.trim(),
        size: file.size,
        duration: Math.round(info.duration),
        createdAt: new Date().toISOString(),
      })
      refresh()
      setAdding(false)
      setLabel('')
    } catch (error) {
      const quota = error instanceof DOMException && error.name === 'QuotaExceededError'
      window.alert(
        quota ? '手机空间不够了。先删几条视频，或者清理空间后再传。' : '保存失败，换一条再试。',
      )
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (video: VideoClip) => {
    if (!window.confirm('只删除 App 内保存的副本，不会删除相册原片。删除后需重新上传。继续？')) return
    await deleteVideoClip(video.id)
    if (playing?.id === video.id) setPlaying(null)
    if (editingClip?.id === video.id) setEditingClip(null)
    refresh()
  }

  const startEditClip = (clip: VideoClip) => {
    setAdding(false)
    setEditingClip(clip)
    setExerciseId(clip.exerciseId)
    setLabel(clip.label)
  }

  const saveEditClip = () => {
    if (!editingClip) return
    updateVideo(editingClip.id, { exerciseId, label: label.trim() })
    if (playing?.id === editingClip.id) setPlaying(null)
    setEditingClip(null)
    setLabel('')
    refresh()
  }

  const exerciseName = (id: string) =>
    exercises.find((exercise) => exercise.id === id)?.name ?? '已删除的动作'
  const groups = exercises
    .map((exercise) => ({
      key: exercise.id,
      name: exercise.name,
      videos: clips.filter((clip) => clip.exerciseId === exercise.id),
    }))
    .filter((group) => group.videos.length > 0)
  const orphaned = clips.filter(
    (clip) => !exercises.some((exercise) => exercise.id === clip.exerciseId),
  )
  if (orphaned.length > 0) {
    groups.push({ key: '__orphaned__', name: '已删除的动作（可删除或改绑）', videos: orphaned })
  }

  const used = clips.reduce((sum, clip) => sum + clip.size, 0)

  return (
    <section>
      <h1 className="page-title">视频</h1>
      <p className="page-sub">动作不熟就点开看 · 一个动作可以存多条</p>

      {editingClip ? (
        <div className="video-upload">
          <label className="field">
            <span className="field-label">动作</span>
            <select
              className="field-input"
              value={exerciseId}
              onChange={(event) => setExerciseId(event.target.value)}
            >
              {exercises.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">标注（可选）</span>
            <input
              className="field-input"
              value={label}
              maxLength={20}
              placeholder="如：侧面 / 起杠 / 最后一组"
              onChange={(event) => setLabel(event.target.value)}
            />
          </label>
          <div className="backup-actions">
            <button className="save-btn" type="button" onClick={saveEditClip}>
              保存
            </button>
            <button
              className="ghost-btn small"
              type="button"
              onClick={() => {
                setEditingClip(null)
                setLabel('')
              }}
            >
              取消
            </button>
          </div>
        </div>
      ) : adding ? (
        <div className="video-upload">
          <label className="field">
            <span className="field-label">动作</span>
            <select
              className="field-input"
              value={exerciseId}
              onChange={(event) => setExerciseId(event.target.value)}
            >
              {exercises.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">标注（可选）</span>
            <input
              className="field-input"
              value={label}
              maxLength={20}
              placeholder="如：侧面 / 起杠 / 最后一组"
              onChange={(event) => setLabel(event.target.value)}
            />
          </label>
          <div className="backup-actions">
            <button
              className="ghost-btn small"
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              {busy ? '保存中…' : '选择视频'}
            </button>
            <button
              className="ghost-btn small"
              type="button"
              disabled={busy}
              onClick={() => setAdding(false)}
            >
              取消
            </button>
          </div>
          <input ref={fileRef} type="file" accept="video/*" hidden onChange={handleFile} />
          <p className="hint">原片直接存本机，不压缩。建议先在相册裁到 15–60 秒，超过 200 MB 会提示。</p>
        </div>
      ) : exercises.length > 0 ? (
        <button className="ghost-btn small video-add" type="button" onClick={() => setAdding(true)}>
          + 上传视频
        </button>
      ) : null}

      {exercises.length === 0 && (
        <p className="hint">还没有动作。先到「训练」页添加动作，视频才能绑定。</p>
      )}

      {groups.length === 0 && !adding && !editingClip ? (
        <div className="empty">
          <p className="empty-title">还没有视频</p>
          <p className="empty-desc">
            把常练动作的示范片段传上来。组间休息时点开，循环看几遍，不用再去别的平台搜。
          </p>
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.key} className="video-group">
            <h2 className="section-title">{group.name}</h2>
            <div className="video-grid">
              {group.videos.map((video) => (
                <div key={video.id} className="video-item">
                  <button className="video-open" type="button" onClick={() => setPlaying(video)}>
                    <VideoThumb videoId={video.id} />
                    <span className="video-item-bar">
                      <span className="video-item-label">{video.label || '示范'}</span>
                      <span className="video-item-meta">
                        {formatDuration(video.duration)} · {formatBytes(video.size)}
                      </span>
                    </span>
                  </button>
                  <button
                    className="video-edit"
                    type="button"
                    aria-label={`修改 ${video.label || '视频'}`}
                    onClick={() => startEditClip(video)}
                  >
                    改
                  </button>
                  <button
                    className="video-delete"
                    type="button"
                    aria-label={`删除 ${video.label || '视频'}`}
                    onClick={() => void handleDelete(video)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <p className="hint video-usage">
        视频 {formatBytes(used)}
        {usage?.usage ? ` · 本应用共占 ${formatBytes(usage.usage)}` : ''}
        。视频不进备份，删了网站数据就没了，原片请留在相册。
      </p>

      {playing && (
        <VideoPlayer
          clip={playing}
          title={`${exerciseName(playing.exerciseId)} · ${playing.label || '示范'}`}
          onClose={() => setPlaying(null)}
        />
      )}
    </section>
  )
}
