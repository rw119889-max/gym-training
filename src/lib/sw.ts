// Service Worker 的注册与更新。
// 关键点：站点是纯静态托管、没有下发 Cache-Control，更新是否生效完全取决于这里。

export type UpdateCheckResult = 'updated' | 'latest' | 'offline'

const ENABLED = import.meta.env.PROD && typeof navigator !== 'undefined' && 'serviceWorker' in navigator

let updateReady = false
const listeners = new Set<() => void>()

function markUpdateReady() {
  if (updateReady) return
  updateReady = true
  listeners.forEach((listener) => listener())
}

export function subscribeUpdate(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getUpdateReady(): boolean {
  return updateReady
}

export function bootServiceWorker(): void {
  registerServiceWorker(markUpdateReady)
}

function registerServiceWorker(onUpdateReady: () => void): void {
  if (!ENABLED) return

  // 首次安装也会触发 controllerchange，只有「本来就有 controller」才算更新
  const hadController = Boolean(navigator.serviceWorker.controller)
  let interacted = false
  const markInteracted = () => {
    interacted = true
  }
  document.addEventListener('pointerdown', markInteracted, { once: true, capture: true })
  document.addEventListener('keydown', markInteracted, { once: true, capture: true })

  try {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // 用户还没开始操作，说明刚打开页面，直接换到新版本最省事
      if (hadController && !interacted) {
        const KEY = 'gt.v1.autoReload'
        if (sessionStorage.getItem(KEY)) {
          onUpdateReady()
          return
        }
        sessionStorage.setItem(KEY, '1')
        window.location.reload()
        return
      }
      onUpdateReady()
    })
  } catch {
    // 忽略
  }

  const register = async () => {
    try {
      // updateViaCache: 'none' —— 让 sw.js 本体也绕过 HTTP 缓存，
      // 否则新版本可能要等浏览器缓存过期才会被发现。
      const registration = await navigator.serviceWorker.register('./sw.js', {
        updateViaCache: 'none',
      })

      if (registration.waiting) onUpdateReady()

      registration.addEventListener('updatefound', () => {
        const next = registration.installing
        if (!next) return
        next.addEventListener('statechange', () => {
          // 已有 controller 说明这是「更新」而不是首次安装
          if (next.state === 'installed' && navigator.serviceWorker.controller) onUpdateReady()
        })
      })

      // 从后台切回前台时顺带检查一次，限频 5 分钟
      let lastCheck = Date.now()
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return
        if (Date.now() - lastCheck < 5 * 60 * 1000) return
        lastCheck = Date.now()
        registration.update().catch(() => undefined)
      })
    } catch {
      // 注册失败（无痕模式、被策略禁用）不影响应用本体
    }
  }

  if (document.readyState === 'complete') void register()
  else window.addEventListener('load', () => void register(), { once: true })
}

// 手动检查：点版本号时调用
export async function checkForUpdate(): Promise<UpdateCheckResult> {
  if (!ENABLED) return 'latest'
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return 'latest'
    await registration.update()
    if (registration.waiting || registration.installing) {
      markUpdateReady()
      return 'updated'
    }
    return 'latest'
  } catch {
    return 'offline'
  }
}

// 加载新版本
export async function applyUpdate(): Promise<void> {
  updateReady = false
  if (ENABLED) {
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      registration?.waiting?.postMessage({ type: 'SKIP_WAITING' })
    } catch {
      // 忽略：直接重载也能拿到新版本
    }
  }
  window.location.reload()
}

// 兜底：注销 SW 并清掉 Cache Storage 后重载。
// 只清缓存，不动 localStorage / IndexedDB 里的用户数据。
export async function forceRefresh(): Promise<void> {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((registration) => registration.unregister()))
    const keys = await caches.keys()
    await Promise.all(keys.map((key) => caches.delete(key)))
  } catch {
    // 清不掉也照样重载
  }
  window.location.reload()
}
