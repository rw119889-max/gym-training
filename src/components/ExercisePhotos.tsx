import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { ExercisePhoto } from '../types'
import {
  addExercisePhoto,
  deleteExercisePhoto,
  getExercisePhotos,
  updateExercisePhotoLabel,
} from '../lib/exercisePhotos'
import { compressImage } from '../lib/image'
import { putImage } from '../lib/storage'
import { useOverlayHistory } from '../hooks/useOverlayHistory'
import { useNotice } from '../hooks/useNotice'
import RecipeImage from './RecipeImage'

interface Props {
  exerciseId: string
}

export default function ExercisePhotos({ exerciseId }: Props) {
  const [photos, setPhotos] = useState<ExercisePhoto[]>(() => getExercisePhotos(exerciseId))
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [viewIndex, setViewIndex] = useState<number | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const { show: showNotice, node: noticeNode } = useNotice()

  const viewing = viewIndex !== null ? photos[viewIndex] ?? null : null

  useOverlayHistory(true, viewIndex !== null, () => setViewIndex(null))

  const goTo = (index: number) => {
    if (index < 0 || index >= photos.length) return
    setViewIndex(index)
    const track = trackRef.current
    if (track) track.scrollTo({ top: index * track.clientHeight, behavior: 'smooth' })
  }

  useEffect(() => {
    if (viewIndex === null) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setViewIndex(null)
      else if (event.key === 'ArrowUp') goTo(viewIndex - 1)
      else if (event.key === 'ArrowDown') goTo(viewIndex + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // 打开时直接定位到点的那张，之后交给竖向滚动，不再程序干预
  useLayoutEffect(() => {
    const track = trackRef.current
    if (viewIndex === null || !track) return
    track.scrollTop = viewIndex * track.clientHeight
  }, [viewIndex !== null])

  const onTrackScroll = () => {
    const track = trackRef.current
    if (!track || !track.clientHeight) return
    const index = Math.round(track.scrollTop / track.clientHeight)
    setViewIndex((current) => (current === index ? current : index))
  }

  const refresh = () => setPhotos(getExercisePhotos(exerciseId))

  useEffect(() => {
    setPhotos(getExercisePhotos(exerciseId))
    setAdding(false)
    setTitle('')
    setEditingId(null)
    setViewIndex(null)
  }, [exerciseId])

  const pickPhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    if (files.length === 0) return
    setBusy(true)
    try {
      const stamped = Date.now()
      for (const [index, file] of files.entries()) {
        const blob = await compressImage(file)
        const id = `ep-${stamped}-${index}-${Math.random().toString(36).slice(2, 6)}`
        await putImage(id, blob)
        addExercisePhoto({
          id,
          exerciseId,
          label: title.trim(),
          createdAt: new Date().toISOString(),
        })
      }
      setAdding(false)
      setTitle('')
      refresh()
    } catch {
      showNotice('照片保存失败，手机空间可能不够了，清理后再试。')
    } finally {
      setBusy(false)
    }
  }

  const startEdit = (photo: ExercisePhoto) => {
    setEditingId(photo.id)
    setEditTitle(photo.label)
  }

  const saveEdit = () => {
    if (!editingId) return
    updateExercisePhotoLabel(editingId, editTitle)
    setEditingId(null)
    refresh()
  }

  const removePhoto = async (photo: ExercisePhoto) => {
    if (!window.confirm('删除这张照片？')) return
    await deleteExercisePhoto(photo.id)
    if (viewing?.id === photo.id) setViewIndex(null)
    refresh()
  }

  return (
    <>
      {adding ? (
        <div className="video-upload">
          {noticeNode}
          <label className="field">
            <span className="field-label">标题（可留空，之后能改）</span>
            <input
              className="field-input"
              value={title}
              maxLength={30}
              placeholder="如：悍马机座位调到最低"
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <div className="backup-actions">
            <label className="ghost-btn small photo-add-btn">
              {busy ? '保存中…' : '选择照片（可多选）'}
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                disabled={busy}
                onChange={pickPhotos}
              />
            </label>
            <button
              className="ghost-btn small"
              type="button"
              disabled={busy}
              onClick={() => {
                setAdding(false)
                setTitle('')
              }}
            >
              取消
            </button>
          </div>
          <p className="hint">照片会自动压缩后存本机，一次可选多张，标题之后逐张改。</p>
        </div>
      ) : (
        <button className="ghost-btn small video-add" type="button" onClick={() => setAdding(true)}>
          + 上传照片
        </button>
      )}

      {photos.length === 0 ? (
        <p className="hint">还没有照片。拍下器械怎么调、你的站位，下次直接照着摆。</p>
      ) : (
        <div className="photo-grid">
          {photos.map((photo) =>
            editingId === photo.id ? (
              <div key={photo.id} className="media-edit-card">
                <input
                  className="field-input"
                  value={editTitle}
                  maxLength={30}
                  autoFocus
                  onChange={(event) => setEditTitle(event.target.value)}
                />
                <div className="media-edit-actions">
                  <button className="save-btn" type="button" onClick={saveEdit}>
                    保存
                  </button>
                  <button className="ghost-btn small" type="button" onClick={() => setEditingId(null)}>
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <figure key={photo.id} className="photo-card">
                <button
                  className="photo-open"
                  type="button"
                  onClick={() => setViewIndex(photos.indexOf(photo))}
                  aria-label={`查看 ${photo.label || '照片'}`}
                >
                  <RecipeImage
                    imageId={photo.id}
                    alt={photo.label || '动作照片'}
                    className="photo-thumb"
                  />
                </button>
                <figcaption className="media-caption">
                  <span className="media-caption-title">{photo.label || '未命名照片'}</span>
                  <button className="note-action" type="button" onClick={() => startEdit(photo)}>
                    改
                  </button>
                  <button
                    className="note-action"
                    type="button"
                    aria-label="删除这张照片"
                    onClick={() => void removePhoto(photo)}
                  >
                    ×
                  </button>
                </figcaption>
              </figure>
            ),
          )}
        </div>
      )}

      {viewing && (
        <div
          className="photo-viewer"
          role="dialog"
          aria-modal="true"
          aria-label={viewing.label || '动作照片'}
        >
          <div className="photo-viewer-top">
            <span className="photo-viewer-title">{viewing.label || '未命名照片'}</span>
            {photos.length > 1 && (
              <span className="photo-viewer-count">
                {(viewIndex ?? 0) + 1} / {photos.length}
              </span>
            )}
            <button
              className="icon-btn"
              type="button"
              onClick={() => setViewIndex(null)}
              aria-label="关闭照片"
            >
              ✕
            </button>
          </div>
          <div className="photo-viewer-track" ref={trackRef} onScroll={onTrackScroll}>
            {photos.map((photo, index) => (
              <div className="photo-slide" key={photo.id}>
                <RecipeImage
                  imageId={photo.id}
                  alt={photo.label || `动作照片 ${index + 1}`}
                  className="photo-full"
                />
              </div>
            ))}
          </div>
          {(viewIndex ?? 0) > 0 && (
            <button
              className="photo-nav photo-nav-prev"
              type="button"
              aria-label="上一张"
              onClick={() => goTo((viewIndex ?? 0) - 1)}
            >
              ↑
            </button>
          )}
          {(viewIndex ?? 0) < photos.length - 1 && (
            <button
              className="photo-nav photo-nav-next"
              type="button"
              aria-label="下一张"
              onClick={() => goTo((viewIndex ?? 0) + 1)}
            >
              ↓
            </button>
          )}
          {photos.length > 1 && <p className="photo-viewer-hint">上下滑动切换</p>}
        </div>
      )}
    </>
  )
}
