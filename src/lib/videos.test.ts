import { describe, expect, it } from 'vitest'
import {
  addVideo,
  formatBytes,
  formatDuration,
  getExerciseVideos,
  getVideos,
  totalVideoBytes,
  updateVideo,
} from './videos'
import type { VideoClip } from '../types'

function clip(id: string, exerciseId: string, size = 1000): VideoClip {
  return { id, exerciseId, label: id, size, duration: 10, createdAt: '' }
}

describe('formatBytes', () => {
  it('按 B / KB / MB / GB 四档格式化', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(2048)).toBe('2 KB')
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB')
    expect(formatBytes(5.5 * 1024 * 1024)).toBe('5.5 MB')
    expect(formatBytes(15 * 1024 * 1024)).toBe('15 MB')
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB')
  })
})

describe('formatDuration', () => {
  it('分:秒 格式，秒补零，负数归零', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(59)).toBe('0:59')
    expect(formatDuration(65)).toBe('1:05')
    expect(formatDuration(125)).toBe('2:05')
    expect(formatDuration(-5)).toBe('0:00')
    expect(formatDuration(9.6)).toBe('0:10')
  })
})

describe('视频元数据 CRUD', () => {
  it('新条目头插、按动作筛选、总量求和、可局部更新', () => {
    addVideo(clip('v1', 'e1', 100))
    addVideo(clip('v2', 'e2', 200))
    expect(getVideos().map((v) => v.id)).toEqual(['v2', 'v1'])
    expect(getExerciseVideos('e1').map((v) => v.id)).toEqual(['v1'])
    expect(totalVideoBytes()).toBe(300)

    updateVideo('v1', { label: '改过的标注' })
    expect(getVideos().find((v) => v.id === 'v1')?.label).toBe('改过的标注')

    updateVideo('v1', { exerciseId: 'e9' })
    expect(getVideos().find((v) => v.id === 'v1')?.exerciseId).toBe('e9')

    // 只改动作时不能把标注清空
    updateVideo('v1', { exerciseId: 'e1' })
    expect(getVideos().find((v) => v.id === 'v1')?.label).toBe('改过的标注')
  })
})
