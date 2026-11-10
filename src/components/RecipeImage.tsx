import { useEffect, useState } from 'react'
import { getImage } from '../lib/storage'

interface Props {
  imageId: string | null
  alt: string
  className?: string
}

export default function RecipeImage({ imageId, alt, className = '' }: Props) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    setUrl(null)
    if (!imageId) return

    getImage(imageId)
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
  }, [imageId])

  if (!url) {
    return <div className={`recipe-image placeholder ${className}`}>暂无图片</div>
  }

  return <img className={`recipe-image ${className}`} src={url} alt={alt} />
}
