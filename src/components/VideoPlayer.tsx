import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { VideoClip } from '../types'
import { formatBytes, formatDuration } from '../lib/videos'
import { getVideo } from '../lib/storage'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { useOverlayHistory } from '../hooks/useOverlayHistory'

interface Props {
  clips: VideoClip[]
  initialIndex: number
  onClose: () => void
}

interface SlideProps {
  clip: VideoClip
  active: boolean
  load: boolean
  muted: boolean
  slow: boolean
  onToggleMute: () => void
}

function VideoSlide({ clip, active, load, muted, slow, onToggleMute }: SlideProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // 只加载当前和相邻一条，避免十几条原片同时占内存
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

export default function VideoPlayer({ clips, initialIndex, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex)
  const [muted, setMuted] = useState(true)
  const [slow, setSlow] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const trapRef = useFocusTrap<HTMLDivElement>()
  useOverlayHistory(true, true, onClose)

  const current = clips[index]

  const goTo = (next: number) => {
    if (next < 0 || next >= clips.length) return
    setIndex(next)
    const track = trackRef.current
    if (track) track.scrollTo({ top: next * track.clientHeight, behavior: 'smooth' })
  }

  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track) return
    track.scrollTop = initialIndex * track.clientHeight
  }, [initialIndex])

  useEffect(() => {
    document.body.classList.add('player-open')
    return () => document.body.classList.remove('player-open')
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      else if (event.key === 'ArrowDown') goTo(index + 1)
      else if (event.key === 'ArrowUp') goTo(index - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const onFeedScroll = () => {
    const track = trackRef.current
    if (!track || !track.clientHeight) return
    const next = Math.round(track.scrollTop / track.clientHeight)
    setIndex((value) => (value === next ? value : next))
  }

  const toggleMute = () => setMuted((value) => !value)

  if (!current) return null

  return (
    <div
      className="video-player"
      role="dialog"
      aria-modal="true"
      aria-label={current.label || '示范视频'}
      ref={trapRef}
    >
      <div className="video-player-top">
        <span className="video-player-title">{current.label || '示范视频'}</span>
        {clips.length > 1 && (
          <span className="photo-viewer-count">
            {index + 1} / {clips.length}
          </span>
        )}
        <button className="icon-btn" type="button" onClick={onClose} aria-label="关闭视频">
          ✕
        </button>
      </div>

      <div className="video-feed" ref={trackRef} onScroll={onFeedScroll}>
        {clips.map((clip, i) => (
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

      <div className="video-controls">
        <button
          className="ghost-btn small"
          type="button"
          aria-pressed={!muted}
          onClick={toggleMute}
        >
          {muted ? '声音关' : '声音开'}
        </button>
        <button
          className="ghost-btn small"
          type="button"
          aria-pressed={slow}
          onClick={() => setSlow((value) => !value)}
        >
          {slow ? '0.5x 慢放' : '1x 正常'}
        </button>
      </div>
    </div>
  )
}
