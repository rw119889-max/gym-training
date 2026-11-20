import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, ClipboardEvent, ReactNode } from 'react'
import type { ExerciseNote } from '../types'
import {
  addExerciseNote,
  deleteExerciseNote,
  filterNotes,
  getExerciseNotes,
  NOTE_SORTS,
  NOTE_TOPICS,
  sortNotes,
  toggleNotePin,
  topicLabel,
  unlinkNoteByNoteId,
  updateExerciseNote,
} from '../lib/exerciseNotes'
import type { NoteSort, NoteTopic } from '../lib/exerciseNotes'
import { collectMediaIds, hasNoteMedia, textToHtml } from '../lib/noteMedia'
import { compressImage } from '../lib/image'
import { inspectVideo } from '../lib/videoFile'
import { deleteImage, deleteVideo, getImage, getVideo, putImage, putVideo, readJSON, writeJSON } from '../lib/storage'
import { useOverlayHistory } from '../hooks/useOverlayHistory'
import ConfirmDialog from '../components/ConfirmDialog'
import SwipeToDelete from '../components/SwipeToDelete'
import { useNotice } from '../hooks/useNotice'

const MAX_VIDEO_BYTES = 200 * 1024 * 1024

const ALLOWED_TAGS = new Set([
  'DIV', 'P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE',
  'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'BLOCKQUOTE', 'PRE', 'CODE',
])
const DROPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT'])
const ALIGN_TAGS = new Set(['DIV', 'P', 'H1', 'H2', 'H3', 'BLOCKQUOTE', 'PRE', 'LI'])
const ALIGN_VALUES = new Set(['left', 'center', 'right', 'justify'])

interface Draft {
  id: string | null
  title: string
  text: string
  html?: string
  pinned: boolean
  topic: NoteTopic | null
  createdAt: string
  sessionId?: string
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
    pinned: note.pinned === true,
    topic: (note.topic as NoteTopic | undefined) ?? null,
    createdAt: note.createdAt,
  }
}

function formatNoteTime(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
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
    if (tag === 'INPUT') return ''
    const inner = Array.from(node.childNodes).map(serializeNode).join('')
    if (tag === 'FONT') {
      const size = node.getAttribute('size') ?? ''
      return /^[1-7]$/.test(size) ? `<font size="${size}">${inner}</font>` : inner
    }
    if (!ALLOWED_TAGS.has(tag)) return inner
    const lower = tag.toLowerCase()
    const attrs: string[] = []
    const align = node.getAttribute('align') || node.style.textAlign || ''
    if (ALIGN_TAGS.has(tag) && ALIGN_VALUES.has(align)) attrs.push(`align="${align}"`)
    const todo = node.getAttribute('data-todo')
    if (tag === 'DIV' && (todo === '0' || todo === '1')) attrs.push(`data-todo="${todo}"`)
    return `<${lower}${attrs.length ? ' ' + attrs.join(' ') : ''}>${inner}</${lower}>`
  }
  return Array.from(editor.childNodes).map(serializeNode).join('')
}

function NoteEditor({
  initial,
  onSave,
  onDelete,
  onBack,
  onDirtyChange,
}: {
  initial: Draft
  onSave: (draft: Draft) => boolean
  onDelete?: () => void
  onBack: () => void
  onDirtyChange: (dirty: boolean) => void
}) {
  const [title, setTitle] = useState(initial.title)
  const [pinned, setPinned] = useState(initial.pinned)
  const [topic, setTopic] = useState<NoteTopic | null>(initial.topic)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [hasContent, setHasContent] = useState(
    initial.text.trim().length > 0 || hasNoteMedia(initial.html),
  )
  const [charCount, setCharCount] = useState(initial.text.replace(/\s/g, '').length)
  const [pop, setPop] = useState<null | 'font' | 'para' | 'align'>(null)
  const { show: showNotice, node: noticeNode } = useNotice()
  const createdAtRef = useRef(initial.createdAt)

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
    refreshHasContent()
    for (const todo of Array.from(editor.querySelectorAll('div[data-todo]'))) {
      if (todo.querySelector('input')) continue
      const box = document.createElement('input')
      box.type = 'checkbox'
      box.checked = todo.getAttribute('data-todo') === '1'
      todo.prepend(box)
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

    if (!initial.id) {
      // 新笔记聚焦标题方便直接开写；已有笔记不自动聚焦——
      // 移动端 focus 会把光标（collapse 到末尾）滚进视野，表现为打开即跳到底部
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
    setCharCount(editor.innerText.replace(/\s/g, '').length)
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
      showNotice('单条视频超过 200 MB，建议先压缩或裁剪再插入。', 'warning')
      return
    }
    const info = await inspectVideo(file)
    if (!info.playable) {
      showNotice('这段视频可能无法播放，建议换成 MP4（H.264）再试。', 'warning')
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
      showNotice('粘贴处理失败，图片可能太大，可以试试分批粘贴。')
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
      showNotice('图片保存失败，手机空间可能不够了，清理后再试。')
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
      showNotice('视频保存失败，手机空间可能不够了，清理后再试。')
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

  const popAction = (command: string, value?: string) => {
    runCommand(command, value)
    setPop(null)
  }

  const insertTodo = () => {
    insertHtml('<div data-todo="0"><input type="checkbox"><br></div><div><br></div>')
    setPop(null)
  }

  // 弹层开着时，点正文或别处就收起；点弹层自身和开关按钮不收起
  useEffect(() => {
    if (!pop) return
    const close = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (target.closest('.note-pop') || target.closest('[data-pop-btn]')) return
      setPop(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [pop])

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

    // 先保存；失败时不清理媒体、不置 savedRef，编辑器保持打开，
    // 用户内容不会因为一次写入失败而丢失。
    const saved = onSave({
      id: initial.id,
      title,
      text,
      html,
      pinned,
      topic,
      createdAt: createdAtRef.current,
      sessionId: initial.sessionId,
    })
    if (!saved) {
      showNotice('保存失败（手机存储可能已满）。内容仍在编辑中，尚未保存。请清理空间后重试，或先导出备份。')
      markDirty()
      return
    }

    savedRef.current = true
    // 保存成功后才清理被移除的媒体，失败路径不删任何附件
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

      {noticeNode}

      <div className="note-topic-row" role="group" aria-label="笔记主题">
        <button
          type="button"
          className={topic === null ? 'topic-chip is-on' : 'topic-chip'}
          aria-pressed={topic === null}
          onClick={() => {
            setTopic(null)
            markDirty()
          }}
        >
          无主题
        </button>
        {NOTE_TOPICS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={topic === item.id ? 'topic-chip is-on' : 'topic-chip'}
            aria-pressed={topic === item.id}
            onClick={() => {
              setTopic(item.id)
              markDirty()
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="note-meta-row">
        <span>{formatNoteTime(createdAtRef.current)}</span>
        <span className="note-meta-sep">|</span>
        <span aria-label={`正文 ${charCount} 字`}>{charCount}字</span>
      </div>

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
        onClick={(event) => {
          const target = event.target
          if (target instanceof HTMLInputElement && target.type === 'checkbox') {
            const todo = target.closest('div[data-todo]')
            if (todo) {
              todo.setAttribute('data-todo', target.checked ? '1' : '0')
              markDirty()
            }
          }
        }}
        onPaste={onPaste}
      />

      <div className="note-toolbar">
        {pop && (
          <div className="note-pop" onMouseDown={(event) => event.preventDefault()}>
            {pop === 'font' && (
              <>
                <div className="note-pop-row">
                  <button className="note-pop-btn" type="button" onClick={() => popAction('fontSize', '2')}>小</button>
                  <button className="note-pop-btn" type="button" onClick={() => popAction('fontSize', '3')}>标准</button>
                  <button className="note-pop-btn" type="button" onClick={() => popAction('fontSize', '5')}>大</button>
                  <button className="note-pop-btn" type="button" onClick={() => popAction('fontSize', '7')}>特大</button>
                </div>
                <div className="note-pop-row">
                  <button className="note-pop-btn" type="button" aria-label="加粗" onClick={() => popAction('bold')}><b>B</b></button>
                  <button className="note-pop-btn" type="button" aria-label="斜体" onClick={() => popAction('italic')}><i>I</i></button>
                  <button className="note-pop-btn" type="button" aria-label="下划线" onClick={() => popAction('underline')}><u>U</u></button>
                  <button className="note-pop-btn" type="button" aria-label="删除线" onClick={() => popAction('strikeThrough')}><s>S</s></button>
                </div>
              </>
            )}
            {pop === 'para' && (
              <div className="note-pop-row">
                <button className="note-pop-btn" type="button" onClick={() => { toggleHeading(); setPop(null) }}>小标题</button>
                <button className="note-pop-btn" type="button" onClick={() => popAction('insertUnorderedList')}>• 列表</button>
                <button className="note-pop-btn" type="button" onClick={() => popAction('insertOrderedList')}>1. 列表</button>
              </div>
            )}
            {pop === 'align' && (
              <div className="note-pop-row">
                <button className="note-pop-btn" type="button" onClick={() => popAction('justifyLeft')}>居左</button>
                <button className="note-pop-btn" type="button" onClick={() => popAction('justifyCenter')}>居中</button>
                <button className="note-pop-btn" type="button" onClick={() => popAction('justifyRight')}>居右</button>
              </div>
            )}
          </div>
        )}
        <button
          className={pop === 'font' ? 'note-tool is-on' : 'note-tool'}
          type="button"
          aria-label="字体设置"
          data-pop-btn
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setPop(pop === 'font' ? null : 'font')}
        >
          <span className="note-tool-aa">Aa</span>
        </button>
        <button
          className={pop === 'para' ? 'note-tool is-on' : 'note-tool'}
          type="button"
          aria-label="段落样式"
          data-pop-btn
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setPop(pop === 'para' ? null : 'para')}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="4" y="4.5" width="6.5" height="15" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <rect x="13.5" y="4.5" width="6.5" height="15" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </button>
        <button
          className={pop === 'align' ? 'note-tool is-on' : 'note-tool'}
          type="button"
          aria-label="对齐方式"
          data-pop-btn
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setPop(pop === 'align' ? null : 'align')}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M4 6.5h16M4 12h11M4 17.5h14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <button
          className="note-tool"
          type="button"
          aria-label="待办清单"
          onMouseDown={(event) => event.preventDefault()}
          onClick={insertTodo}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="4" y="4.5" width="16" height="15" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M8.5 12l2.6 2.6 4.9-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
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

const SORT_LABELS: Record<NoteSort, string> = {
  'updated-desc': '最近更新',
  'created-desc': '最近创建',
  'created-asc': '最早创建',
  title: '按标题',
}

// 左滑删除手势已抽到 components/SwipeToDelete（热身动作项共用）
function MemoSwipeCard({ onAskDelete, children }: { onAskDelete: () => void; children: ReactNode }) {
  return (
    <SwipeToDelete className="memo-card" onAskDelete={onAskDelete}>
      {children}
    </SwipeToDelete>
  )
}

export default function NotesTab({ active }: Props) {
  const [notes, setNotes] = useState<ExerciseNote[]>(() => getExerciseNotes())
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<NoteSort>(() => {
    const saved = readJSON<string>('noteSort', 'updated-desc')
    return NOTE_SORTS.includes(saved as NoteSort) ? (saved as NoteSort) : 'updated-desc'
  })
  const [filter, setFilter] = useState<string>(() => readJSON<string>('noteFilter', 'all'))
  const [draft, setDraft] = useState<Draft | null>(null)
  const dirtyRef = useRef(false)
  const confirmedRef = useRef(false)
  const listScrollRef = useRef(0)
  const wasEditingRef = useRef(false)
  const { show: showListNotice, node: listNoticeNode } = useNotice()

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

  const keyword = query.trim().toLowerCase()
  const filterOptions = ['all', 'pinned', ...NOTE_TOPICS.map((item) => item.id)]
  const activeFilter = filterOptions.includes(filter) ? filter : 'all'
  const visible = sortNotes(
    filterNotes(
      keyword
        ? notes.filter((note) => {
            // html 去掉标签后一起搜，纯图片/富文本笔记也能被搜到
            const richText = (note.html ?? '').replace(/<[^>]*>/g, ' ')
            return `${note.title ?? ''}\n${note.text}\n${richText}`
              .toLowerCase()
              .includes(keyword)
          })
        : notes,
      activeFilter,
    ),
    sort,
  )

  const changeSort = (next: NoteSort) => {
    setSort(next)
    writeJSON('noteSort', next)
  }

  const changeFilter = (next: string) => {
    setFilter(next)
    writeJSON('noteFilter', next)
  }

  // 筛选/排序弹层 + 左滑删除确认
  const [popOpen, setPopOpen] = useState<null | 'filter' | 'sort'>(null)
  const [pendingDelete, setPendingDelete] = useState<ExerciseNote | null>(null)

  useEffect(() => {
    if (!popOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPopOpen(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [popOpen])

  const filterLabel =
    activeFilter === 'all'
      ? '全部笔记'
      : activeFilter === 'pinned'
        ? '只看置顶'
        : (NOTE_TOPICS.find((item) => item.id === activeFilter)?.label ?? '全部笔记')

  const sortLabel = SORT_LABELS[sort]

  const confirmDelete = () => {
    const note = pendingDelete
    setPendingDelete(null)
    if (!note) return
    if (!deleteExerciseNote(note.id)) {
      showListNotice('删除失败（手机存储可能已满），笔记保留。')
      return
    }
    if (!unlinkNoteByNoteId(note.id)) {
      showListNotice('笔记已删除，但跟练记录的心得引用清理失败，记录里可能仍显示「有心得」。', 'warning')
    }
    refresh()
  }

  const startNew = () => {
    listScrollRef.current = window.scrollY
    dirtyRef.current = false
    setDraft({
      id: null,
      title: '',
      text: '',
      pinned: false,
      topic: null,
      createdAt: new Date().toISOString(),
    })
  }

  const startEdit = (note: ExerciseNote) => {
    listScrollRef.current = window.scrollY
    dirtyRef.current = false
    setDraft(draftOf(note))
  }

  // 返回 true 表示已保存，编辑器才会关闭；false = 保存失败，保持编辑态
  const saveDraft = (next: Draft): boolean => {
    if (next.id) {
      const ok = updateExerciseNote(next.id, {
        title: next.title,
        text: next.text,
        html: next.html,
        pinned: next.pinned,
        // null = 用户清除了主题；undefined 不会出现（编辑器状态始终为具体值或 null）
        topic: next.topic,
      })
      if (!ok) return false
    } else {
      const created = addExerciseNote({
        title: next.title,
        text: next.text,
        html: next.html,
        pinned: next.pinned,
        topic: next.topic,
      })
      if (!created) return false
    }
    setDraft(null)
    dirtyRef.current = false
    refresh()
    return true
  }

  const removeDraft = () => {
    if (!draft?.id) return
    if (!window.confirm('删除这条笔记？')) return
    if (!deleteExerciseNote(draft.id)) {
      showListNotice('删除失败（手机存储可能已满），笔记保留。')
      return
    }
    // 笔记已删除：同步解除训练记录里的引用，避免「有心得」点不开
    if (!unlinkNoteByNoteId(draft.id)) {
      showListNotice('笔记已删除，但跟练记录的心得引用清理失败，记录里可能仍显示「有心得」。')
    }
    const stored = notes.find((note) => note.id === draft.id)
    if (stored) {
      const { imageIds, videoIds } = collectMediaIds(stored.html)
      for (const id of imageIds) void deleteImage(id)
      for (const id of videoIds) void deleteVideo(id)
    }
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
      {listNoticeNode}
      <div className="page-head">
        <h1 className="page-title">笔记</h1>
        <button className="save-btn page-head-action" type="button" onClick={startNew}>
          + 新笔记
        </button>
      </div>
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
      </div>

      {notes.length > 0 && (
        <div className="notes-view-row">
          <div className={popOpen === 'filter' ? 'notes-ctl-wrap is-open' : 'notes-ctl-wrap'}>
            <button
              type="button"
              className="notes-ctl-btn"
              aria-haspopup="listbox"
              aria-expanded={popOpen === 'filter'}
              onClick={() => setPopOpen(popOpen === 'filter' ? null : 'filter')}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M4 5.5h16M7 12h10M10 18.5h4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              <span>{filterLabel}</span>
              <svg className="notes-ctl-chevron" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 9.5l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {popOpen === 'filter' && (
              <div className="notes-pop" role="listbox" aria-label="筛选笔记">
                {[{ id: 'all', label: '全部笔记' }, { id: 'pinned', label: '只看置顶' }, ...NOTE_TOPICS].map(
                  (item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={filter === item.id}
                      className={filter === item.id ? 'notes-pop-item is-active' : 'notes-pop-item'}
                      onClick={() => {
                        changeFilter(item.id)
                        setPopOpen(null)
                      }}
                    >
                      <span>{item.label}</span>
                      {filter === item.id && (
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="notes-pop-check">
                          <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>

          <div className={popOpen === 'sort' ? 'notes-ctl-wrap is-open' : 'notes-ctl-wrap'}>
            <button
              type="button"
              className="notes-ctl-btn"
              aria-haspopup="listbox"
              aria-expanded={popOpen === 'sort'}
              onClick={() => setPopOpen(popOpen === 'sort' ? null : 'sort')}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M8 5.5v13m0 0l-3.5-3.5M8 18.5l3.5-3.5M16 18.5v-13m0 0l-3.5 3.5M16 5.5l3.5 3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>{sortLabel}</span>
              <svg className="notes-ctl-chevron" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 9.5l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {popOpen === 'sort' && (
              <div className="notes-pop" role="listbox" aria-label="排序方式">
                {NOTE_SORTS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    role="option"
                    aria-selected={sort === item}
                    className={sort === item ? 'notes-pop-item is-active' : 'notes-pop-item'}
                    onClick={() => {
                      changeSort(item)
                      setPopOpen(null)
                    }}
                  >
                    <span>{SORT_LABELS[item]}</span>
                    {sort === item && (
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="notes-pop-check">
                        <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="notes-view-count">{visible.length} 条</span>
        </div>
      )}
      {popOpen && (
        <button
          type="button"
          className="notes-pop-backdrop"
          aria-label="关闭菜单"
          onClick={() => setPopOpen(null)}
        />
      )}

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

            return (
              <MemoSwipeCard key={note.id} onAskDelete={() => setPendingDelete(note)}>
                <button
                  type="button"
                  className="memo-open"
                  onClick={() => startEdit(note)}
                >
                  <span className="memo-title">{heading}</span>
                  {preview && <span className="memo-preview">{preview}</span>}
                  <span className="memo-meta">
                    <span className="memo-date">{note.updatedAt.slice(0, 10)}</span>
                    {topicLabel(note.topic) && (
                      <span className="memo-topic">{topicLabel(note.topic)}</span>
                    )}
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
              </MemoSwipeCard>
            )
          })}
        </ul>
      )}

      {pendingDelete && (
        <ConfirmDialog
          message={`删除「${(pendingDelete.title ?? '').trim() || firstLine(pendingDelete.text) || '无标题'}」？删除后无法恢复。`}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </section>
  )
}
