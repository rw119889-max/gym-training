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
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

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

  const seekTo = (seconds: number) => {
    const video = videoRef.current
    if (!video) return
    const max = effectiveDuration(video)
    if (max <= 0) return
    video.currentTime = Math.min(Math.max(seconds, 0), max)
  }

  // MP4 正常带 duration；流式 webm（如浏览器录制）duration/seekable 末端都可能是
  // Infinity——只接受有限正值，并在 timeupdate 里持续同步（seekable 随播放增长）
  const syncDuration = (video: HTMLVideoElement): number => {
    let d = 0
    if (Number.isFinite(video.duration) && video.duration > 0) {
      d = video.duration
    } else {
      try {
        const end = video.seekable.end(video.seekable.length - 1)
        if (Number.isFinite(end) && end > 0) d = end
      } catch {
        /* seekable 未就绪 */
      }
    }
    if (d > 0) setDuration((prev) => (Math.abs(prev - d) > 0.05 ? d : prev))
    return d
  }

  // 进度条上限：实测时长 > 元数据时长
  const effectiveDuration = (video: HTMLVideoElement): number => syncDuration(video) || clip.duration

  const maxDuration = duration || clip.duration
  const canSeek = url && maxDuration > 0

  return (
    <>
      <div className="video-slide-stage">
        {url ? (
          <video
            ref={videoRef}
            src={url}
            playsInline
            loop
            onClick={onToggleMute}
            onTimeUpdate={(e) => {
              setCurrentTime(e.currentTarget.currentTime)
              syncDuration(e.currentTarget)
            }}
            onLoadedMetadata={(e) => syncDuration(e.currentTarget)}
            onDurationChange={(e) => syncDuration(e.currentTarget)}
          />
        ) : missing ? (
          <p className="video-missing">视频不在了，可能被系统清理过。</p>
        ) : (
          <p className="video-missing">加载中…</p>
        )}
      </div>
      <div className="video-seek">
        <button
          type="button"
          className="video-seek-btn"
          aria-label="后退 10 秒"
          disabled={!canSeek}
          onClick={() => seekTo(currentTime - 10)}
        >
          −10s
        </button>
        <div className="video-seek-track">
          <input
            type="range"
            min={0}
            max={Math.max(maxDuration, 0.1)}
            step={0.1}
            value={Math.min(currentTime, maxDuration)}
            aria-label="视频进度"
            disabled={!canSeek}
            onChange={(e) => seekTo(Number(e.target.value))}
          />
          <span className="video-seek-time">
            {formatDuration(currentTime)} / {formatDuration(maxDuration || clip.duration)}
          </span>
        </div>
        <button
          type="button"
          className="video-seek-btn"
          aria-label="快进 10 秒"
          disabled={!canSeek}
          onClick={() => seekTo(currentTime + 10)}
        >
          +10s
        </button>
      </div>
      <p className="video-slide-meta">
        {clip.label || '未命名视频'} · {formatDuration(clip.duration)} · {formatBytes(clip.size)}
      </p>
    </>
  )
}
