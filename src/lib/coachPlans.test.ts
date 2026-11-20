import { describe, expect, it } from 'vitest'
import { COACH_SERIES, PLAN_DAYS, findPlanDay } from './coachPlans'
import { GUIDE_SOURCE_LABELS, SERIES_GUIDE } from './coachGuide'
import type { GuideSource } from './coachGuide'

function collectDisplayText(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) {
    for (const entry of node) collectDisplayText(entry, out)
    return out
  }
  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key !== 'source' && key !== 'video') collectDisplayText(value, out)
    }
    return out
  }
  if (typeof node === 'string') out.push(node)
  return out
}

describe('coachPlans', () => {
  it('只收录推、拉两天，不含腿日', () => {
    expect(PLAN_DAYS.map((day) => day.id)).toEqual(['push', 'pull'])
  })

  it('每天 5 个动作，与原文一致', () => {
    for (const day of PLAN_DAYS) {
      expect(day.exercises).toHaveLength(5)
    }
  })

  it('每个动作字段齐全：名称、肌群、组次、强度、至少 3 条要点', () => {
    for (const day of PLAN_DAYS) {
      for (const exercise of day.exercises) {
        expect(exercise.id).toBeTruthy()
        expect(exercise.name.trim()).toBeTruthy()
        expect(exercise.muscles.trim()).toBeTruthy()
        expect(exercise.sets.trim()).toBeTruthy()
        expect(exercise.intensity.trim()).toBeTruthy()
        expect(exercise.tips.length).toBeGreaterThanOrEqual(3)
        for (const tip of exercise.tips) expect(tip.trim()).toBeTruthy()
      }
    }
  })

  it('动作 id 全局唯一', () => {
    const ids = PLAN_DAYS.flatMap((day) => day.exercises.map((exercise) => exercise.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('力竭标记与强度描述一致', () => {
    for (const day of PLAN_DAYS) {
      for (const exercise of day.exercises) {
        if (exercise.intensity.includes('不力竭')) expect(exercise.toFailure).toBe(false)
        else if (exercise.intensity.includes('力竭')) expect(exercise.toFailure).toBe(true)
      }
    }
  })

  it('findPlanDay 返回对应训练日', () => {
    expect(findPlanDay('push').label).toBe('推日')
    expect(findPlanDay('pull').label).toBe('拉日')
  })

  it('系列信息统一为「我的计划」并保留去腿说明', () => {
    expect(COACH_SERIES.coaches).toEqual(['我的计划'])
    expect(COACH_SERIES.title).toBe('我的计划')
    expect(COACH_SERIES.keptNote).toContain('腿日已去掉')
  })

  it('每个动作都有标准视频深链、退阶、进阶、FAQ 与调整口径', () => {
    for (const day of PLAN_DAYS) {
      for (const exercise of day.exercises) {
        expect(exercise.video, exercise.id).toBeTruthy()
        expect(exercise.video?.bilibili).toContain(`?t=${exercise.video?.seconds}`)
        expect(exercise.video?.douyin).toContain('douyin.com/video/')
        expect(exercise.video?.chapter.trim()).toBeTruthy()
        expect(exercise.regression?.length, exercise.id).toBeGreaterThanOrEqual(1)
        expect(exercise.progression?.length, exercise.id).toBeGreaterThanOrEqual(1)
        expect(exercise.faq?.length, exercise.id).toBeGreaterThanOrEqual(2)
        expect(exercise.adjust?.trim(), exercise.id).toBeTruthy()
      }
    }
  })

  it('动作深化的来源标记都在标签表内', () => {
    for (const day of PLAN_DAYS) {
      for (const exercise of day.exercises) {
        const sources: GuideSource[] = [
          ...(exercise.notes ?? []),
          ...(exercise.regression ?? []),
          ...(exercise.progression ?? []),
          ...(exercise.faq ?? []),
        ].map((item) => item.source)
        for (const source of sources) {
          expect(GUIDE_SOURCE_LABELS[source], `${exercise.id}:${source}`).toBeTruthy()
        }
      }
    }
  })

  it('教练区可见文案不含来源署名或来源平台标签', () => {
    const displayText = collectDisplayText([COACH_SERIES, PLAN_DAYS, SERIES_GUIDE]).join(' ')
    expect(displayText).not.toMatch(/板书|小夕|什么值得买|[①②③④]|纯享版|CC BY|黑板|抖音|B站/)
  })

  it('Y 字侧平举标中束（板书核校）', () => {
    const y = findPlanDay('push').exercises.find((exercise) => exercise.id === 'push-y-raise')
    expect(y?.muscles).toBe('三角肌中束')
  })
})