interface Props {
  onStart: () => void
}

export default function Landing({ onStart }: Props) {
  return (
    <div className="landing">
      <main className="landing-inner">
        <p className="eyebrow">GYM TRAINING</p>
        <h1 className="hero">自律更自由</h1>
        <div className="rule" />
        <button className="start" type="button" onClick={onStart}>
          开始训练吧！
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </main>
    </div>
  )
}
