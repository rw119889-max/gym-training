import type { VideoClip } from '../types'
import { deletePoster, deleteVideo, readJSON, writeJSON } from './storage'

const KEY = 'videos'

export const MAX_CLIP_BYTES = 200 * 1024 * 1024
export const MAX_TOTAL_BYTES = 2 * 1024 * 1024 * 1024

export function getVideos(): VideoClip[] {
  return readJSON<VideoClip[]>(KEY, [])
}

export function getExerciseVideos(exerciseId: string): VideoClip[] {
  return getVideos().filter((video) => video.exerciseId === exerciseId)
}

export function totalVideoBytes(): number {
  return getVideos().reduce((sum, video) => sum + video.size, 0)
}

export function addVideo(video: VideoClip): void {
  writeJSON(KEY, [video, ...getVideos()])
}

export async function deleteVideoClip(id: string): Promise<void> {
  writeJSON(
    KEY,
    getVideos().filter((video) => video.id !== id),
  )
  await Promise.all([deleteVideo(id), deletePoster(id)])
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${Math.round(bytes)} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  if (bytes < 1024 * 1024 * 1024) {
    const mb = bytes / (1024 * 1024)
    return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
