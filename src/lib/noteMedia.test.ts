import { describe, expect, it } from 'vitest'
import { collectMediaIds, hasNoteMedia, textToHtml } from './noteMedia'

describe('笔记正文媒体', () => {
  it('收集并去重图片/视频 id', () => {
    const html =
      '<div><img data-image-id="ni-1"><img data-image-id="ni-1"></div>' +
      '<div><video data-video-id="nv-2"></video></div>'
    expect(collectMediaIds(html)).toEqual({ imageIds: ['ni-1'], videoIds: ['nv-2'] })
    expect(collectMediaIds(undefined)).toEqual({ imageIds: [], videoIds: [] })
  })

  it('能识别正文里是否有媒体', () => {
    expect(hasNoteMedia('<div><img data-image-id="ni-1"></div>')).toBe(true)
    expect(hasNoteMedia('<div><video data-video-id="nv-1"></video></div>')).toBe(true)
    expect(hasNoteMedia('<div>纯文字</div>')).toBe(false)
    expect(hasNoteMedia(undefined)).toBe(false)
  })

  it('旧纯文本转 HTML 时保留换行并转义', () => {
    expect(textToHtml('第一行\n<b>x</b>\n\n第四行')).toBe(
      '<div>第一行</div><div>&lt;b&gt;x&lt;/b&gt;</div><div><br></div><div>第四行</div>',
    )
  })
})
