// 菜谱视频：上传 / 列表 / 删除 / 播放。
// 复用 videos.ts 存储（exerciseId 存 recipe:<id>，与动作视频同库不同前缀）。
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { VideoClip } from '../types'
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
} from '../lib/videos'
import { deletePoster, deleteVideo, getVideo, putPoster, putVideo } from '../lib/storage'
import { getRecipe } from '../lib/recipes'
import VideoPlayer from './VideoPlayer'
import VideoThumb from './VideoThumb'
import { useNotice } from '../hooks/useNotice'

interface Props {
  recipeId: string
}

export function recipeVideoOwner(recipeId: string): string {
  return `recipe:${recipeId}`
}

export default function RecipeVideos({ recipeId }: Props) {
  const owner = recipeVideoOwner(recipeId)
  const [clips, setClips] = useState<VideoClip[]>(() => getVideos())
  const [busy, setBusy] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const { show: showNotice, node: noticeNode } = useNotice()
  const fileRef = useRef<HTMLInputElement>(null)

  const mine = clips.filter((clip) => clip.exerciseId === owner)
  const playingIndex = playingId ? mine.findIndex((clip) => clip.id === playingId) : -1

  const refresh = () => setClips(getVideos())

  // 新建菜谱没保存就离开：清掉刚传的视频，避免留下孤儿文件
  useEffect(() => {
    return () => {
      if (!getRecipe(recipeId)) {
        for (const clip of getVideos().filter((item) => item.exerciseId === owner)) {
          void deleteVideoClip(clip.id)
        }
      }
    }
  }, [recipeId, owner])

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    if (files.length === 0) return

    const oversize = files.filter((file) => file.size > MAX_CLIP_BYTES)
    if (oversize.length > 0 && !window.confirm(`有 ${oversize.length} 条超过 200 MB，确定都存到手机上？`)) {
      return
    }
    const incoming = files.reduce((sum, file) => sum + file.size, 0)
    if (totalVideoBytes() + incoming > MAX_TOTAL_BYTES && !window.confirm('视频一共要超过 2 GB 了。建议先删掉几条不常用的，继续？')) {
      return
    }

    setBusy(true)
    if (navigator.storage?.persist) void navigator.storage.persist().catch(() => undefined)
    let failed = 0
    let quota = false
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
      showNotice(
        quota
          ? '手机空间不够了。先删几条视频，或者清理空间后再传。'
          : `有 ${failed} 条视频没存上，先转成 MP4（H.264）再试。`,
        quota ? 'warning' : 'danger',
      )
    }
  }

  const handleDelete = async (clip: VideoClip) => {
    if (!window.confirm('只删除 App 内保存的副本，不会删除相册原片。删除后需重新上传。继续？')) return
    await deleteVideoClip(clip.id)
    if (playingId === clip.id) setPlayingId(null)
    refresh()
  }

  return (
    <div className="recipe-videos">
      <h3 className="plan-block-title">做法视频</h3>
      {noticeNode}
      <div className="backup-actions">
        <button
          className="ghost-btn small"
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? '保存中…' : '+ 上传视频'}
        </button>
        <input ref={fileRef} type="file" accept="video/*" multiple hidden onChange={handleFiles} />
      </div>
      <p className="hint">原片直接存本机，不压缩。可一次选多条。</p>
      {mine.length === 0 ? (
        <p className="field-hint">还没有视频。做这道菜的示范片段传上来，做饭前点开看。</p>
      ) : (
        <div className="video-grid">
          {mine.map((clip) => (
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
                className="video-delete"
                type="button"
                aria-label={`删除 ${clip.label || '未命名视频'}`}
                onClick={() => void handleDelete(clip)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {playingIndex >= 0 && (
        <VideoPlayer
          clips={mine}
          initialIndex={playingIndex}
          onClose={() => setPlayingId(null)}
        />
      )}
    </div>
  )
}
