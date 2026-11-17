import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, ClipboardEvent } from 'react'
import type { ArticleBlock } from '../types'
import { compressImage } from '../lib/image'
import { deleteImage, getImage, putImage } from '../lib/storage'

interface Props {
  title: string
  blocks: ArticleBlock[]
  onSave: (title: string, blocks: ArticleBlock[]) => void
  onCancel: () => void
}

interface ClipboardText {
  kind: 'text'
  value: string
}

interface ClipboardImage {
  kind: 'image'
  src: string
}

type ClipboardItem = ClipboardText | ClipboardImage

const BLOCK_TAGS = /^(P|DIV|LI|UL|OL|H[1-6]|BLOCKQUOTE|SECTION|ARTICLE|TABLE|TR|FIGURE|FIGCAPTION)$/

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function cleanText(value: string): string {
  return value
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function blocksToHtml(blocks: ArticleBlock[], srcs?: Map<string, string>): string {
  return blocks
    .map((block) => {
      if (block.type === 'text') return escapeHtml(block.text).replace(/\n/g, '<br>')
      const attrs = block.imageId ? ' data-image-id="' + block.imageId + '"' : ''
      const resolved = block.src ?? (block.imageId ? srcs?.get(block.imageId) : '')
      const src = resolved ? ' src="' + resolved.replace(/"/g, '&quot;') + '"' : ''
      return '<img' + attrs + src + '>'
    })
    .join('<br>')
}

function parseClipboardHtml(html: string): ClipboardItem[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const items: ClipboardItem[] = []
  let text = ''
  const flush = () => {
    const value = cleanText(text)
    if (value) items.push({ kind: 'text', value })
    text = ''
  }
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? ''
      return
    }
    if (!(node instanceof Element)) return
    const tag = node.tagName
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return
    if (tag === 'IMG') {
      const src = node.getAttribute('data-src') || node.getAttribute('src')
      if (src) {
        flush()
        items.push({ kind: 'image', src })
      }
      return
    }
    if (tag === 'BR') {
      text += '\n'
      return
    }
    const isBlock = BLOCK_TAGS.test(tag)
    if (isBlock) text += '\n'
    node.childNodes.forEach(walk)
    if (isBlock) text += '\n'
  }
  walk(doc.body)
  flush()
  return items
}

function extractBlocks(root: HTMLElement): ArticleBlock[] {
  const blocks: ArticleBlock[] = []
  let text = ''
  const flush = () => {
    const value = cleanText(text)
    if (value) blocks.push({ type: 'text', text: value })
    text = ''
  }
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? ''
      return
    }
    if (!(node instanceof Element)) return
    const tag = node.tagName
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return
    if (tag === 'IMG') {
      flush()
      const imageId = node.getAttribute('data-image-id') || ''
      const src = node.getAttribute('src') || ''
      if (imageId) blocks.push({ type: 'image', imageId })
      else if (src && !src.startsWith('blob:')) blocks.push({ type: 'image', src })
      return
    }
    if (tag === 'BR') {
      text += '\n'
      return
    }
    const isBlock = BLOCK_TAGS.test(tag)
    if (isBlock) text += '\n'
    node.childNodes.forEach(walk)
    if (isBlock) text += '\n'
  }
  root.childNodes.forEach(walk)
  flush()
  return blocks
}

function blocksToBody(blocks: ArticleBlock[]): string {
  return blocks
    .filter((block): block is Extract<ArticleBlock, { type: 'text' }> => block.type === 'text')
    .map((block) => block.text)
    .join('\n\n')
}

export default function ArticleEditor({ title: initialTitle, blocks, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(initialTitle)
  const [busy, setBusy] = useState(false)
  const [hasContent, setHasContent] = useState(() => blocks.length > 0)
  const editorRef = useRef<HTMLDivElement>(null)
  const addedIds = useRef<Set<string>>(new Set())
  const objectUrls = useRef<string[]>([])
  const srcMap = useRef<Map<string, string>>(new Map())
  const savedRef = useRef(false)

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    editor.innerHTML = blocksToHtml(blocks)
    let cancelled = false
    const images = Array.from(editor.querySelectorAll('img[data-image-id]'))
    for (const img of images) {
      const imageId = img.getAttribute('data-image-id')
      if (!imageId) continue
      getImage(imageId)
        .then((blob) => {
          if (cancelled || !blob) return
          const url = URL.createObjectURL(blob)
          objectUrls.current.push(url)
          srcMap.current.set(imageId, url)
          img.setAttribute('src', url)
        })
        .catch(() => undefined)
    }
    return () => {
      cancelled = true
      for (const url of objectUrls.current) URL.revokeObjectURL(url)
      objectUrls.current = []
    }
  }, [])

  useEffect(
    () => () => {
      if (savedRef.current) return
      for (const id of addedIds.current) void deleteImage(id)
    },
    [],
  )

  const refreshHasContent = () => {
    const editor = editorRef.current
    if (!editor) return
    setHasContent(editor.innerText.trim().length > 0 || editor.querySelector('img') !== null)
  }

  const storeBlob = async (blob: Blob): Promise<string> => {
    const compressed = await compressImage(blob)
    const id = 'ai-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
    await putImage(id, compressed)
    addedIds.current.add(id)
    const url = URL.createObjectURL(compressed)
    objectUrls.current.push(url)
    srcMap.current.set(id, url)
    return id
  }

  const blockFromUrl = async (src: string): Promise<ArticleBlock | null> => {
    const isRemote = /^https?:/i.test(src) || src.startsWith('//')
    if (!src.startsWith('data:') && !isRemote) return null
    const url = src.startsWith('//') ? window.location.protocol + src : src
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error('fetch failed')
      const blob = await response.blob()
      if (!blob.type.startsWith('image/')) throw new Error('not image')
      return { type: 'image', imageId: await storeBlob(blob) }
    } catch {
      // 跨站图片拿不到文件时保留原地址，联网仍可显示
      return isRemote ? { type: 'image', src: url } : null
    }
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
    refreshHasContent()
  }

  const onPaste = async (event: ClipboardEvent<HTMLDivElement>) => {
    const data = event.clipboardData
    if (!data) return
    const imageItems = Array.from(data.items).filter(
      (item) => item.kind === 'file' && item.type.startsWith('image/'),
    )
    const html = data.getData('text/html')
    const plain = data.getData('text/plain')
    if (imageItems.length === 0 && !html && !plain) return
    event.preventDefault()
    setBusy(true)
    try {
      const next: ArticleBlock[] = []
      if (imageItems.length > 0) {
        for (const item of imageItems) {
          const file = item.getAsFile()
          if (!file) continue
          next.push({ type: 'image', imageId: await storeBlob(file) })
        }
      } else if (html) {
        let text = ''
        for (const item of parseClipboardHtml(html)) {
          if (item.kind === 'text') {
            text += item.value
            continue
          }
          const value = cleanText(text)
          if (value) next.push({ type: 'text', text: value })
          text = ''
          const block = await blockFromUrl(item.src)
          if (block) next.push(block)
        }
        const value = cleanText(text)
        if (value) next.push({ type: 'text', text: value })
      } else {
        const value = cleanText(plain)
        if (value) next.push({ type: 'text', text: value })
      }
      if (next.length > 0) insertHtml(blocksToHtml(next, srcMap.current))
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
      const next: ArticleBlock[] = []
      for (const file of files) next.push({ type: 'image', imageId: await storeBlob(file) })
      insertHtml(blocksToHtml(next, srcMap.current))
    } catch {
      window.alert('图片保存失败，手机空间可能不够了，清理后再试。')
    } finally {
      setBusy(false)
    }
  }

  const submit = () => {
    const editor = editorRef.current
    if (!editor) return
    const next = extractBlocks(editor)
    if (!title.trim() || (!blocksToBody(next) && next.length === 0)) return
    savedRef.current = true
    onSave(title.trim(), next)
  }

  return (
    <div className="article-editor">
      <input
        className="field-input"
        value={title}
        maxLength={60}
        placeholder="文章标题"
        onChange={(event) => setTitle(event.target.value)}
      />
      <div
        ref={editorRef}
        className="field-input article-editor-body"
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder="把整篇文章粘贴到这里，文字和图片会一起保存"
        onPaste={onPaste}
        onInput={refreshHasContent}
      />
      <div className="article-editor-tools">
        <label className="ghost-btn small article-add-image">
          {busy ? '正在保存图片…' : '插入图片'}
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            disabled={busy}
            onChange={addImages}
          />
        </label>
        <span className="article-editor-hint">直接粘贴网页文章即可，图片会压缩存本机</span>
      </div>
      <div className="media-edit-actions">
        <button
          className="save-btn"
          type="button"
          disabled={!title.trim() || !hasContent || busy}
          onClick={submit}
        >
          保存
        </button>
        <button className="ghost-btn small" type="button" onClick={onCancel}>
          取消
        </button>
      </div>
    </div>
  )
}
