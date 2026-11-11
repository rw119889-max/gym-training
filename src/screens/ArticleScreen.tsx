import { useState } from 'react'
import type { Exercise } from '../types'
import { clearArticleOverride, saveArticleOverride } from '../lib/articleOverrides'
import { getArticleView, parseArticleBody } from '../lib/articles'

interface Props {
  exercise: Exercise
  onBack: () => void
}

export default function ArticleScreen({ exercise, onBack }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const article = getArticleView(exercise.id)

  if (!article) {
    return (
      <section>
        <button className="back-btn" type="button" onClick={onBack}>
          ← 动作详情
        </button>
        <p className="hint">这篇文章不存在。</p>
      </section>
    )
  }

  const blocks = parseArticleBody(article.body)

  const startEdit = () => {
    setDraft(article.body)
    setEditing(true)
  }

  const save = () => {
    saveArticleOverride(exercise.id, draft.trim())
    setEditing(false)
  }

  const reset = () => {
    if (!window.confirm('恢复后你的改写会被底稿覆盖。继续？')) return
    clearArticleOverride(exercise.id)
    setEditing(false)
  }

  return (
    <section>
      <button className="back-btn" type="button" onClick={onBack}>
        ← 动作详情
      </button>

      <h1 className="page-title">{article.title}</h1>
      <p className="article-status">
        {article.overridden ? '已按你的改写显示' : '内置底稿 · 改写只存本机，随备份保存'}
      </p>

      {editing ? (
        <div className="article-editor">
          <textarea
            className="field-input article-editor-input"
            rows={18}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <p className="hint">写法：「# 」开头的一行是标题，其余每行一段。</p>
          <div className="article-actions">
            <button
              className="ghost-btn"
              type="button"
              onClick={save}
              disabled={draft.trim() === ''}
            >
              保存改写
            </button>
            <button className="ghost-btn" type="button" onClick={() => setEditing(false)}>
              取消
            </button>
            {article.overridden && (
              <button className="ghost-btn" type="button" onClick={reset}>
                恢复底稿
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="article-body">
            {blocks.map((block, index) =>
              block.type === 'h' ? (
                <h2 className="article-h" key={index}>
                  {block.text}
                </h2>
              ) : (
                <p className="article-p" key={index}>
                  {block.text}
                </p>
              ),
            )}
          </div>
          <div className="article-actions">
            <button className="ghost-btn" type="button" onClick={startEdit}>
              改写这一篇
            </button>
          </div>
        </>
      )}
    </section>
  )
}
