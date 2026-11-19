import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { VideoClip } from '../types'
import type { PlanDay } from '../lib/coachPlans'
import {
  getVideos,
  deleteVideoClip,
  formatBytes,
  formatDuration,
  addVideo,
  updateVideo,
  totalVideoBytes,
  MAX_CLIP_BYTES,
  MAX_TOTAL_BYTES,
} from '../lib/videos'
import { getVideo, putVideo, putPoster, deleteVideo, deletePoster } from '../lib/storage'
import { inspectVideo } from '../lib/videoFile'
import VideoSlide from './VideoSlide'

interface Props {
  day: PlanDay
  onBack: () => void
}

// 开练视频：全屏沉浸 feed（黑底、视频占满整屏、上下滑动切换，类短视频体验）。
// 路由级页面（plan-videos），返回走 ExerciseTab 的 useOverlayHistory。
export default function WarmupVideos({ day, onBack }: Props) {
  const [clips, setClips] = useState<VideoClip[]>(() => getVideos())
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'warning' | 'danger'; text: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [index, setIndex] = useState(0)
  const [muted, setMuted] = useState(true)
  const [slow, setSlow] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  const owner = `warmup:${day}`
  const mine = clips
    .filter((clip) => clip.exerciseId === owner)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  const refresh = () => setClips(getVideos())

  // 全屏层期间隐藏底部导航（与 VideoPlayer 同款 body 类）
  useEffect(() => {
    document.body.classList.add('player-open')
    return () => document.body.classList.remove('player-open')
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBack])

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
          exerciseId: owner,
          label: file.name.replace(/\.[^.]+$/, '').slice(0, 30),
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
    if (editingId === clip.id) setEditingId(null)
    setIndex((value) => Math.min(value, Math.max(mine.length - 2, 0)))
    refresh()
  }

  const saveEdit = () => {
    if (!editingId) return
    updateVideo(editingId, { label: editTitle.trim() })
    setEditingId(null)
    refresh()
  }

  const toggleMute = () => setMuted((value) => !value)

  const onFeedScroll = () => {
    const track = trackRef.current
    if (!track || !track.clientHeight) return
    const next = Math.round(track.scrollTop / track.clientHeight)
    setIndex((value) => (value === next ? value : next))
  }

  const used = mine.reduce((sum, clip) => sum + clip.size, 0)

  return (
    <section className="warmup-videos" role="dialog" aria-modal="true" aria-label="开练视频">
      <div className="video-player-top">
        <button type="button" className="wv-back" onClick={onBack}>
          ← {day === 'push' ? '推日' : '拉日'}
        </button>
        <span className="video-player-title">开练视频</span>
        <span className="photo-viewer-count">{mine.length} 条</span>
        <button
          type="button"
          className="wv-chip"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? '保存中…' : '上传'}
        </button>
        {mine.length > 0 && (
          <button
            type="button"
            className="wv-chip"
            aria-pressed={manageOpen}
            onClick={() => setManageOpen((value) => !value)}
          >
            {manageOpen ? '收起' : '管理'}
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="video/*" multiple hidden onChange={handleFiles} />

      {notice && (
        <p className={`notice notice-${notice.tone}`} role="status">
          {notice.text}
        </p>
      )}

      {mine.length === 0 ? (
        <div className="wv-empty">
          <p className="wv-empty-title">还没有视频</p>
          <p className="wv-empty-sub">点右上「上传」，一次可以选多条。开练前上下滑动刷一遍预习。</p>
          <button
            type="button"
            className="wv-chip wv-chip-big"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            {busy ? '保存中…' : '上传视频'}
          </button>
        </div>
      ) : (
        <>
          <div className="video-feed" ref={trackRef} onScroll={onFeedScroll}>
            {mine.map((clip, i) => (
              <div className="video-slide" key={clip.id}>
                <VideoSlide
                  clip={clip}
                  active={i === index}
                  load={Math.abs(i - index) <= 1}
                  muted={muted}
                  slow={slow}
                  onToggleMute={toggleMute}
                />
              </div>
            ))}
          </div>

          <p className="wv-pos">
            {index + 1} / {mine.length} · 上下滑动切换 · 点视频开声音
          </p>

          <div className="video-controls">
            <button type="button" className="wv-chip" aria-pressed={!muted} onClick={toggleMute}>
              {muted ? '声音关' : '声音开'}
            </button>
            <button
              type="button"
              className="wv-chip"
              aria-pressed={slow}
              onClick={() => setSlow((value) => !value)}
            >
              {slow ? '0.5x 慢放' : '1x 正常'}
            </button>
          </div>

          {manageOpen && (
            <div className="wv-manage">
              <ul className="warmup-video-list">
                {mine.map((clip) =>
                  editingId === clip.id ? (
                    <li key={clip.id} className="media-edit-card">
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
                        <button className="wv-chip" type="button" onClick={() => setEditingId(null)}>
                          取消
                        </button>
                      </div>
                    </li>
                  ) : (
                    <li key={clip.id} className="warmup-video-row">
                      <span className="warmup-video-row-text">
                        <span className="warmup-video-row-name">{clip.label || '未命名视频'}</span>
                        <span className="warmup-video-row-meta">
                          {formatDuration(clip.duration)} · {formatBytes(clip.size)}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="wv-chip"
                        aria-label={`改标题 ${clip.label || '未命名视频'}`}
                        onClick={() => {
                          setEditingId(clip.id)
                          setEditTitle(clip.label)
                        }}
                      >
                        改名
                      </button>
                      <button
                        type="button"
                        className="wv-chip is-danger"
                        aria-label={`删除 ${clip.label || '未命名视频'}`}
                        onClick={() => void handleDelete(clip)}
                      >
                        删除
                      </button>
                    </li>
                  ),
                )}
              </ul>
              <p className="wv-hint">
                共 {formatBytes(used)}。视频不进备份，删了网站数据就没了，原片请留在相册。
              </p>
            </div>
          )}
        </>
      )}
    </section>
  )
}
