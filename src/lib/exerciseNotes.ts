import type { ExerciseNote } from '../types'
import { readJSON, writeJSON } from './storage'
import { hasNoteMedia } from './noteMedia'
import { getSessions } from './trainingLog'

const KEY = 'exerciseNotes'

// 轻量主题：只做筛选，不做文件夹和多级分类
export const NOTE_TOPICS = [
  { id: 'fitness', label: '健身' },
  { id: 'study', label: '学习' },
  { id: 'diet', label: '饮食' },
  { id: 'work', label: '工作' },
  { id: 'life', label: '生活' },
  { id: 'other', label: '其他' },
] as const

export type NoteTopic = (typeof NOTE_TOPICS)[number]['id']

const TOPIC_IDS = new Set<string>(NOTE_TOPICS.map((item) => item.id))

export function topicLabel(topic: string | undefined): string {
  return NOTE_TOPICS.find((item) => item.id === topic)?.label ?? ''
}

// 白名单归一：旧数据/坏数据的主题一律回落为无主题
export function normalizeTopic(value: unknown): NoteTopic | undefined {
  return typeof value === 'string' && TOPIC_IDS.has(value) ? (value as NoteTopic) : undefined
}

export interface NoteInput {
  title?: string
  text: string
  html?: string
  pinned?: boolean
  topic?: NoteTopic | null
}

export interface NotePatch {
  title?: string
  text?: string
  html?: string
  pinned?: boolean
  topic?: NoteTopic | null
}

export function getExerciseNotes(): ExerciseNote[] {
  return readJSON<ExerciseNote[]>(KEY, []).map((note) => ({
    id: note.id,
    title: typeof note.title === 'string' ? note.title : '',
    text: note.text,
    html: typeof note.html === 'string' ? note.html : undefined,
    pinned: note.pinned === true,
    topic: normalizeTopic(note.topic),
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }))
}

// 置顶在前，其余按所选模式排；时间相同按创建时间兜底
export type NoteSort = 'updated-desc' | 'created-desc' | 'created-asc' | 'title'

export const NOTE_SORTS: NoteSort[] = ['updated-desc', 'created-desc', 'created-asc', 'title']

export function sortNotes(notes: ExerciseNote[], sort: NoteSort = 'updated-desc'): ExerciseNote[] {
  const byMode = (a: ExerciseNote, b: ExerciseNote): number => {
    switch (sort) {
      case 'created-desc':
        return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0
      case 'created-asc':
        return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
      case 'title': {
        const ta = (a.title ?? '').trim() || a.text.trim().split('\n')[0].trim()
        const tb = (b.title ?? '').trim() || b.text.trim().split('\n')[0].trim()
        return ta.localeCompare(tb, 'zh-Hans-CN')
      }
      default:
        return a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0
    }
  }
  return [...notes].sort((a, b) => {
    const pinA = a.pinned ? 1 : 0
    const pinB = b.pinned ? 1 : 0
    if (pinA !== pinB) return pinB - pinA
    const order = byMode(a, b)
    if (order !== 0) return order
    return a.createdAt < b.createdAt ? 1 : -1
  })
}

// 'pinned' 只看置顶；主题 id 只看该主题；其余值一律全部
export function filterNotes(notes: ExerciseNote[], filter: string): ExerciseNote[] {
  if (filter === 'pinned') return notes.filter((note) => note.pinned === true)
  if (TOPIC_IDS.has(filter)) return notes.filter((note) => note.topic === filter)
  return notes
}

// 返回 null 表示「输入为空」或「写入失败（存储空间满等）」。
// 调用方须保证非空内容才调用；因此拿到 null 即视为保存失败，
// 上层应保持编辑态，不得当作已保存继续关闭/清理。
export function addExerciseNote(input: NoteInput): ExerciseNote | null {
  const title = (input.title ?? '').trim()
  const text = input.text.trim()
  if (!title && !text && !hasNoteMedia(input.html)) return null

  const now = new Date().toISOString()
  const note: ExerciseNote = {
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    text,
    html: input.html,
    pinned: input.pinned === true,
    topic: normalizeTopic(input.topic),
    createdAt: now,
    updatedAt: now,
  }
  if (!writeJSON(KEY, [note, ...getExerciseNotes()])) return null
  return note
}

// 返回 false 表示写入失败（存储空间满等）；内容为空或无变化视为无需写入，返回 true。
export function updateExerciseNote(id: string, patch: NotePatch): boolean {
  const now = new Date().toISOString()
  return writeJSON(
    KEY,
    getExerciseNotes().map((note) => {
      if (note.id !== id) return note
      const title = patch.title === undefined ? (note.title ?? '') : patch.title.trim()
      const text = patch.text === undefined ? note.text : patch.text.trim()
      const html = patch.html === undefined ? note.html : patch.html
      if (!title && !text && !hasNoteMedia(html)) return note
      return {
        ...note,
        title,
        text,
        html,
        pinned: patch.pinned === undefined ? note.pinned === true : patch.pinned,
        // undefined=不改；null=清除主题
        topic: patch.topic === undefined ? normalizeTopic(note.topic) : normalizeTopic(patch.topic),
        updatedAt: now,
      }
    }),
  )
}

// 置顶只改排序，不刷新「最近更新」时间
export function toggleNotePin(id: string, pinned: boolean): void {
  writeJSON(
    KEY,
    getExerciseNotes().map((note) => (note.id === id ? { ...note, pinned } : note)),
  )
}

// 删除笔记并返回是否写入成功
export function deleteExerciseNote(id: string): boolean {
  return writeJSON(KEY, getExerciseNotes().filter((note) => note.id !== id))
}

// 反向清理：把训练记录里指向已删除笔记的 noteId 清掉。
// 删除笔记时必须调用，否则打卡会一直显示「有心得」但点不开。
export function unlinkNoteByNoteId(noteId: string): boolean {
  const sessions = getSessions()
  const affected = sessions.some((item) => item.noteId === noteId)
  if (!affected) return true
  return writeJSON('trainingLog', sessions.map((item) =>
    item.noteId === noteId ? { ...item, noteId: undefined } : item,
  ))
}
