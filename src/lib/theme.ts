export type ThemeMode = 'auto' | 'light' | 'dark'

/** 与 manifest / index.html 的 theme-color 保持一致 */
const DARK_CHROME = '#08090b'
const LIGHT_CHROME = '#f7f8f4'
const DYNAMIC_META_ID = 'theme-color-forced'

const MODES: ThemeMode[] = ['auto', 'light', 'dark']

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'auto' || value === 'light' || value === 'dark'
}

export function nextThemeMode(mode: ThemeMode): ThemeMode {
  return MODES[(MODES.indexOf(mode) + 1) % MODES.length]
}

function systemPrefersDark(): boolean {
  if (typeof window.matchMedia !== 'function') return true
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolveDark(mode: ThemeMode): boolean {
  if (mode === 'auto') return systemPrefersDark()
  return mode === 'dark'
}

/**
 * 强制主题时，用一条不带 media 的 theme-color 覆盖 head 里两条跟随系统的。
 * 它追加在最后，浏览器取最后一条匹配项；回到「跟随系统」就把这条删掉。
 */
function syncChromeColor(mode: ThemeMode) {
  const existing = document.getElementById(DYNAMIC_META_ID)
  if (mode === 'auto') {
    existing?.remove()
    return
  }
  const meta =
    existing instanceof HTMLMetaElement
      ? existing
      : Object.assign(document.createElement('meta'), {
          id: DYNAMIC_META_ID,
          name: 'theme-color',
        })
  meta.content = resolveDark(mode) ? DARK_CHROME : LIGHT_CHROME
  if (!meta.isConnected) document.head.appendChild(meta)
}

export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement
  if (mode === 'auto') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', mode)
  syncChromeColor(mode)
}
