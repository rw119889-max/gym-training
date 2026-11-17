import { useEffect, useState } from 'react'
import type { ArticleBlock, SavedArticle } from '../types'
import {
  addSavedArticle,
  deleteSavedArticle,
  getSavedArticlesOfExercise,
  updateSavedArticle,
} from '../lib/savedArticles'
import { deleteImage, getImage, readJSON, writeJSON } from '../lib/storage'
import { useOverlayHistory } from '../hooks/useOverlayHistory'
import ArticleEditor from './ArticleEditor'

interface Props {
  exerciseId: string
  exerciseName: string
  onBack: () => void
}

function blocksOf(article: SavedArticle): ArticleBlock[] {
  return article.blocks && article.blocks.length > 0
    ? article.blocks
    : [{ type: 'text', text: article.body }]
}

function collectImageIds(blocks: ArticleBlock[] | undefined): string[] {
  return (blocks ?? [])
    .filter((block) => block.type === 'image' && !!block.imageId)
    .map((block) => (block.type === 'image' ? (block.imageId as string) : ''))
}

function ArticleImage({ block }: { block: Extract<ArticleBlock, { type: 'image' }> }) {
  const [url, setUrl] = useState<string | null>(block.src ?? null)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    if (!block.imageId) {
      setUrl(block.src ?? null)
      return
    }
    setUrl(null)
    getImage(block.imageId)
      .then((blob) => {
        if (cancelled || !blob) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [block.imageId, block.src])

  if (!url) return null
  return <img className="article-image" src={url} alt="" />
}

export default function SavedArticles({ exerciseId, exerciseName, onBack }: Props) {
  const [articles, setArticles] = useState<SavedArticle[]>(() =>
    getSavedArticlesOfExercise(exerciseId),
  )
  const [openId, setOpenId] = useState<string | null>(null)
  const [composing, setComposing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [fontSize, setFontSize] = useState(() => {
    const saved = readJSON<number>('readerFontSize', 17)
    return saved >= 15 && saved <= 24 ? saved : 17
  })
  const [theme, setTheme] = useState<'paper' | 'dark'>(() =>
    readJSON<string>('readerTheme', 'paper') === 'dark' ? 'dark' : 'paper',
  )

  const open = openId ? articles.find((item) => item.id === openId) ?? null : null

  useOverlayHistory(true, open !== null, () => {
    setOpenId(null)
    setEditingId(null)
  })

  useEffect(() => {
    writeJSON('readerFontSize', fontSize)
  }, [fontSize])

  useEffect(() => {
    writeJSON('readerTheme', theme)
  }, [theme])

  const refresh = () => setArticles(getSavedArticlesOfExercise(exerciseId))

  useEffect(() => {
    setArticles(getSavedArticlesOfExercise(exerciseId))
    setOpenId(null)
    setComposing(false)
    setEditingId(null)
  }, [exerciseId])

  const startCompose = () => {
    setEditingId(null)
    setComposing(true)
  }

  const startEdit = (article: SavedArticle) => {
    setComposing(false)
    setEditingId(article.id)
  }

  const closeEditor = () => {
    setComposing(false)
    setEditingId(null)
  }

  const applySave = (title: string, blocks: ArticleBlock[]) => {
    const body = blocks
      .filter((block): block is Extract<ArticleBlock, { type: 'text' }> => block.type === 'text')
      .map((block) => block.text)
      .join('\n\n')
    const nextIds = new Set(collectImageIds(blocks))

    if (editingId) {
      const current = articles.find((item) => item.id === editingId)
      for (const id of collectImageIds(current?.blocks)) {
        if (!nextIds.has(id)) void deleteImage(id)
      }
      updateSavedArticle(editingId, title, body, blocks)
      setEditingId(null)
      refresh()
      return
    }

    const created = addSavedArticle(exerciseId, title, body, blocks)
    setComposing(false)
    refresh()
    if (created) setOpenId(created.id)
  }

  const remove = (article: SavedArticle) => {
    if (!window.confirm(`删除收藏「${article.title}」？`)) return
    deleteSavedArticle(article.id)
    for (const id of collectImageIds(article.blocks)) void deleteImage(id)
    if (openId === article.id) setOpenId(null)
    if (editingId === article.id) setEditingId(null)
    refresh()
  }

  if (open) {
    const readerBlocks = blocksOf(open)
    return (
      <section>
        <button className="back-btn" type="button" onClick={() => setOpenId(null)}>
          ← 收藏文章
        </button>
        {editingId === open.id ? (
          <ArticleEditor
            key={open.id}
            title={open.title}
            blocks={readerBlocks}
            onSave={applySave}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <>
            <div
              className={'article-reader article-reader-' + theme}
              style={{ fontSize: fontSize + 'px' }}
            >
              <h1 className="article-reader-title">{open.title}</h1>
              <p className="article-reader-date">{open.updatedAt.slice(0, 10)}</p>

              <div className="reader-toolbar">
                <button
                  className="reader-btn"
                  type="button"
                  aria-label="缩小字体"
                  onClick={() => setFontSize((value) => Math.max(15, value - 1))}
                >
                  A-
                </button>
                <span className="reader-size">{fontSize}</span>
                <button
                  className="reader-btn"
                  type="button"
                  aria-label="放大字体"
                  onClick={() => setFontSize((value) => Math.min(24, value + 1))}
                >
                  A+
                </button>
                <span className="reader-spacer" />
                <button
                  className="reader-theme"
                  type="button"
                  aria-pressed={theme === 'paper'}
                  onClick={() => setTheme('paper')}
                >
                  纸白
                </button>
                <button
                  className="reader-theme"
                  type="button"
                  aria-pressed={theme === 'dark'}
                  onClick={() => setTheme('dark')}
                >
                  深色
                </button>
              </div>

              {readerBlocks.map((block, index) =>
                block.type === 'text' ? (
                  <p key={index} className="article-para">
                    {block.text}
                  </p>
                ) : (
                  <ArticleImage key={index} block={block} />
                ),
              )}
            </div>

            <div className="media-edit-actions article-reader-actions">
              <button className="ghost-btn small" type="button" onClick={() => startEdit(open)}>
                改
              </button>
              <button className="ghost-btn small" type="button" onClick={() => remove(open)}>
                删除
              </button>
            </div>
          </>
        )}
      </section>
    )
  }

  return (
    <section>
      <button className="back-btn" type="button" onClick={onBack}>
        ← {exerciseName}
      </button>
      <h1 className="page-title subpage-title">收藏文章</h1>
      <p className="page-sub">
        {articles.length === 0
          ? '看到讲这个动作的好文章，整篇粘贴进来，图片也能一起保存'
          : `${articles.length} 篇，点开就是单独一页`}
      </p>

      {articles.length > 0 && (
        <div className="module-list">
          {articles.map((article) => (
            <button
              key={article.id}
              className="module-row"
              type="button"
              onClick={() => setOpenId(article.id)}
            >
              <span className="module-row-text">
                <span className="module-row-title">{article.title}</span>
                <span className="module-row-meta">{article.updatedAt.slice(0, 10)}</span>
              </span>
              <span className="module-row-arrow" aria-hidden="true">
                ›
              </span>
            </button>
          ))}
        </div>
      )}

      {composing ? (
        <div className="article-edit-wrap">
          <ArticleEditor
            title=""
            blocks={[]}
            onSave={applySave}
            onCancel={closeEditor}
          />
        </div>
      ) : (
        !editingId && (
          <button className="ghost-btn small video-add" type="button" onClick={startCompose}>
            + 贴一篇文章
          </button>
        )
      )}
    </section>
  )
}
