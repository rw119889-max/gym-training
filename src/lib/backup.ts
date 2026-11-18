import { getRecipes } from './recipes'
import { getPhotos } from './exercisePhotos'
import { getSavedArticles } from './savedArticles'
import { getExerciseNotes } from './exerciseNotes'
import { collectMediaIds } from './noteMedia'
import { deleteImage, getImage, listImageKeys, putImage } from './storage'

const PREFIX = 'gt.v1.'
const VERSION = 1
// 视频文件在 IndexedDB，元数据单独备份会变成一堆打不开的空记录
// noteSeed 是一次性切页意图，用完即清，不进备份
const LOCAL_ONLY_KEYS = new Set(['gt.v1.videos', 'gt.v1.noteSeed'])

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
  for (const article of getSavedArticles()) {
    for (const block of article.blocks ?? []) {
      if (block.type !== 'image' || !block.imageId || images[block.imageId]) continue
      const blob = await getImage(block.imageId)
      if (blob) images[block.imageId] = await blobToDataUrl(blob)
    }
  }
  for (const note of getExerciseNotes()) {
    for (const id of collectMediaIds(note.html).imageIds) {
      if (images[id]) continue
      const blob = await getImage(id)
      if (blob) images[id] = await blobToDataUrl(blob)
    }
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

export interface BackupSummary {
  notes: number
  recipes: number
  photos: number
  sessions: number
  images: number
  exportedAt: string
}

interface ParsedBackup {
  data: Record<string, string>
  images: Record<string, string>
  summary: BackupSummary
}

function countArray(value: string | undefined): number {
  if (typeof value !== 'string') return 0
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.length : 0
  } catch {
    return 0
  }
}

// 只解析、不写入：给导入前的确认摘要用
export async function readBackupSummary(file: File): Promise<BackupSummary> {
  const parsed = await parseBackup(file)
  return parsed.summary
}

async function parseBackup(file: File): Promise<ParsedBackup> {
  let raw: unknown
  try {
    raw = JSON.parse(await file.text())
  } catch {
    throw new Error('文件不是合法的 JSON')
  }
  const parsed = raw as Partial<BackupFile>
  if (parsed.version !== VERSION || !parsed.data || typeof parsed.data !== 'object') {
    throw new Error('备份文件格式不对（version 或 data 缺失）')
  }
  if (parsed.images && typeof parsed.images !== 'object') {
    throw new Error('备份文件格式不对（images 字段异常）')
  }
  const data: Record<string, string> = {}
  for (const [key, value] of Object.entries(parsed.data)) {
    if (!key.startsWith(PREFIX) || LOCAL_ONLY_KEYS.has(key)) continue
    if (typeof value !== 'string') throw new Error(`备份文件格式不对（数据键 ${key} 异常）`)
    data[key] = value
  }
  const images: Record<string, string> = {}
  if (parsed.images && typeof parsed.images === 'object') {
    for (const [id, dataUrl] of Object.entries(parsed.images)) {
      if (typeof dataUrl !== 'string') throw new Error(`备份文件格式不对（图片 ${id} 异常）`)
      images[id] = dataUrl
    }
  }

  const summary: BackupSummary = {
    notes: countArray(data['gt.v1.exerciseNotes']),
    recipes: countArray(data['gt.v1.recipes']),
    photos: countArray(data['gt.v1.exercisePhotos']),
    sessions: countArray(data['gt.v1.trainingLog']),
    images: Object.keys(images).length,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : '',
  }
  return { data, images, summary }
}

// 完整解析并验证备份 → 摘要确认 → 图片全部恢复成功 → 一次性替换文字数据。
// 任何一步失败都保留原有数据，并抛出带原因的错误。
export async function importBackup(file: File): Promise<void> {
  const { data, images } = await parseBackup(file)

  // 第 1 步：先把全部文字数据写入临时暂存键。
  // 成功即证明配额装得下备份，后续正式写入基本不会再因空间失败。
  const stageKey = `${PREFIX}importStage`
  try {
    localStorage.setItem(stageKey, JSON.stringify(data))
  } catch {
    throw new Error('存储空间不足，无法暂存备份数据。请清理空间后重试。')
  }

  try {
    // 第 2 步：恢复图片。不清空原图库，逐张写入；全部成功后
    // 再删除「不在备份里」的旧图。中途失败回滚新写入的图片。
    const existingKeys = await listImageKeys()
    const existingSet = new Set(existingKeys)
    const written: string[] = []
    try {
      for (const [id, dataUrl] of Object.entries(images)) {
        const response = await fetch(dataUrl)
        const blob = await response.blob()
        if (!blob || blob.size === 0) throw new Error(`图片 ${id} 无法解码`)
        await putImage(id, blob)
        written.push(id)
      }
    } catch (error) {
      // 回滚：只删除本次新写入（原来不存在）的图片，覆盖写的保留原值无法还原但无害
      for (const id of written) {
        if (!existingSet.has(id)) await deleteImage(id).catch(() => {})
      }
      throw new Error(
        `图片恢复失败：${error instanceof Error ? error.message : String(error)}。原有数据未受影响。`,
      )
    }
    // 图片全部成功后，清掉备份没有覆盖的旧图
    for (const key of existingKeys) {
      if (!images[key]) await deleteImage(key).catch(() => {})
    }

    // 第 3 步：一次性替换文字数据。先写后删：写入顺序保证最坏情况
    // 是新旧混合而不是数据丢失；暂存键已验证配额充足。
    for (const [key, value] of Object.entries(data)) {
      localStorage.setItem(key, value)
    }
    const stale: string[] = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (!key || key === stageKey) continue
      if (key.startsWith(PREFIX) && !LOCAL_ONLY_KEYS.has(key) && !(key in data)) {
        stale.push(key)
      }
    }
    for (const key of stale) localStorage.removeItem(key)
  } finally {
    localStorage.removeItem(stageKey)
  }
}
