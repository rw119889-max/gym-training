// 计划翻页卡的「人话版」文案：贴着教练讲义的意思翻成短句，
// 不改动 coachPlans.ts 的原始讲义；详细内容仍在卡片折叠区里。

export interface PlanBrief {
  title?: string // 卡片上更顺口的动作名（缺省用原名）
  cue: string // 一句话：这个动作到底怎么做
  steps: string[] // 3 条短口令，尽量不用术语
  effort: string // 用力程度，替代 RPE 等专业写法
}

export const PLAN_BRIEF: Record<string, PlanBrief> = {
  'push-bench': {
    cue: '胸口使劲，把杠稳稳放下来再推起',
    steps: ['背贴凳，脚踩实', '下放慢一点，推起快一点', '手不要比肩膀高'],
    effort: '留点力气',
  },
  'push-incline-db': {
    cue: '斜着推，重点练上胸',
    steps: ['凳子斜 30 度左右就行', '哑铃往身体外侧慢慢放', '快到顶就往回推'],
    effort: '后两组可以拼',
  },
  'push-dips': {
    cue: '身体前倾练下胸，站直主要练手臂',
    steps: ['腿放前面，身体往前倾', '手肘往两边打开', '推到顶就停，别把胳膊锁死'],
    effort: '可以做到没力气',
  },
  'push-skullcrusher': {
    title: '仰卧臂屈伸',
    cue: '大臂别动，只弯小臂，练手臂后侧',
    steps: ['凳子斜一点，约 15 度', '手腕立起来，别往下塌', '不用完全伸直'],
    effort: '后两组可以拼',
  },
  'push-y-raise': {
    title: 'Y 字侧平举',
    cue: '双手相握，往斜上方抬，练肩膀',
    steps: ['器械调到胸口高度', '先绷紧肩膀再抬', '慢慢放下，别弹回来'],
    effort: '第二组拼一拼',
  },
  'pull-single-pulldown': {
    cue: '肩膀往下沉，把手肘拉到身体旁边',
    steps: ['坐稳，脚抵住前面', '拉的时候别耸肩', '慢慢放回去，别一下松掉'],
    effort: '最后一组可以拼',
  },
  'pull-single-row': {
    cue: '先把手伸出去把背拉长，再拉回来',
    steps: ['拉的时候肩膀往下沉', '别挺胸，身体别跟着转', '幅度不用大，背有感觉就行'],
    effort: '最后一组可以拼',
  },
  'pull-neutral-pulldown': {
    cue: '手心相对，往身后斜下方拉',
    steps: ['身体稍微后仰就行', '拉到背有感觉就停', '慢慢放，手腕别塌'],
    effort: '留点力气',
  },
  'pull-elbow-row': {
    cue: '手肘打开，往肚子方向拉，练上背中间',
    steps: ['不用管重量，找感觉', '身体站直或微微后仰', '肩膀往后收拢'],
    effort: '轻一点，找感觉',
  },
  'pull-cable-curl': {
    cue: '大臂贴住身体，只弯小臂',
    steps: ['手臂放膝盖上，稍微往前', '手腕勾住不要塌', '弯到顶就放下，别放太远'],
    effort: '最后两次吃力就行',
  },
}
