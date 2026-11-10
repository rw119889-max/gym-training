import { useEffect, useState } from 'react'
import Landing from './screens/Landing'
import TrainingTab from './screens/TrainingTab'
import RecipesTab from './screens/RecipesTab'
import VideoTab from './screens/VideoTab'
import { readJSON, writeJSON } from './lib/storage'

type Tab = 'training' | 'recipes' | 'videos'

const TABS: { id: Tab; label: string }[] = [
  { id: 'training', label: '训练' },
  { id: 'recipes', label: '食谱' },
  { id: 'videos', label: '视频' },
]

export default function App() {
  const [entered, setEntered] = useState(false)
  const [tab, setTab] = useState<Tab>(() => {
    const saved = readJSON<Tab>('tab', 'training')
    return TABS.some((item) => item.id === saved) ? saved : 'training'
  })

  useEffect(() => {
    writeJSON('tab', tab)
  }, [tab])

  if (!entered) {
    return <Landing onStart={() => setEntered(true)} />
  }

  return (
    <div className="app">
      <header className="app-header">
        <span className="brand">自律更自由</span>
      </header>

      <main className="tab-content">
        <div hidden={tab !== 'training'}>
          <TrainingTab />
        </div>
        <div hidden={tab !== 'recipes'}>
          <RecipesTab />
        </div>
        <div hidden={tab !== 'videos'}>
          <VideoTab active={tab === 'videos'} />
        </div>
      </main>

      <nav className="tabbar" aria-label="主导航">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={tab === item.id}
            onClick={() => setTab(item.id)}
          >
            <span className="dot" aria-hidden="true" />
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
