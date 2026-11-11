import { getRecipes } from './recipes'
import { getPhotos } from './exercisePhotos'
import { clearImages, getImage, putImage } from './storage'

const PREFIX = 'gt.v1.'
const VERSION = 1
// 视频文件在 IndexedDB，元数据单独备份会变成一堆打不开的空记录
const LOCAL_ONLY_KEYS = new Set(['gt.v1.videos'])

interface BackupFile {
  version: number
  exportedAt: string
  data: Record<string, string>
  images: Record<string, string>
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export async function exportBackup(): Promise<void> {
  const data: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith(PREFIX) || LOCAL_ONLY_KEYS.has(key)) continue
    const value = localStorage.getItem(key)
    if (value !== null) data[key] = value
  }

  const images: Record<string, string> = {}
  for (const recipe of getRecipes()) {
    for (const id of recipe.imageIds) {
      if (images[id]) continue
      const blob = await getImage(id)
      if (blob) images[id] = await blobToDataUrl(blob)
    }
  }
  for (const photo of getPhotos()) {
    if (images[photo.id]) continue
    const blob = await getImage(photo.id)
    if (blob) images[photo.id] = await blobToDataUrl(blob)
  }

  const payload: BackupFile = {
    version: VERSION,
    exportedAt: new Date().toISOString(),
    data,
    images,
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `gym-training-backup-${payload.exportedAt.slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function importBackup(file: File): Promise<void> {
  const parsed = JSON.parse(await file.text()) as Partial<BackupFile>
  if (parsed.version !== VERSION || !parsed.data || typeof parsed.data !== 'object') {
    throw new Error('备份文件格式不对')
  }

  // 整库替换：清掉备份覆盖的文字数据（视频元数据保留在本机），再写入备份
  const stale: string[] = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (key && key.startsWith(PREFIX) && !LOCAL_ONLY_KEYS.has(key)) stale.push(key)
  }
  for (const key of stale) localStorage.removeItem(key)

  for (const [key, value] of Object.entries(parsed.data)) {
    if (key.startsWith(PREFIX) && !LOCAL_ONLY_KEYS.has(key) && typeof value === 'string') {
      localStorage.setItem(key, value)
    }
  }

  await clearImages()
  if (parsed.images && typeof parsed.images === 'object') {
    for (const [id, dataUrl] of Object.entries(parsed.images)) {
      if (typeof dataUrl !== 'string') continue
      const response = await fetch(dataUrl)
      await putImage(id, await response.blob())
    }
  }
}
