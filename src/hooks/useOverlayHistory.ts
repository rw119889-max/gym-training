import { useEffect, useRef } from 'react'

// 让全屏子视图支持安卓返回键：打开时压一条历史记录，返回键关闭它而不是退出应用。
// 只在所属 tab 可见（active）时操作历史，避免多个 tab 的 popstate 互相干扰。
export function useOverlayHistory(active: boolean, open: boolean, onClose: () => void): void {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const pushed = useRef(false)

  useEffect(() => {
    if (!active) return
    const onPop = () => {
      if (pushed.current) {
        pushed.current = false
        onCloseRef.current()
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [active])

  useEffect(() => {
    if (active && open && !pushed.current) {
      pushed.current = true
      window.history.pushState({ gtOverlay: true }, '')
    } else if ((!active || !open) && pushed.current) {
      pushed.current = false
      window.history.back()
    }
  }, [active, open])

  // 通过 ✕ / Escape 关闭（组件直接卸载）时，回收压入的那条历史，避免留下空记录。
  useEffect(() => {
    return () => {
      if (pushed.current) {
        pushed.current = false
        window.history.back()
      }
    }
  }, [])
}