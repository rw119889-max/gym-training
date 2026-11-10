import { useEffect, useState } from 'react'
import { getPoster } from '../lib/storage'

interface Props {
  videoId: string
  className?: string
}

export default function VideoThumb({ videoId, className = '' }: Props) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    setUrl(null)

    getPoster(videoId)
      .then((blob) => {
        if (cancelled || !blob) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [videoId])

  if (!url) {
    return (
      <span className={`video-thumb ${className}`} aria-hidden="true">
        ▶
      </span>
    )
  }

  return <img className={`video-thumb ${className}`} src={url} alt="" />
}
