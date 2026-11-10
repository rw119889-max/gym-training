import { useCallback, useEffect, useRef, useState } from 'react'

interface RestTimer {
  remainingMs: number
  running: boolean
  finished: boolean
  start: (seconds: number) => void
  stop: () => void
  adjust: (seconds: number) => void
}

export function useRestTimer(): RestTimer {
  const [endAt, setEndAt] = useState<number | null>(null)
  const [remainingMs, setRemainingMs] = useState(0)
  const endAtRef = useRef<number | null>(null)

  const sync = useCallback(() => {
    if (endAtRef.current === null) return
    setRemainingMs(Math.max(0, endAtRef.current - Date.now()))
  }, [])

  useEffect(() => {
    if (endAt === null) return
    sync()
    const id = window.setInterval(sync, 250)
    document.addEventListener('visibilitychange', sync)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [endAt, sync])

  const start = useCallback((seconds: number) => {
    endAtRef.current = Date.now() + seconds * 1000
    setEndAt(endAtRef.current)
    setRemainingMs(seconds * 1000)
  }, [])

  const stop = useCallback(() => {
    endAtRef.current = null
    setEndAt(null)
    setRemainingMs(0)
  }, [])

  const adjust = useCallback((seconds: number) => {
    if (endAtRef.current === null) return
    endAtRef.current = endAtRef.current + seconds * 1000
    setEndAt(endAtRef.current)
    sync()
  }, [sync])

  const finished = endAt !== null && remainingMs === 0 && Date.now() >= endAt

  return { remainingMs, running: endAt !== null, finished, start, stop, adjust }
}
