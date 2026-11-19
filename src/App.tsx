import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import Landing from './screens/Landing'
import ExerciseTab from './screens/ExerciseTab'
import NotesTab from './screens/NotesTab'
import RecipesTab from './screens/RecipesTab'
import { TAB_ICONS, type TabId } from './components/TabIcons'
import { APP_VERSION } from './version'
import { readJSON, writeJSON } from './lib/storage'
import { applyTheme, isThemeMode, nextThemeMode, type ThemeMode } from './lib/theme'
import { applyUpdate, checkForUpdate, forceRefresh, getUpdateReady, subscribeUpdate } from './lib/sw'

type Tab = TabId

const THEME_LABEL: Record<ThemeMode, string> = {
  auto: '跟随系统',
  light: '浅色',
  dark: '深色',
}

const THEME_ICON: Record<ThemeMode, ReactNode> = {
  auto: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="12" cy="12" r="7.5" />
      <path d="M12 4.5a7.5 7.5 0 0 1 0 15z" fill="currentColor" stroke="none" />
    </svg>
  ),
  light: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7" />
    </svg>
  ),
  dark: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 14.6A8.5 8.5 0 1 1 9.4 4a6.8 6.8 0 0 0 10.6 10.6Z" />
    </svg>
  ),
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'exercises', label: '动作' },
  { id: 'notes', label: '笔记' },
  { id: 'recipes', label: '食谱' },
]

export default function App() {
  const [entered, setEntered] = useState(false)
  const [tab, setTab] = useState<Tab>(() => {
    const saved = readJSON<Tab | 'training' | 'videos'>('tab', 'exercises')
    if (saved === 'recipes' || saved === 'notes') return saved
    return 'exercises'
  })
  // 跨 tab 写心得的返回目标（应用级状态，不依赖浏览器历史）：
  // 计划页 → 写心得时记下来源 tab，笔记草稿关闭后跳回去。
  const noteSourceRef = useRef<Tab | null>(null)

  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = readJSON<unknown>('themeMode', 'auto')
    return isThemeMode(saved) ? saved : 'auto'
  })

  useEffect(() => {
    applyTheme(themeMode)
    writeJSON('themeMode', themeMode)
  }, [themeMode])

  useEffect(() => {
    writeJSON('tab', tab)
  }, [tab])

  // 二级页自己负责回到列表时恢复滚动位置，避免浏览器历史还原抢先跳到顶部
  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'
  }, [])

  const [updateReady, setUpdateReady] = useState(getUpdateReady)
  const [notice, setNotice] = useState<string | null>(null)
  const noticeTimer = useRef<number | undefined>(undefined)
  const pressTimer = useRef<number | undefined>(undefined)
  const pressedLong = useRef(false)

  useEffect(() => subscribeUpdate(() => setUpdateReady(true)), [])

  useEffect(() => () => window.clearTimeout(noticeTimer.current), [])

  const showNotice = (text: string) => {
    setNotice(text)
    window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(null), 2400)
  }

  const handleCheckUpdate = async () => {
    if (updateReady) {
      void applyUpdate()
      return
    }
    const result = await checkForUpdate()
    if (result === 'updated') {
      showNotice('发现新版本，正在更新…')
      window.setTimeout(() => void applyUpdate(), 700)
      return
    }
    showNotice(result === 'offline' ? '网络不可用，稍后再试' : `已是最新 ${APP_VERSION}`)
  }

  // 长按版本号：注销 Service Worker 并清空缓存后重载，用于极端卡在旧版本的情况
  const startLongPress = () => {
    pressedLong.current = false
    window.clearTimeout(pressTimer.current)
    pressTimer.current = window.setTimeout(() => {
      pressedLong.current = true
      showNotice('正在清除缓存并重载…')
      void forceRefresh()
    }, 900)
  }

  const cancelLongPress = () => {
    window.clearTimeout(pressTimer.current)
  }

  const handleBadgeClick = () => {
    if (pressedLong.current) {
      pressedLong.current = false
      return
    }
    void handleCheckUpdate()
  }

  // 用户点底部 tab 是主动切换：清掉写心得的返回意图
  const handleTabClick = (next: Tab) => {
    noteSourceRef.current = null
    setTab(next)
  }

  // 计划页「写心得」入口：记住来源，切到笔记 tab
  const openNotesFromPlan = useCallback(() => {
    noteSourceRef.current = 'exercises'
    setTab('notes')
  }, [])

  // 笔记草稿（来自写心得的种子）关闭后回到原计划页；
  // 来源已被用户手动切换清掉时则原地不动
  const returnFromNoteSeed = useCallback(() => {
    const target = noteSourceRef.current
    noteSourceRef.current = null
    if (target) setTab(target)
  }, [])

  if (!entered) {
    return (
      <Landing
        onStart={(target) => {
          if (target) setTab(target)
          setEntered(true)
        }}
      />
    )
  }

  return (
    <div className="app">
      <a className="skip-link" href="#main-content">
        跳到主内容
      </a>
      <header className="app-header">
        <span className="brand">自律更自由</span>
        <div className="header-tools">
          <button
            type="button"
            className={updateReady ? 'version-badge has-update' : 'version-badge'}
            onClick={handleBadgeClick}
            onPointerDown={startLongPress}
            onPointerUp={cancelLongPress}
            onPointerLeave={cancelLongPress}
            onPointerCancel={cancelLongPress}
            title={updateReady ? '有新版本，点击更新' : '点击检查更新（长按清除缓存）'}
            aria-label={updateReady ? '有新版本，点击更新' : '检查更新'}
          >
            {updateReady ? '有新版本' : APP_VERSION}
          </button>
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setThemeMode(nextThemeMode)}
            aria-label={`主题：${THEME_LABEL[themeMode]}`}
            title={`主题：${THEME_LABEL[themeMode]}（点击切换）`}
          >
            {THEME_ICON[themeMode]}
          </button>
        </div>
      </header>

      <main className="tab-content" id="main-content">
        <div hidden={tab !== 'exercises'}>
          <ExerciseTab active={tab === 'exercises'} onOpenNotes={openNotesFromPlan} />
        </div>
        <div hidden={tab !== 'notes'}>
          <NotesTab active={tab === 'notes'} onBackToSource={returnFromNoteSeed} />
        </div>
        <div hidden={tab !== 'recipes'}>
          <RecipesTab active={tab === 'recipes'} />
        </div>
      </main>

      <nav className="tabbar" aria-label="主导航">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={tab === item.id}
            onClick={() => handleTabClick(item.id)}
          >
            <span className="tab-icon" aria-hidden="true">{TAB_ICONS[item.id]}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {notice && (
        <div className="app-toast" role="status" aria-live="polite">
          {notice}
        </div>
      )}
    </div>
  )
}
