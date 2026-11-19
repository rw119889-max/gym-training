import { useEffect, useRef, useState } from 'react'
import type { VideoClip } from '../types'
import { formatBytes, formatDuration } from '../lib/videos'
import { getVideo } from '../lib/storage'

export interface VideoSlideProps {
  clip: VideoClip
  active: boolean
  load: boolean
  muted: boolean
  slow: boolean
  onToggleMute: () => void
}

// 竖向滑动视频的单帧：只加载当前和相邻一条，避免十几条原片同时占内存。
// VideoPlayer（动作/菜谱全屏播放）与 WarmupVideos（开练视频页内 feed）共用。
export default function VideoSlide({ clip, active, load, muted, slow, onToggleMute }: VideoSlideProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!load) {
      setUrl(null)
      setMissing(false)
      return
    }
    let objectUrl: string | null = null
    let cancelled = false

    getVideo(clip.id)
      .then((blob) => {
        if (cancelled) return
        if (!blob) {
          setMissing(true)
          return
        }
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setMissing(true)
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [clip.id, load])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !url) return
    video.muted = muted
    if (!active) {
      video.pause()
      return
    }
    video.playbackRate = slow ? 0.5 : 1
    void video.play().catch(() => undefined)
  }, [active, url, muted, slow])

  return (
    <>
      <div className="video-slide-stage">
        {url ? (
          <video ref={videoRef} src={url} playsInline loop onClick={onToggleMute} />
        ) : missing ? (
          <p className="video-missing">视频不在了，可能被系统清理过。</p>
        ) : (
          <p className="video-missing">加载中…</p>
        )}
      </div>
      <p className="video-slide-meta">
        {clip.label || '未命名视频'} · {formatDuration(clip.duration)} · {formatBytes(clip.size)}
      </p>
    </>
  )
}
