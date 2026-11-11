import { useEffect, useRef, useState } from 'react'
import type { VideoClip } from '../types'
import { getVideo } from '../lib/storage'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { useOverlayHistory } from '../hooks/useOverlayHistory'

interface Props {
  clip: VideoClip
  title: string
  onClose: () => void
}

export default function VideoPlayer({ clip, title, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  const [muted, setMuted] = useState(true)
  const [slow, setSlow] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const trapRef = useFocusTrap<HTMLDivElement>()
  useOverlayHistory(true, true, onClose)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    setUrl(null)
    setMissing(false)

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
  }, [clip.id])

  useEffect(() => {
    document.body.classList.add('player-open')
    return () => document.body.classList.remove('player-open')
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (video) video.playbackRate = slow ? 0.5 : 1
  }, [slow, url])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    const video = videoRef.current
    if (video) {
      video.muted = next
      if (!next) void video.play()
    }
  }

  return (
    <div className="video-player" role="dialog" aria-modal="true" aria-label={title} ref={trapRef}>
      <div className="video-player-top">
        <span className="video-player-title">{title}</span>
        <button className="icon-btn" type="button" onClick={onClose} aria-label="关闭视频">
          ✕
        </button>
      </div>

      <div className="video-stage">
        {url ? (
          <video ref={videoRef} src={url} playsInline autoPlay loop muted={muted} onClick={toggleMute} />
        ) : missing ? (
          <p className="video-missing">视频不在了，可能被系统清理过。</p>
        ) : (
          <p className="video-missing">加载中…</p>
        )}
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
