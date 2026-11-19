// 推/拉日热身清单：可自定义编辑（添加/删除），localStorage 持久化。
// 预置默认值整理自教练系列热身流程（coachGuide.session.warmup 的精简可执行版）。
import { readJSON, writeJSON } from './storage'

export interface WarmupItem {
  id: string
  name: string
  note: string
}

export type WarmupMap = { push: WarmupItem[]; pull: WarmupItem[] }

const KEY = 'warmups'

const genId = () => `w-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

const DEFAULTS: WarmupMap = {
  push: [
    { id: 'w-push-1', name: '放松胸小肌', note: '小球压实 + 同侧肩扇形环绕，两侧都做' },
    { id: 'w-push-2', name: '泡沫轴滚胸大肌', note: '撑起来前后滚动，膝盖不着地' },
    { id: 'w-push-3', name: '泡沫轴滚二头肌', note: '推力日二头紧张会让肩胛前倾' },
    { id: 'w-push-4', name: '弹力带激活', note: '前后拉 + 环绕，小幅度多次数，全程有张力' },
    { id: 'w-push-5', name: '下斜方 Y 字', note: '俯卧、拇指朝上，躯干不动只抬肩' },
    { id: 'w-push-6', name: '前锯肌激活', note: '拉锯式平板，小臂往外发力不塌腰' },
    { id: 'w-push-7', name: '手腕激活', note: '手放墙上反向支撑，五指撑、掌根翘' },
  ],
  pull: [
    { id: 'w-pull-1', name: '伟大者伸展', note: '左手从右肩前穿过向上旋转，每侧约 10 次' },
    { id: 'w-pull-2', name: '弹力带肩环绕', note: '半程：眼前到肩后即止，十几二十次 × 2 组' },
    { id: 'w-pull-3', name: '胸椎泡沫轴', note: '手向上延伸、前锯发力维持，再向下滚' },
    { id: 'w-pull-4', name: '四足支撑', note: '吸气顶高、呼气维持不掉，膝盖离地更难' },
    { id: 'w-pull-5', name: '靠墙顶肘对抗', note: '肘顶墙相互对抗，引导背阔/大圆/前锯' },
  ],
}

export function getWarmups(): WarmupMap {
  const saved = readJSON<Partial<WarmupMap>>(KEY, {})
  return {
    push: saved.push?.length ? saved.push : DEFAULTS.push,
    pull: saved.pull?.length ? saved.pull : DEFAULTS.pull,
  }
}

export function saveWarmups(map: WarmupMap): boolean {
  return writeJSON(KEY, map)
}

export function addWarmup(day: 'push' | 'pull', name: string, note = ''): WarmupItem | null {
  const trimmed = name.trim()
  if (!trimmed) return null
  const map = getWarmups()
  const item: WarmupItem = { id: genId(), name: trimmed, note: note.trim() }
  if (!saveWarmups({ ...map, [day]: [...map[day], item] })) return null
  return item
}

export function removeWarmup(day: 'push' | 'pull', id: string): boolean {
  const map = getWarmups()
  return saveWarmups({ ...map, [day]: map[day].filter((item) => item.id !== id) })
}

export function resetWarmups(day: 'push' | 'pull'): WarmupMap {
  const map = getWarmups()
  const next = { ...map, [day]: DEFAULTS[day] }
  saveWarmups(next)
  return next
}
