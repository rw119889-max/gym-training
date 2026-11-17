import type { ReactNode } from 'react'

export type TabId = 'exercises' | 'notes' | 'recipes'

// 底部导航与首页模块入口共用同一套线性图标，避免两处各画一遍导致形变
export const TAB_ICONS: Record<TabId, ReactNode> = {
  exercises: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9v6M7.5 6.5v11M16.5 6.5v11M20 9v6M7.5 12h9" />
    </svg>
  ),
  notes: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 4h9.5L20 8.5V20H6z" />
      <path d="M9 11h7M9 15h5" />
    </svg>
  ),
  recipes: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 11h16a8 8 0 0 1-16 0Z" />
      <path d="M9 7.5c0-1.2 1-1.6 1-2.8M14 7.5c0-1.2 1-1.6 1-2.8" />
    </svg>
  ),
}
