export interface NoteMediaIds {
  imageIds: string[]
  videoIds: string[]
}

// 笔记正文里的图片/视频只存引用，本体在 IndexedDB
export function collectMediaIds(html: string | undefined): NoteMediaIds {
  const imageIds = new Set<string>()
  const videoIds = new Set<string>()
  if (!html) return { imageIds: [], videoIds: [] }
  const pattern = /data-(image|video)-id="([^"]+)"/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(html)) !== null) {
    if (match[1] === 'image') imageIds.add(match[2])
    else videoIds.add(match[2])
  }
  return { imageIds: [...imageIds], videoIds: [...videoIds] }
}

export function hasNoteMedia(html: string | undefined): boolean {
  return /<(img|video)\b/i.test(html ?? '')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// 旧笔记只有纯文本，读进编辑器时按行转成段落
export function textToHtml(text: string): string {
  return text
    .split('\n')
    .map((line) => (line ? '<div>' + escapeHtml(line) + '</div>' : '<div><br></div>'))
    .join('')
}
