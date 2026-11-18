import { useEffect, useRef } from 'react'

// 全屏子视图打开时压一条带层级的历史记录；返回键只关闭最上层那一层。
// 只在所属 tab 可见（active）时操作历史，避免多个 tab 的 popstate 互相干扰。
// keepOnHide：切走 tab 时保留层级与路由（跨 tab 写心得场景），
// 不做 history.back() 级联——否则连续 back 会与目标 tab 的 pushState 竞态，
// 且会把来源页的路由状态一起冲掉。回来时层级原样续用，历史栈自洽。
export function useOverlayHistory(
  active: boolean,
  open: boolean,
  onClose: () => void,
  canClose?: () => boolean,
  keepOnHide?: () => boolean,
): void {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const canCloseRef = useRef(canClose)
  canCloseRef.current = canClose
  const keepOnHideRef = useRef(keepOnHide)
  keepOnHideRef.current = keepOnHide
  const depthRef = useRef<number | null>(null)
  const aliveRef = useRef(false)
  const cleanupTimer = useRef<number | null>(null)

  useEffect(() => {
    if (!active) return
    const onPop = (event: PopStateEvent) => {
      const depth = depthRef.current
      if (depth === null) return
      const target =
        typeof event.state?.gtOverlayDepth === 'number' ? event.state.gtOverlayDepth : 0
      if (target < depth) {
        if (canCloseRef.current && !canCloseRef.current()) {
          // 上层拒绝关闭（比如有未保存内容）：把刚退回的一层补回来，下次返回再问
          window.history.pushState({ gtOverlay: true, gtOverlayDepth: depth }, '')
          return
        }
        depthRef.current = null
        onCloseRef.current()
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [active])

  useEffect(() => {
    aliveRef.current = true
    if (cleanupTimer.current !== null) {
      window.clearTimeout(cleanupTimer.current)
      cleanupTimer.current = null
    }
    if (active && open && depthRef.current === null) {
      const base =
        typeof window.history.state?.gtOverlayDepth === 'number'
          ? window.history.state.gtOverlayDepth
          : 0
      depthRef.current = base + 1
      window.history.pushState({ gtOverlay: true, gtOverlayDepth: base + 1 }, '')
  } else if ((!active || !open) && depthRef.current !== null) {
    if (!active && keepOnHideRef.current?.()) {
      // 挂起保留：层级与路由都不动，历史栈里这条记录仍归本 tab 所有
      return
    }
    depthRef.current = null
    window.history.back()
    // 切到别的 tab 时把上层视图一起收掉，避免切回来又停在旧二级页
    if (!active) onCloseRef.current()
  }
  }, [active, open])

  // 通过 ✕ / Escape 关闭（组件直接卸载）时，回收压入的那条历史，避免留下空记录。
  // StrictMode 会卸载后再挂回来，所以延后一拍确认是真卸载；重挂时沿用原来的层级，不重复压栈。
  useEffect(() => {
    return () => {
      if (depthRef.current === null) return
      aliveRef.current = false
      const depth = depthRef.current
      cleanupTimer.current = window.setTimeout(() => {
        cleanupTimer.current = null
        if (aliveRef.current) return
        depthRef.current = null
        if (window.history.state?.gtOverlayDepth === depth) window.history.back()
      }, 0)
    }
  }, [])
}
