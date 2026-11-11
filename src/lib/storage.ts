const PREFIX = 'gt.v1.'

let storageWarned = false

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
    storageWarned = false
  } catch {
    // 空间满或被禁用时不静默丢数据：提示一次，直到下一次成功写入再复位
    if (!storageWarned) {
      storageWarned = true
      window.alert('手机存储写入失败（可能空间已满）。这次改动可能没保存，请导出备份并清理空间后重试。')
    }
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    // 同上
  }
}

const DB_NAME = 'gym-training'
const DB_VERSION = 2
const IMAGE_STORE = 'images'
const VIDEO_STORE = 'videos'
const POSTER_STORE = 'videoPosters'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      for (const store of [IMAGE_STORE, VIDEO_STORE, POSTER_STORE]) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store)
        }
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function putBlob(store: string, id: string, blob: Blob): Promise<void> {
  const db = await openDB()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite')
      tx.objectStore(store).put(blob, id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

async function getBlob(store: string, id: string): Promise<Blob | undefined> {
  const db = await openDB()
  try {
    return await new Promise<Blob | undefined>((resolve, reject) => {
      const request = db.transaction(store, 'readonly').objectStore(store).get(id)
      request.onsuccess = () => resolve(request.result as Blob | undefined)
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

async function deleteBlob(store: string, id: string): Promise<void> {
  const db = await openDB()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite')
      tx.objectStore(store).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

async function clearStore(store: string): Promise<void> {
  const db = await openDB()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite')
      tx.objectStore(store).clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export const putImage = (id: string, blob: Blob) => putBlob(IMAGE_STORE, id, blob)
export const getImage = (id: string) => getBlob(IMAGE_STORE, id)
export const deleteImage = (id: string) => deleteBlob(IMAGE_STORE, id)
export const clearImages = () => clearStore(IMAGE_STORE)

export const putVideo = (id: string, blob: Blob) => putBlob(VIDEO_STORE, id, blob)
export const getVideo = (id: string) => getBlob(VIDEO_STORE, id)
export const deleteVideo = (id: string) => deleteBlob(VIDEO_STORE, id)

export const putPoster = (id: string, blob: Blob) => putBlob(POSTER_STORE, id, blob)
export const getPoster = (id: string) => getBlob(POSTER_STORE, id)
export const deletePoster = (id: string) => deleteBlob(POSTER_STORE, id)
