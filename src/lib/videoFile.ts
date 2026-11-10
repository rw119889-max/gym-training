export interface VideoInfo {
  duration: number
  playable: boolean
  poster: Blob | null
}

function waitForMetadata(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve, reject) => {
    if (video.readyState >= 1) {
      resolve()
      return
    }
    const timer = window.setTimeout(() => reject(new Error('metadata timeout')), 8000)
    video.onloadedmetadata = () => {
      window.clearTimeout(timer)
      resolve()
    }
    video.onerror = () => {
      window.clearTimeout(timer)
      reject(new Error('decode failed'))
    }
  })
}

async function capturePoster(video: HTMLVideoElement): Promise<Blob | null> {
  try {
    const target = Math.min(0.5, Math.max(0.1, (video.duration || 1) / 3))
    await new Promise<void>((resolve) => {
      const timer = window.setTimeout(resolve, 2000)
      video.onseeked = () => {
        window.clearTimeout(timer)
        resolve()
      }
      video.currentTime = target
    })

    const width = video.videoWidth
    const height = video.videoHeight
    if (!width || !height) return null

    const scale = Math.min(1, 480 / width)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)
    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.72))
  } catch {
    return null
  }
}

export async function inspectVideo(file: File): Promise<VideoInfo> {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.preload = 'auto'
  video.muted = true
  video.playsInline = true
  video.src = url
  try {
    await waitForMetadata(video)
    const playable = !file.type || video.canPlayType(file.type) !== ''
    const duration = Number.isFinite(video.duration) ? video.duration : 0
    const poster = playable ? await capturePoster(video) : null
    return { duration, playable, poster }
  } catch {
    return { duration: 0, playable: false, poster: null }
  } finally {
    URL.revokeObjectURL(url)
    video.removeAttribute('src')
  }
}
