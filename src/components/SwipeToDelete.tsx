// 左滑删除手势（通用）：滑过 48px 露出「继续向左删除」提示，滑过 120px 松手弹确认；
// 竖向滚动优先（axis 判定），拖动过则吞掉紧随的 click，避免误触内部可点击内容。
// notes 的 MemoSwipeCard 与热身动作项共用此手势逻辑。
import { useRef, type ReactNode } from 'react'

export const SWIPE_HINT_AT = -48
export const SWIPE_FIRE_AT = -120

interface Props {
  className?: string
  hintText?: string
  onAskDelete: () => void
  children: ReactNode
}

export default function SwipeToDelete({ className = '', hintText = '继续向左删除', onAskDelete, children }: Props) {
  const contentRef = useRef<HTMLDivElement>(null)
  const hintRef = useRef<HTMLSpanElement>(null)
  const gesture = useRef({
    startX: 0,
    startY: 0,
    axis: '' as '' | 'x' | 'y',
    dragging: false,
    moved: false,
    dx: 0,
  })

  const applyDx = (dx: number) => {
    gesture.current.dx = dx
    if (contentRef.current) {
      contentRef.current.style.transform = dx === 0 ? '' : `translateX(${dx}px)`
    }
    if (hintRef.current) {
      const progress = dx <= SWIPE_HINT_AT ? Math.min(1, (-dx - 48) / 72) : 0
      hintRef.current.style.opacity = String(progress)
    }
  }

  const capture = (event: React.PointerEvent) => {
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // 某些浏览器对 li 不支持 capture，忽略即可
    }
  }

  return (
    <li
      className={className}
      onPointerDown={(event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return
        const g = gesture.current
        g.startX = event.clientX
        g.startY = event.clientY
        g.axis = ''
        g.dragging = true
        g.moved = false
        g.dx = 0
        if (contentRef.current) contentRef.current.style.transition = 'none'
      }}
      onPointerMove={(event) => {
        const g = gesture.current
        if (!g.dragging) return
        const dx = event.clientX - g.startX
        const dy = event.clientY - g.startY
        if (!g.axis) {
          if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
          // 先判定主轴：竖向滚动让位给浏览器，不做手势
          g.axis = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x'
          if (g.axis === 'y') {
            g.dragging = false
            if (contentRef.current) contentRef.current.style.transition = ''
            return
          }
          g.moved = true
          // 判定为横向拖动后才捕获指针：pointerdown 就捕获会把 tap 的 click
          // 重定向到 li，内部可点击内容就点不开了
          capture(event)
        }
        if (g.axis !== 'x') return
        let target = dx
        if (dx < SWIPE_FIRE_AT) {
          // 过阈值后橡皮筋阻尼，暗示「再松手就删」
          target = SWIPE_FIRE_AT + (dx - SWIPE_FIRE_AT) * 0.3
        } else if (dx > 0) {
          // 右滑只允许一点回弹，不做右滑动作
          target = Math.min(16, dx * 0.25)
        }
        applyDx(target)
      }}
      onPointerUp={() => {
        const g = gesture.current
        if (!g.dragging) return
        g.dragging = false
        if (contentRef.current) contentRef.current.style.transition = ''
        const fired = g.axis === 'x' && g.moved && g.dx <= SWIPE_FIRE_AT - 4
        applyDx(0)
        if (fired) onAskDelete()
      }}
      onPointerCancel={() => {
        const g = gesture.current
        g.dragging = false
        if (contentRef.current) contentRef.current.style.transition = ''
        applyDx(0)
      }}
      onClickCapture={(event) => {
        const g = gesture.current
        if (g.axis === 'x' && g.moved) {
          g.moved = false
          event.preventDefault()
          event.stopPropagation()
        }
      }}
    >
      <span className="memo-swipe-hint" ref={hintRef} aria-hidden="true">
        {hintText}
      </span>
      <div className="memo-swipe-content" ref={contentRef}>
        {children}
      </div>
    </li>
  )
}
