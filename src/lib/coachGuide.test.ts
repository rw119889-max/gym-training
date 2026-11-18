import { describe, expect, it } from 'vitest'
import { GUIDE_SOURCE_LABELS, SERIES_GUIDE } from './coachGuide'
import type { GuideSource } from './coachGuide'

function collectSources(node: unknown, out: GuideSource[] = []): GuideSource[] {
  if (Array.isArray(node)) {
    for (const entry of node) collectSources(entry, out)
    return out
  }
  if (node && typeof node === 'object') {
    const record = node as Record<string, unknown>
    if (typeof record.source === 'string') out.push(record.source as GuideSource)
    for (const value of Object.values(record)) collectSources(value, out)
  }
  return out
}

describe('coachGuide', () => {
  it('来源标签覆盖全部来源键且非空', () => {
    const keys = Object.keys(GUIDE_SOURCE_LABELS)
    expect(keys).toContain('community')
    expect(keys).toContain('derived')
    expect(keys).toContain('board')
    for (const label of Object.values(GUIDE_SOURCE_LABELS)) expect(label.trim()).toBeTruthy()
  })

  it('总纲每条内容的来源都在标签表内', () => {
    const sources = collectSources(SERIES_GUIDE)
    expect(sources.length).toBeGreaterThan(40)
    for (const source of sources) expect(GUIDE_SOURCE_LABELS[source], source).toBeTruthy()
    expect(new Set(sources)).toContain('douyin-1')
    expect(new Set(sources)).toContain('smzdm-deload')
  })

  it('排课红线：绝不连练4天', () => {
    expect(SERIES_GUIDE.schedule.redLines.some((item) => item.text.includes('连练4天'))).toBe(true)
  })

  it('组间歇表 4 行、递进决策表 4 行', () => {
    expect(SERIES_GUIDE.session.restTable).toHaveLength(4)
    expect(SERIES_GUIDE.progression.decisionFlow).toHaveLength(4)
  })

  it('递进链三阶段，末步 4×5', () => {
    expect(SERIES_GUIDE.progression.chain).toHaveLength(3)
    expect(SERIES_GUIDE.progression.chain[2].steps.at(-1)).toBe('4×5')
  })

  it('减载 5 信号、中 2 规则、浓茶色尿红线急诊', () => {
    expect(SERIES_GUIDE.deload.signals).toHaveLength(5)
    expect(SERIES_GUIDE.deload.signalRule.text).toContain('2 个')
    expect(SERIES_GUIDE.deload.redLine.text).toContain('急诊')
    expect(SERIES_GUIDE.deload.steps).toHaveLength(4)
  })

  it('一个月后微调 4 条，含肩容量释放神经强度', () => {
    expect(SERIES_GUIDE.monthTuning).toHaveLength(4)
    expect(SERIES_GUIDE.monthTuning.some((item) => item.text.includes('肩容量'))).toBe(true)
  })

  it('名词表 12 条、FAQ 9 条', () => {
    expect(SERIES_GUIDE.glossary).toHaveLength(12)
    expect(SERIES_GUIDE.faq).toHaveLength(9)
  })

  it('两套教练热身：推日 7 步、拉日 5 步，来源齐全', () => {
    const warmup = SERIES_GUIDE.session.warmup
    expect(warmup.push.steps).toHaveLength(7)
    expect(warmup.pull.steps).toHaveLength(5)
    for (const step of [...warmup.push.steps, ...warmup.pull.steps]) {
      expect(step.text.trim()).toBeTruthy()
      expect(GUIDE_SOURCE_LABELS[step.source]).toBeTruthy()
    }
    expect(warmup.push.steps.some((step) => step.text.includes('手腕'))).toBe(true)
    expect(warmup.pull.steps.some((step) => step.text.includes('伟大者伸展'))).toBe(true)
  })
})