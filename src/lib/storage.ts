const PREFIX = 'gt.v1.'

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
  } catch {
    // 存储被禁用或写满时静默失败，本次会话仍可继续使用
  }
}

const DB_NAME = 'gym-training'
const DB_VERSION = 1
const IMAGE_STORE = 'images'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(IMAGE_STORE)) {
        db.createObjectStore(IMAGE_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function putImage(id: string, blob: Blob): Promise<void> {
  const db = await openDB()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IMAGE_STORE, 'readwrite')
      tx.objectStore(IMAGE_STORE).put(blob, id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export async function getImage(id: string): Promise<Blob | undefined> {
  const db = await openDB()
  try {
    return await new Promise<Blob | undefined>((resolve, reject) => {
      const request = db.transaction(IMAGE_STORE, 'readonly').objectStore(IMAGE_STORE).get(id)
      request.onsuccess = () => resolve(request.result as Blob | undefined)
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

export async function deleteImage(id: string): Promise<void> {
  const db = await openDB()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IMAGE_STORE, 'readwrite')
      tx.objectStore(IMAGE_STORE).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}
