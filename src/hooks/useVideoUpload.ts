import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { inspectVideo } from '../lib/videoFile'
import { addVideo, MAX_CLIP_BYTES, MAX_TOTAL_BYTES, totalVideoBytes } from '../lib/videos'
import { deletePoster, deleteVideo, getVideo, putPoster, putVideo } from '../lib/storage'

type NoticeTone = 'warning' | 'danger'

export interface UploadNotice {
  tone: NoticeTone
  text: string
}

interface Options {
  // 写进 videos 元数据的归属（动作 id / warmup:<day> / recipe:<id>）
  owner: string
  // 视频标题策略；默认取文件名（去扩展名，最多 30 字）
  getLabel?: (file: File) => string
  // 自定义通知出口；不传则由 hook 内部维护 notice
  onNotice?: (text: string, tone: NoticeTone) => void
  // 上传结束后的副作用（刷新列表、收起表单等）
  onDone?: () => void
}

const defaultLabel = (file: File) => file.name.replace(/\.[^.]+$/, '').slice(0, 30)

// 三处上传（动作 / 开练 / 菜谱）共用的校验、转码探测与写入逻辑。
// 差异通过参数吸收：标题怎么取、通知往哪发、传完做什么。
export function useVideoUpload({ owner, getLabel = defaultLabel, onNotice, onDone }: Options) {
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<UploadNotice | null>(null)

  const notify =
    onNotice ?? ((text: string, tone: NoticeTone) => setNotice({ tone, text }))

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    if (files.length === 0) return

    const oversize = files.filter((file) => file.size > MAX_CLIP_BYTES)
    if (
      oversize.length > 0 &&
      !window.confirm(`有 ${oversize.length} 条超过 200 MB，确定都存到手机上？`)
    ) {
      return
    }
    const incoming = files.reduce((sum, file) => sum + file.size, 0)
    if (
      totalVideoBytes() + incoming > MAX_TOTAL_BYTES &&
      !window.confirm('视频一共要超过 2 GB 了。建议先删掉几条不常用的，继续？')
    ) {
      return
    }

    setBusy(true)
    setNotice(null)
    let failed = 0
    let quota = false
    if (navigator.storage?.persist) void navigator.storage.persist().catch(() => undefined)
    for (const file of files) {
      try {
        const info = await inspectVideo(file)
        if (!info.playable) {
          failed += 1
          continue
        }
        const id = `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        await putVideo(id, file)
        if (info.poster) await putPoster(id, info.poster)
        const saved = await getVideo(id)
        if (!saved) {
          await Promise.all([deleteVideo(id), deletePoster(id)])
          failed += 1
          continue
        }
        addVideo({
          id,
          exerciseId: owner,
          label: getLabel(file),
          size: file.size,
          duration: Math.round(info.duration),
          createdAt: new Date().toISOString(),
        })
      } catch (error) {
        if (error instanceof DOMException && error.name === 'QuotaExceededError') quota = true
        failed += 1
      }
    }
    setBusy(false)
    onDone?.()
    if (failed > 0) {
      notify(
        quota
          ? '手机空间不够了。先删几条视频，或者清理空间后再传。'
          : `有 ${failed} 条视频没存上，先转成 MP4（H.264）再试。`,
        quota ? 'warning' : 'danger',
      )
    }
  }

  return { busy, notice, handleFiles }
}
