// 菜谱视频：上传 / 列表 / 删除 / 播放。
// 复用 videos.ts 存储（exerciseId 存 recipe:<id>，与动作视频同库不同前缀）。
import { useEffect, useRef, useState } from 'react'
import type { VideoClip } from '../types'
import { deleteVideoClip, formatBytes, formatDuration, getVideos } from '../lib/videos'
import { getRecipe } from '../lib/recipes'
import VideoPlayer from './VideoPlayer'
import VideoThumb from './VideoThumb'
import { useNotice } from '../hooks/useNotice'
import { useVideoUpload } from '../hooks/useVideoUpload'

interface Props {
  recipeId: string
}

export function recipeVideoOwner(recipeId: string): string {
  return `recipe:${recipeId}`
}

export default function RecipeVideos({ recipeId }: Props) {
  const owner = recipeVideoOwner(recipeId)
  const [clips, setClips] = useState<VideoClip[]>(() => getVideos())
  const [playingId, setPlayingId] = useState<string | null>(null)
  const { show: showNotice, node: noticeNode } = useNotice()
  const fileRef = useRef<HTMLInputElement>(null)

  const mine = clips.filter((clip) => clip.exerciseId === owner)
  const playingIndex = playingId ? mine.findIndex((clip) => clip.id === playingId) : -1

  const refresh = () => setClips(getVideos())
  const { busy, handleFiles } = useVideoUpload({ owner, onNotice: showNotice, onDone: refresh })

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
