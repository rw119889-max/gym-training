import { useEffect } from 'react'

interface WakeLockSentinelLike {
  release: () => Promise<void>
}

interface WakeLockLike {
  request: (type: 'screen') => Promise<WakeLockSentinelLike>
}

export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const wakeLock = (navigator as Navigator & { wakeLock?: WakeLockLike }).wakeLock
    if (!wakeLock) return

    let sentinel: WakeLockSentinelLike | null = null
    let disposed = false

    const request = async () => {
      if (disposed || document.visibilityState !== 'visible') return
      try {
        sentinel = await wakeLock.request('screen')
      } catch {
        // 不支持或被拒绝时静默降级，不影响流程
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void request()
    }

    void request()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      disposed = true
      document.removeEventListener('visibilitychange', onVisibility)
      if (sentinel) void sentinel.release().catch(() => undefined)
    }
  }, [active])
}
