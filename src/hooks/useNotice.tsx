import { useEffect, useState } from 'react'

type NoticeTone = 'danger' | 'warning' | 'info' | 'success'

interface NoticeState {
  text: string
  tone: NoticeTone
  at: number
}

/**
 * 把 window.alert 迁成 inline notice 的通用 hook。
 * 返回 node 直接放进 JSX；show(text, tone) 触发，6 秒后自动消隐。
 * key 用时间戳：同一文案连续触发两次也能重新弹出动画。
 */
export function useNotice(autoDismissMs = 6000) {
  const [notice, setNotice] = useState<NoticeState | null>(null)

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), autoDismissMs)
    return () => clearTimeout(timer)
  }, [notice, autoDismissMs])

  const show = (text: string, tone: NoticeTone = 'danger') =>
    setNotice({ text, tone, at: Date.now() })

  const node = notice ? (
    <div key={notice.at} className={`notice notice-${notice.tone}`} role="alert">
      <span>{notice.text}</span>
    </div>
  ) : null

  return { show, node }
}
