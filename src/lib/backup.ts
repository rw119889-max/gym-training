import { getRecipes } from './recipes'
import { getImage, putImage } from './storage'

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
    if (!recipe.imageId || images[recipe.imageId]) continue
    const blob = await getImage(recipe.imageId)
    if (blob) images[recipe.imageId] = await blobToDataUrl(blob)
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

  for (const [key, value] of Object.entries(parsed.data)) {
    if (key.startsWith(PREFIX) && typeof value === 'string') {
      localStorage.setItem(key, value)
    }
  }

  if (parsed.images && typeof parsed.images === 'object') {
    for (const [id, dataUrl] of Object.entries(parsed.images)) {
      if (typeof dataUrl !== 'string') continue
      const response = await fetch(dataUrl)
      await putImage(id, await response.blob())
    }
  }
}
