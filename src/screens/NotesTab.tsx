import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, ClipboardEvent } from 'react'
import type { ExerciseNote, ExerciseProfile } from '../types'
import { getExerciseProfiles } from '../lib/exerciseProfiles'
import {
  addExerciseNote,
  deleteExerciseNote,
  getExerciseNotes,
  sortNotes,
  toggleNotePin,
  updateExerciseNote,
} from '../lib/exerciseNotes'
import { collectMediaIds, hasNoteMedia, textToHtml } from '../lib/noteMedia'
import { compressImage } from '../lib/image'
import { inspectVideo } from '../lib/videoFile'
import { deleteImage, deleteVideo, getImage, getVideo, putImage, putVideo } from '../lib/storage'
import { useOverlayHistory } from '../hooks/useOverlayHistory'

const MAX_VIDEO_BYTES = 200 * 1024 * 1024

const ALLOWED_TAGS = new Set([
  'DIV', 'P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE',
  'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'BLOCKQUOTE', 'PRE', 'CODE',
])
const DROPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT'])

interface Draft {
  id: string | null
  title: string
  text: string
  html?: string
  exerciseId: string | null
  pinned: boolean
}

interface Props {
  active: boolean
}

function PinIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 4h6l-.8 5.2 3.1 2.8v1.4h-4.6V20L12 21l-.7-1v-6.6H6.7V12l3.1-2.8z" />
    </svg>
  )
}

function draftOf(note: ExerciseNote): Draft {
  return {
    id: note.id,
    title: note.title ?? '',
    text: note.text,
    html: note.html,
    exerciseId: note.exerciseId,
    pinned: note.pinned === true,
  }
}

function firstLine(text: string): string {
  return text.trim().split('\n')[0].trim()
}

function restOf(text: string): string {
  return text.trim().split('\n').slice(1).join(' ').trim()
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// 只保留自己生成的排版标签与媒体引用，去掉脚本、样式和粘贴带入的属性
function serializeNote(editor: HTMLElement): string {
  const serializeNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent ?? '')
    if (!(node instanceof HTMLElement)) return ''
    const tag = node.tagName
    if (DROPPED_TAGS.has(tag)) return ''
    if (tag === 'IMG') {
      const id = node.getAttribute('data-image-id')
      return id ? `<img data-image-id="${escapeHtml(id)}">` : ''
    }
    if (tag === 'VIDEO') {
      const id = node.getAttribute('data-video-id')
      return id
        ? `<video controls playsinline preload="metadata" data-video-id="${escapeHtml(id)}"></video>`
        : ''
    }
    if (tag === 'BR') return '<br>'
    const inner = Array.from(node.childNodes).map(serializeNode).join('')
    if (!ALLOWED_TAGS.has(tag)) return inner
    const lower = tag.toLowerCase()
    return `<${lower}>${inner}</${lower}>`
  }
  return Array.from(editor.childNodes).map(serializeNode).join('')
}

function NoteEditor({
  initial,
  exercises,
  onSave,
  onDelete,
  onBack,
  onDirtyChange,
}: {
  initial: Draft
  exercises: ExerciseProfile[]
  onSave: (draft: Draft) => void
  onDelete?: () => void
  onBack: () => void
  onDirtyChange: (dirty: boolean) => void
}) {
  const [title, setTitle] = useState(initial.title)
  const [exerciseId, setExerciseId] = useState<string | null>(initial.exerciseId)
  const [pinned, setPinned] = useState(initial.pinned)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [hasContent, setHasContent] = useState(
    initial.text.trim().length > 0 || hasNoteMedia(initial.html),
  )

  const editorRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const composeRef = useRef<HTMLElement>(null)
  const initialHtmlRef = useRef(initial.html ?? textToHtml(initial.text))
  const initialIdsRef = useRef(collectMediaIds(initialHtmlRef.current))
  const addedImagesRef = useRef<Set<string>>(new Set())
  const addedVideosRef = useRef<Set<string>>(new Set())
  const objectUrlsRef = useRef<string[]>([])
  const savedRef = useRef(false)

  const canSave = title.trim().length > 0 || hasContent

  useEffect(() => {
    onDirtyChange(dirty)
  }, [dirty, onDirtyChange])

  // 键盘弹出时把工具栏顶到键盘正上方：布局视口不缩水的浏览器（iOS Safari 等）
  // 里 sticky bottom:0 会被键盘盖住，用 visualViewport 算出遮挡高度实时垫高
  useEffect(() => {
    const root = composeRef.current
    const viewport = window.visualViewport
    if (!root || !viewport) return
    const update = () => {
      const covered = Math.round(window.innerHeight - viewport.height - viewport.offsetTop)
      // 地址栏收展也会引起小幅高度差，小于阈值不当作键盘
      const offset = covered > 60 ? covered : 0
      root.style.setProperty('--kb-offset', offset + 'px')
      root.classList.toggle('kb-open', offset > 0)
    }
    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  const markDirty = () => setDirty(true)

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    editor.innerHTML = initialHtmlRef.current
    try {
      document.execCommand('styleWithCSS', false, 'false')
    } catch {
      // 部分浏览器不支持，退回默认行为
    }
    let cancelled = false

    for (const img of Array.from(editor.querySelectorAll('img[data-image-id]'))) {
      const id = img.getAttribute('data-image-id')
      if (!id) continue
      getImage(id)
        .then((blob) => {
          if (!blob || cancelled) return
          const url = URL.createObjectURL(blob)
          objectUrlsRef.current.push(url)
          img.setAttribute('src', url)
        })
        .catch(() => undefined)
    }
    for (const video of Array.from(editor.querySelectorAll('video[data-video-id]'))) {
      const id = video.getAttribute('data-video-id')
      if (!id) continue
      getVideo(id)
        .then((blob) => {
          if (!blob || cancelled) return
          const url = URL.createObjectURL(blob)
          objectUrlsRef.current.push(url)
          video.setAttribute('src', url)
        })
        .catch(() => undefined)
    }

    if (initial.id) {
      editor.focus()
      const range = document.createRange()
      range.selectNodeContents(editor)
      range.collapse(false)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
    } else {
      titleRef.current?.focus()
    }

    return () => {
      cancelled = true
      for (const url of objectUrlsRef.current) URL.revokeObjectURL(url)
      objectUrlsRef.current = []
    }
  }, [initial.id])

  useEffect(
    () => () => {
      if (savedRef.current) return
      for (const id of addedImagesRef.current) void deleteImage(id)
      for (const id of addedVideosRef.current) void deleteVideo(id)
    },
    [],
  )

  const refreshHasContent = () => {
    const editor = editorRef.current
    if (!editor) return
    setHasContent(editor.innerText.trim().length > 0 || !!editor.querySelector('img, video'))
  }

  const insertHtml = (html: string) => {
    const editor = editorRef.current
    if (!editor || !html) return
    editor.focus()
    const selection = window.getSelection()
    let range: Range | null = null
    if (selection && selection.rangeCount > 0) {
      const candidate = selection.getRangeAt(0)
      if (editor.contains(candidate.commonAncestorContainer)) range = candidate
    }
    if (!range) {
      range = document.createRange()
      range.selectNodeContents(editor)
      range.collapse(false)
    }
    if (selection) {
      selection.removeAllRanges()
      selection.addRange(range)
    }
    const inserted = document.execCommand('insertHTML', false, html)
    if (!inserted) {
      const wrapper = document.createElement('div')
      wrapper.innerHTML = html
      range.insertNode(wrapper)
      range.collapse(false)
    }
    setDirty(true)
    refreshHasContent()
  }

  const storeImage = async (file: Blob): Promise<void> => {
    const compressed = await compressImage(file)
    const id = 'ni-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
    await putImage(id, compressed)
    addedImagesRef.current.add(id)
    const url = URL.createObjectURL(compressed)
    objectUrlsRef.current.push(url)
    insertHtml(
      `<div><img data-image-id="${id}" src="${url.replace(/"/g, '&quot;')}"></div><div><br></div>`,
    )
  }

  const storeVideo = async (file: File): Promise<void> => {
    if (file.size > MAX_VIDEO_BYTES) {
      window.alert('单条视频超过 200 MB，建议先压缩或裁剪再插入。')
      return
    }
    const info = await inspectVideo(file)
    if (!info.playable) {
      window.alert('这段视频可能无法播放，建议换成 MP4（H.264）再试。')
      return
    }
    if (navigator.storage?.persist) void navigator.storage.persist().catch(() => undefined)
    const id = 'nv-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
    await putVideo(id, file)
    addedVideosRef.current.add(id)
    const url = URL.createObjectURL(file)
    objectUrlsRef.current.push(url)
    insertHtml(
      `<div><video controls playsinline preload="metadata" data-video-id="${id}" src="${url.replace(/"/g, '&quot;')}"></video></div><div><br></div>`,
    )
  }

  const onPaste = async (event: ClipboardEvent<HTMLDivElement>) => {
    const data = event.clipboardData
    if (!data) return
    const files = Array.from(data.items)
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null)
    const plain = data.getData('text/plain')
    if (files.length === 0 && !plain) return
    event.preventDefault()
    setBusy(true)
    try {
      for (const file of files) {
        if (file.type.startsWith('image/')) await storeImage(file)
        else if (file.type.startsWith('video/')) await storeVideo(file)
      }
      if (plain) insertHtml(textToHtml(plain))
    } catch {
      window.alert('粘贴处理失败，图片可能太大，可以试试分批粘贴。')
    } finally {
      setBusy(false)
    }
  }

  const addImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0) return
    setBusy(true)
    try {
      for (const file of files) await storeImage(file)
    } catch {
      window.alert('图片保存失败，手机空间可能不够了，清理后再试。')
    } finally {
      setBusy(false)
    }
  }

  const addVideos = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0) return
    setBusy(true)
    try {
      for (const file of files) await storeVideo(file)
    } catch {
      window.alert('视频保存失败，手机空间可能不够了，清理后再试。')
    } finally {
      setBusy(false)
    }
  }

  const runCommand = (command: string, value?: string) => {
    editorRef.current?.focus()
    document.execCommand(command, false, value)
    setDirty(true)
    refreshHasContent()
  }

  const toggleHeading = () => {
    const current = String(document.queryCommandValue('formatBlock') || '').toLowerCase()
    runCommand('formatBlock', current === 'h2' ? 'p' : 'h2')
  }

  const leave = () => {
    if (dirty && !window.confirm('还没保存，离开会丢掉这次的修改。继续？')) return
    onBack()
  }

  const submit = () => {
    const editor = editorRef.current
    if (!editor) return
    const html = serializeNote(editor)
    const text = editor.innerText.replace(/\u00a0/g, ' ').trim()
    if (!title.trim() && !text && !hasNoteMedia(html)) return

    const finalIds = collectMediaIds(html)
    const initialIds = initialIdsRef.current
    for (const id of addedImagesRef.current) {
      if (!finalIds.imageIds.includes(id)) void deleteImage(id)
    }
    for (const id of initialIds.imageIds) {
      if (!finalIds.imageIds.includes(id)) void deleteImage(id)
    }
    for (const id of addedVideosRef.current) {
      if (!finalIds.videoIds.includes(id)) void deleteVideo(id)
    }
    for (const id of initialIds.videoIds) {
      if (!finalIds.videoIds.includes(id)) void deleteVideo(id)
    }

    savedRef.current = true
    onSave({ id: initial.id, title, text, html, exerciseId, pinned })
  }

  return (
    <section className="note-compose" ref={composeRef}>
      <div className="note-compose-top">
        <button className="note-tool-icon" type="button" onClick={leave} aria-label="返回笔记列表">
          ←
        </button>
        <button
          className="note-tool-icon note-save-icon"
          type="button"
          onClick={submit}
          disabled={!canSave || busy}
          aria-label="保存笔记"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M5 12.5l4.4 4.4L19 7.4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <span className="note-compose-spacer" />
        <button
          className={pinned ? 'note-tool-icon is-on' : 'note-tool-icon'}
          type="button"
          aria-pressed={pinned}
          aria-label={pinned ? '取消置顶' : '置顶'}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setPinned((value) => !value)
            markDirty()
          }}
        >
          <PinIcon filled={pinned} />
        </button>
        <button
          className="note-tool-icon"
          type="button"
          aria-label="撤销"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => runCommand('undo')}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M9 7 4.5 11.5 9 16M5 11.5h8.5a5 5 0 0 1 0 10H10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          className="note-tool-icon"
          type="button"
          aria-label="重做"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => runCommand('redo')}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M15 7l4.5 4.5L15 16m4-4.5h-8.5a5 5 0 0 0 0 10H14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {onDelete && (
          <button
            className="note-tool-icon note-danger"
            type="button"
            aria-label="删除笔记"
            onClick={onDelete}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4.5 7h15M9.5 7V5.2c0-.7.5-1.2 1.2-1.2h2.6c.7 0 1.2.5 1.2 1.2V7m-8 0 .9 12.1c.1.8.7 1.4 1.5 1.4h5.8c.8 0 1.4-.6 1.5-1.4L18.5 7M10 11v6m4-6v6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      <input
        ref={titleRef}
        className="note-compose-title"
        value={title}
        maxLength={80}
        placeholder="请输入标题"
        aria-label="笔记标题"
        onChange={(event) => {
          setTitle(event.target.value)
          markDirty()
        }}
      />

      <label className="note-link-row">
        <span>关联动作</span>
        <select
          value={exerciseId ?? ''}
          aria-label="关联动作"
          onChange={(event) => {
            setExerciseId(event.target.value || null)
            markDirty()
          }}
        >
          <option value="">不关联</option>
          {exercises.map((exercise) => (
            <option key={exercise.id} value={exercise.id}>
              {exercise.name}
            </option>
          ))}
        </select>
      </label>

      <div
        ref={editorRef}
        className="note-compose-body"
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label="笔记正文"
        data-placeholder="请输入正文"
        suppressContentEditableWarning
        onInput={() => {
          markDirty()
          refreshHasContent()
        }}
        onPaste={onPaste}
      />

      <div className="note-toolbar">
        <button
          className="note-tool"
          type="button"
          aria-label="加粗"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => runCommand('bold')}
        >
          <b>B</b>
        </button>
        <button
          className="note-tool"
          type="button"
          aria-label="斜体"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => runCommand('italic')}
        >
          <i>I</i>
        </button>
        <button
          className="note-tool"
          type="button"
          aria-label="下划线"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => runCommand('underline')}
        >
          <u>U</u>
        </button>
        <button
          className="note-tool"
          type="button"
          aria-label="删除线"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => runCommand('strikeThrough')}
        >
          <s>S</s>
        </button>
        <span className="note-tool-sep" />
        <button
          className="note-tool"
          type="button"
          aria-label="标题"
          onMouseDown={(event) => event.preventDefault()}
          onClick={toggleHeading}
        >
          H
        </button>
        <button
          className="note-tool"
          type="button"
          aria-label="无序列表"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => runCommand('insertUnorderedList')}
        >
          •
        </button>
        <button
          className="note-tool"
          type="button"
          aria-label="有序列表"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => runCommand('insertOrderedList')}
        >
          1.
        </button>
        <span className="note-tool-sep" />
        <label
          className={busy ? 'note-tool note-tool-media is-busy' : 'note-tool note-tool-media'}
          aria-label="插入图片"
          title="插入图片"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="4.5" width="18" height="15" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="8.4" cy="9.6" r="1.5" fill="currentColor" />
            <path d="M4.2 17.2l4.6-4.6 3 3L15 12l4.8 5.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            disabled={busy}
            onChange={addImages}
          />
        </label>
        <label
          className={busy ? 'note-tool note-tool-media is-busy' : 'note-tool note-tool-media'}
          aria-label="插入视频"
          title="插入视频"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="5.5" width="12.5" height="13" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M15.5 10.6l4.3-2.4c.5-.3 1.2.1 1.2.7v6.2c0 .6-.7 1-1.2.7l-4.3-2.4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
          <input
            type="file"
            accept="video/*"
            multiple
            hidden
            disabled={busy}
            onChange={addVideos}
          />
        </label>
        {busy && <span className="note-tool-status">处理中…</span>}
      </div>
    </section>
  )
}

export default function NotesTab({ active }: Props) {
  const [exercises, setExercises] = useState<ExerciseProfile[]>(() => getExerciseProfiles())
  const [notes, setNotes] = useState<ExerciseNote[]>(() => getExerciseNotes())
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const dirtyRef = useRef(false)
  const confirmedRef = useRef(false)
  const listScrollRef = useRef(0)
  const wasEditingRef = useRef(false)

  const confirmDiscard = () => {
    if (!dirtyRef.current) return true
    return window.confirm('还没保存，离开会丢掉这次的修改。继续？')
  }

  // 返回键先问一次，问过之后 closeDraft 不再重复弹窗
  const canCloseDraft = () => {
    if (!confirmDiscard()) return false
    confirmedRef.current = dirtyRef.current
    return true
  }

  const closeDraft = () => {
    if (confirmedRef.current) confirmedRef.current = false
    else if (!confirmDiscard()) return
    dirtyRef.current = false
    setDraft(null)
  }

  const handleDirtyChange = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty
  }, [])

  useEffect(() => {
    if (!active) return
    setExercises(getExerciseProfiles())
    setNotes(getExerciseNotes())
  }, [active])

  // 写笔记时隐藏页头和底部导航，进入专注的全屏编辑
  useEffect(() => {
    const open = draft !== null
    document.body.classList.toggle('note-composing', open)
    return () => document.body.classList.remove('note-composing')
  }, [draft !== null])

  // 进笔记详情时滚到页首，返回列表时回到原来的位置
  useEffect(() => {
    if (draft) {
      if (!wasEditingRef.current) window.scrollTo(0, 0)
      wasEditingRef.current = true
    } else if (wasEditingRef.current) {
      wasEditingRef.current = false
      const top = listScrollRef.current
      // 等列表完成布局再滚，否则会被详情页的高度截断
      requestAnimationFrame(() => window.scrollTo(0, top))
    }
  }, [draft])

  // 详情页压一条历史记录，返回键先回列表；未保存时返回会先确认
  useOverlayHistory(active, draft !== null, closeDraft, canCloseDraft)

  const refresh = () => setNotes(getExerciseNotes())

  const nameOf = (exerciseId: string | null) =>
    exerciseId ? (exercises.find((item) => item.id === exerciseId)?.name ?? '已删除的动作') : ''

  const keyword = query.trim().toLowerCase()
  const visible = sortNotes(
    keyword
      ? notes.filter((note) =>
          `${note.title ?? ''}\n${note.text}\n${nameOf(note.exerciseId)}`
            .toLowerCase()
            .includes(keyword),
        )
      : notes,
  )

  const startNew = () => {
    listScrollRef.current = window.scrollY
    dirtyRef.current = false
    setDraft({ id: null, title: '', text: '', exerciseId: null, pinned: false })
  }

  const startEdit = (note: ExerciseNote) => {
    listScrollRef.current = window.scrollY
    dirtyRef.current = false
    setDraft(draftOf(note))
  }

  const saveDraft = (next: Draft) => {
    if (next.id) {
      updateExerciseNote(next.id, {
        title: next.title,
        text: next.text,
        html: next.html,
        exerciseId: next.exerciseId,
        pinned: next.pinned,
      })
    } else {
      addExerciseNote({
        title: next.title,
        text: next.text,
        html: next.html,
        exerciseId: next.exerciseId,
        pinned: next.pinned,
      })
    }
    setDraft(null)
    dirtyRef.current = false
    refresh()
  }

  const removeDraft = () => {
    if (!draft?.id) return
    if (!window.confirm('删除这条笔记？')) return
    const stored = notes.find((note) => note.id === draft.id)
    if (stored) {
      const { imageIds, videoIds } = collectMediaIds(stored.html)
      for (const id of imageIds) void deleteImage(id)
      for (const id of videoIds) void deleteVideo(id)
    }
    deleteExerciseNote(draft.id)
    setDraft(null)
    dirtyRef.current = false
    refresh()
  }

  const handlePin = (note: ExerciseNote) => {
    toggleNotePin(note.id, !note.pinned)
    refresh()
  }

  if (draft) {
    return (
      <NoteEditor
        key={draft.id ?? 'new'}
        initial={draft}
        exercises={exercises}
        onSave={saveDraft}
        onDelete={draft.id ? removeDraft : undefined}
        onBack={() => {
          dirtyRef.current = false
          setDraft(null)
        }}
        onDirtyChange={handleDirtyChange}
      />
    )
  }

  return (
    <section>
      <h1 className="page-title">笔记</h1>
      <p className="page-sub">像备忘录一样随手记</p>

      <div className="notes-toolbar">
        <input
          className="field-input note-search"
          type="search"
          value={query}
          placeholder="搜索标题或内容"
          aria-label="搜索笔记"
          onChange={(event) => setQuery(event.target.value)}
        />
        <button className="save-btn note-new-btn" type="button" onClick={startNew}>
          + 新笔记
        </button>
      </div>

      {notes.length === 0 && (
        <p className="hint notes-empty">还没有笔记。点「+ 新笔记」，像备忘录一样随手记一条。</p>
      )}
      {notes.length > 0 && visible.length === 0 && (
        <p className="hint notes-empty">没有匹配的笔记。</p>
      )}

      {visible.length > 0 && (
        <ul className="memo-list">
          {visible.map((note) => {
            const title = (note.title ?? '').trim()
            const heading = title || firstLine(note.text) || '无标题'
            const preview = title ? note.text.trim() : restOf(note.text)
            const linkedName = nameOf(note.exerciseId)

            return (
              <li key={note.id} className="memo-card">
                <button
                  type="button"
                  className="memo-open"
                  onClick={() => startEdit(note)}
                >
                  <span className="memo-title">{heading}</span>
                  {preview && <span className="memo-preview">{preview}</span>}
                  <span className="memo-meta">
                    {linkedName && <span className="memo-exercise">{linkedName}</span>}
                    <span className="memo-date">{note.updatedAt.slice(0, 10)}</span>
                  </span>
                </button>
                <button
                  type="button"
                  className={note.pinned ? 'memo-pin is-on' : 'memo-pin'}
                  aria-label={note.pinned ? `取消置顶 ${heading}` : `置顶 ${heading}`}
                  aria-pressed={note.pinned === true}
                  onClick={() => handlePin(note)}
                >
                  <PinIcon filled={note.pinned === true} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
