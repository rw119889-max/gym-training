import { useEffect, useRef, useState } from 'react'
import { APP_VERSION } from '../version'
import { TAB_ICONS, type TabId } from '../components/TabIcons'

interface Props {
  onStart: (tab?: TabId) => void
}

const MODULES: { id: TabId; title: string; desc: string }[] = [
  {
    id: 'exercises',
    title: '动作',
    desc: '视频、照片、收藏文章按动作归位，原文件都留在本机。',
  },
  {
    id: 'notes',
    title: '笔记',
    desc: '健身心得、学习记录和日常想法，统一写在一个简洁的时间流里。',
  },
  {
    id: 'recipes',
    title: '食谱',
    desc: '六类餐次、多张图片，蛋白脂肪碳水按食材克数自动求和。',
  },
]

// 标语按行写，逐字点亮时保持原有的断行位置
const TAGLINE_LINES = ['视频、照片、文章', '都跟着同一个动作走。']
const TAGLINE_CHARS = TAGLINE_LINES.map((line) => Array.from(line))
const TAGLINE_TOTAL = TAGLINE_CHARS.reduce((sum, chars) => sum + chars.length, 0)
const LINE_OFFSETS = TAGLINE_CHARS.map((_, i) =>
  TAGLINE_CHARS.slice(0, i).reduce((sum, chars) => sum + chars.length, 0),
)

function Arrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h13M13 6.5l5.5 5.5-5.5 5.5" />
    </svg>
  )
}

export default function Landing({ onStart }: Props) {
  const [lit, setLit] = useState(0)
  const taglineRef = useRef<HTMLParagraphElement>(null)

  // 区块进场：只触发一次，滚回去不重播
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
    if (!nodes.length) return
    if (typeof IntersectionObserver === 'undefined') {
      nodes.forEach((node) => node.classList.add('is-in'))
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('is-in')
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
    )
    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [])

  // 标语逐字点亮：单个 scroll 监听 + rAF 节流，每帧只读一次几何
  useEffect(() => {
    const el = taglineRef.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setLit(TAGLINE_TOTAL)
      return
    }

    let frame = 0
    const measure = () => {
      frame = 0
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight
      // 块顶从 85% 视口高度滑到 58% 的过程里点亮全部字
      const start = vh * 0.85
      const end = vh * 0.58
      const progress = (start - rect.top) / (start - end)
      // 页面触底即视为读完，避免高视口下最后几个字始终点不亮
      const atBottom =
        window.scrollY + vh >= document.documentElement.scrollHeight - 8
      const next = atBottom
        ? TAGLINE_TOTAL
        : Math.round(Math.min(1, Math.max(0, progress)) * TAGLINE_TOTAL)
      setLit((prev) => (prev === next ? prev : next))
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <main className="landing">
      <section className="lp-hero" aria-labelledby="lp-title">
        <p className="lp-eyebrow">GYM TRAINING</p>
        <h1 className="lp-title" id="lp-title">
          自律更自由
        </h1>
        <p className="lp-lede">
          <span className="lp-line">视频、照片、文章，跟着动作归位。</span>
          <span className="lp-line">笔记随手记，食谱按餐次存，营养按食材求和。</span>
        </p>
        <button type="button" className="lp-cta" onClick={() => onStart()}>
          进入应用
          <Arrow />
        </button>
        <p className="lp-proof">无需登录 · 离线可用 · 不上传服务器</p>
      </section>

      <section className="lp-modules" aria-labelledby="lp-modules-title" data-reveal>
        <h2 className="lp-label" id="lp-modules-title">
          打开就有
        </h2>
        <ul>
          {MODULES.map((item) => (
            <li key={item.id}>
              <button type="button" className="lp-module" onClick={() => onStart(item.id)}>
                <span className="lp-module-icon" aria-hidden="true">
                  {TAB_ICONS[item.id]}
                </span>
                <span className="lp-module-text">
                  <span className="lp-module-title">{item.title}</span>
                  <span className="lp-module-desc">{item.desc}</span>
                </span>
                <span className="lp-module-arrow" aria-hidden="true">
                  <Arrow />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="lp-tagline" aria-label="一句话说明">
        <p
          className="lp-tagline-text"
          ref={taglineRef}
          aria-label={TAGLINE_LINES.join('')}
        >
          <span aria-hidden="true">
            {TAGLINE_CHARS.map((chars, lineIndex) => (
              <span className="lp-line" key={lineIndex}>
                {chars.map((char, charIndex) => {
                  const index = LINE_OFFSETS[lineIndex] + charIndex
                  return (
                    <span className={index < lit ? 'lp-word is-lit' : 'lp-word'} key={charIndex}>
                      {char}
                    </span>
                  )
                })}
              </span>
            ))}
          </span>
        </p>
      </section>

      <section className="lp-closing" data-reveal>
        <p className="lp-closing-note">换手机之前，先在动作页导出一次 JSON 备份。</p>
        <button type="button" className="lp-cta" onClick={() => onStart()}>
          进入应用
          <Arrow />
        </button>
      </section>

      <footer className="lp-foot">
        <span className="version-badge">{APP_VERSION}</span>
      </footer>
    </main>
  )
}
