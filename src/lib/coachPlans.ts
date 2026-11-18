// 凯圣王 × 谭成义「推拉腿三分化」系列 · 推日 / 拉日
// 内容整理自两位博主公开发布的三分化教学（抖音①–④跟练/释义、黑板板书博客 CC BY 4.0、
// 什么值得买整理与社区问答），按邓先生要求只保留推、拉两天，腿日不收录。
// 重量、组数记录仍用训记，本 App 只负责「这一组怎么练对」。
// 批次2/3：推、拉日动作补标准视频深链、退阶/进阶、逐动作 FAQ 与次数调整口径。

import type { GuideItem, GuideSource } from './coachGuide'

export type PlanDay = 'push' | 'pull'

export interface ExerciseVideo {
  bilibili: string
  douyin: string
  chapter: string
  seconds: number
}

export interface ExerciseFaq {
  q: string
  a: string
  source: GuideSource
}

export interface PlanExercise {
  id: string
  name: string
  muscles: string
  sets: string
  intensity: string
  toFailure: boolean
  tips: string[]
  video?: ExerciseVideo
  regression?: GuideItem[]
  progression?: GuideItem[]
  faq?: ExerciseFaq[]
  adjust?: string
  notes?: GuideItem[]
}

export interface PlanDayInfo {
  id: PlanDay
  label: string
  en: string
  focus: string
  summary: string
  exercises: PlanExercise[]
}

export const COACH_SERIES = {
  coaches: ['凯圣王', '谭成义'],
  title: '凯圣王 × 谭成义',
  seriesName: '推拉腿三分化系列',
  keptNote: '只保留推、拉两天，腿日已去掉',
  principle:
    '同发力模式的肌肉放在同一天练：推日集中胸、肩、三头，拉日集中背、后束、二头，协同发力节省体能、刺激更到位，肌群间隔 48 小时以上恢复。原系列三天一轮，去掉腿日后推、拉交替安排，中间插休息或低强度有氧，新手优先保证动作标准。',
  sourceNote: '组次与要点整理自两位博主公开的三分化教学系列；重量、组数记录用训记，组间休息用训记模板的倒计时。',
}

export const PLAN_DAYS: PlanDayInfo[] = [
  {
    id: 'push',
    label: '推日',
    en: 'PUSH DAY',
    focus: '胸 + 三角肌中束 + 肱三头肌',
    summary:
      '胸部推举类动作顺带带动肩中束、三头协同发力，同属推系肌群，集中训练不分散精力，主打胸部 + 肩中围度 + 手臂后侧。',
    exercises: [
      {
        id: 'push-bench',
        name: '杠铃卧推（平板）',
        muscles: '胸大肌、三角肌前束、肱三头肌',
        sets: '4 组 · 15 / 12 / 10 / 8 次',
        intensity: 'RPE 8 · 不力竭',
        toFailure: false,
        tips: [
          '握距：小臂大致垂直于地面',
          '出杠：挺胸、肩胛后缩、髋微顶起杠、放臀、稳定、开推',
          '脚跟踩实，蹬地方向斜向往肩（C 型蹬法），骨盆不要过分前倾',
          '呼吸：呼气时闭住嘴巴，下落过程保持胸廓扩张；推起时用「高压锅式」微吐气维持胸廓开放，不能一口气全部释放',
          '速度：匀速下放，推起稍快',
          '开肘底线：手不能高于肩；肘和肩平齐、肩胛功能正常最好',
        ],
        video: {
          bilibili: 'https://www.bilibili.com/video/BV1CSoKBaEgK?t=12',
          douyin: 'https://www.douyin.com/video/7625479021379194118',
          chapter: '杠铃卧推',
          seconds: 12,
        },
        notes: [
          {
            text: '主项兼「动作筛查」：做不到触胸、或触胸前肩前扣，往往暴露胸椎活动度不足、肩胛后缩差、肩外展代偿或肱骨前顶',
            source: 'board',
          },
          {
            text: '卧推是菱形肌、前锯肌、胸椎伸展与腹压高度协同的全身动作，肌间协调性不能被固定器械完全替代',
            source: 'board',
          },
        ],
        regression: [
          {
            text: '跪姿俯卧撑 → 哑铃平板卧推 → 空杆卧推 → 逐次加重；触胸前肩前扣先退回哑铃/器械，把肩胛练稳再上杠铃',
            source: 'derived',
          },
        ],
        progression: [
          {
            text: '按总纲递进链走到 4×5 后，可加暂停卧推（胸口停 1–2 秒）或继续沿链加重',
            source: 'derived',
          },
        ],
        faq: [
          {
            q: '推的时候胸没感觉？',
            a: '意念「用胸把杠铃挤起来」：肩胛后缩下沉、胸廓保持扩张，不要只想着伸手推杠',
            source: 'community',
          },
          {
            q: '肩前侧疼？',
            a: '先守开肘底线：手不能高于肩、肘与肩平齐；仍疼就退阶到哑铃/器械，并排查胸椎活动度与肩胛后缩能力',
            source: 'douyin-2',
          },
          {
            q: '为什么不用固定器械代替？',
            a: '杠铃卧推能上最大机械张力，还兼动作模式筛查与肌间协调开发，固定器械替代不了',
            source: 'board',
          },
        ],
        adjust:
          '走总纲递进链：15(热身)/12/10/8 → 15/12/8/8 → 15/8/8/8 → 4×8 → 2×6 → 3×6 → 4×6 → 2×5 → 3×5 → 4×5；全程 RPE 8 留 2 次、严禁力竭；进入 6/5 次强度阶段组间歇拉长到 3–5 分钟',
      },
      {
        id: 'push-incline-db',
        name: '哑铃上斜推胸',
        muscles: '上胸',
        sets: '4 组 × 12 次',
        intensity: 'RPE 8 起 · 后期后两组可力竭（最多两组）',
        toFailure: true,
        tips: [
          '凳子角度 30° 起（板书）至 45°（纯享版），角度越高三角肌前束参与越多',
          '手腕内扣——手指向里握住，带动上胸发力；手腕外丢时上胸放松',
          '下放：哑铃向外拉伸（向远处延伸），而不是直接往下掉',
          '顶端不用固定，提前 1–2 厘米回放来维持张力',
          '进阶：深呼吸后闭合肋骨再推，把气息「挤」到上胸的位置',
        ],
        video: {
          bilibili: 'https://www.bilibili.com/video/BV1CSoKBaEgK?t=1653',
          douyin: 'https://www.douyin.com/video/7625479021379194118',
          chapter: '哑铃上斜卧推',
          seconds: 1653,
        },
        notes: [
          {
            text: '板书推荐 30°（沿胸锁延长线堆肉），纯享版演示 45°；两个角度都有效，按上胸感受选',
            source: 'board',
          },
          {
            text: '选上斜哑铃而非杠铃：很多人上斜杠铃活动度不好；哑铃沿胸椎延长线（肩到上胸）堆肉、磨练技术，还是自由动作',
            source: 'douyin-1',
          },
        ],
        regression: [
          {
            text: '上斜找不到感觉时，先用器械上斜推或平板哑铃卧推打底',
            source: 'derived',
          },
        ],
        progression: [
          {
            text: '30° 连续两次训练全部 4×12 达标 → 加重、次数回落到 8–10 再爬回 12，或试 45°；进阶可在底部停 1 秒消除牵张反射',
            source: 'derived',
          },
        ],
        faq: [
          {
            q: '上胸没感觉？',
            a: '手腕内扣（手指向里握）带动上胸发力；下放时哑铃向远处延伸拉伸，而不是直接往下掉',
            source: 'douyin-2',
          },
          {
            q: '做完腰酸？',
            a: '把凳角降到 30°，推前深呼吸闭合肋骨再推，避免腰椎过伸代偿',
            source: 'derived',
          },
        ],
        adjust:
          '第一天 4 组全留 2–3 次余量（RPE 8）→ 后期把最后一组推到 RPE 9–9.5 接近力竭 → 熟练后最后两组力竭（最多两组）→ 后两组能标准不变形力竭 → 适当拉长组间歇 + 加重',
      },
      {
        id: 'push-dips',
        name: '双杠臂屈伸',
        muscles: '下胸、前锯肌、肱三头肌',
        sets: '4 组 × 12 次',
        intensity: '可以力竭',
        toFailure: true,
        tips: [
          '腿在前、髋在后——身体后倾，跟推下胸轨迹一致；直立 = 练三头',
          '肘往两边打开再收回，不要夹着胳膊',
          '不追求全幅度——下胸有张力就停，肩胛失控的位置就是危险',
          '推要收紧（把前锯顶出去），放可以少放',
        ],
        video: {
          bilibili: 'https://www.bilibili.com/video/BV1CSoKBaEgK?t=2893',
          douyin: 'https://www.douyin.com/video/7625479021379194118',
          chapter: '双杠臂屈伸（含退阶）',
          seconds: 2893,
        },
        notes: [
          {
            text: '4×12 或到力竭都可以；只能做 6 个到力竭也没问题——这个动作做到力竭是安全的',
            source: 'douyin-1',
          },
          {
            text: '双杠这类远固定/支撑训练一定要加进去，对整个肩胛开发都有帮助',
            source: 'douyin-1',
          },
        ],
        regression: [
          {
            text: '教练原话退阶：跪在垫子上、手撑凳子，做下胸的退阶支撑训练（②跟练视频本章含演示）',
            source: 'douyin-1',
          },
          {
            text: '备选：自重做不满 8 个用弹力带或辅助双杠器械',
            source: 'community',
          },
        ],
        progression: [
          {
            text: '自重能稳定做 15 个以上：挂负重腰带逐步加重，回到 8–12 次区间',
            source: 'community',
          },
        ],
        faq: [
          {
            q: '下到多深？肩前侧疼？',
            a: '不追求全幅度：下胸有张力就停，肩胛失控的位置就是危险',
            source: 'douyin-2',
          },
          {
            q: '有肩伤史还能练吗？',
            a: '改下斜哑铃推或器械飞鸟替代双杠，避开肩胛远固定位的压力',
            source: 'community',
          },
          {
            q: '练下胸还是三头？',
            a: '腿在前、髋在后身体后倾 = 下胸轨迹；躯干直立 = 三头为主',
            source: 'douyin-2',
          },
          {
            q: '到底能不能力竭？',
            a: '自重双杠可以力竭；一旦挂负重当主项练，就守 RPE 8 留余量——口径按负荷性质切换',
            source: 'derived',
          },
        ],
        adjust: '4×12；单组做不满 8 个 → 退阶辅助；稳定 15 个以上 → 负重进阶',
      },
      {
        id: 'push-skullcrusher',
        name: '仰卧臂屈伸（碎颅者）',
        muscles: '肱三头肌长头',
        sets: '起步 4×15 → 递进 4×12',
        intensity: 'RPE 8 起 · 后期后两组力竭',
        toFailure: true,
        tips: [
          '凳子倾斜到 15 度角，三头长头受力最大',
          '从肩屈位开始，哑铃位于额头偏上位置',
          '肘部外旋，有三头肌对抗的感觉；内旋的时候直接就放松了',
          '手腕竖起握拳，不要让腕部下垂——腕下垂 = 肘部压力增大 = 肘痛的原因',
          '不必完全伸直，越往上力臂越短、收益越低',
        ],
        video: {
          bilibili: 'https://www.bilibili.com/video/BV1CSoKBaEgK?t=3549',
          douyin: 'https://www.douyin.com/video/7625479021379194118',
          chapter: '仰卧臂屈伸',
          seconds: 3549,
        },
        notes: [
          {
            text: '板书写「仰卧曲柄杠铃（EZ 杆）臂屈伸」，纯享版用哑铃演示；同为肩屈位三头长头离心，器械可互换',
            source: 'board',
          },
        ],
        regression: [
          {
            text: '练满一个月若肘部累积疲劳：换肩伸位的钢线下压（板书明确的微调方案）',
            source: 'board',
          },
        ],
        progression: [
          {
            text: '当前重量 4×12 到顶仍轻松 → 微加重；或把离心放慢到 3 秒增加长头张力',
            source: 'derived',
          },
        ],
        faq: [
          {
            q: '肘疼？',
            a: '手腕竖起握拳、绝不塌腕——腕下垂 = 肘压增大 = 肘痛主因；一个月后仍疲劳就按板书改肩伸位下压',
            source: 'douyin-2',
          },
          {
            q: '要不要完全伸直？',
            a: '不必：越往上力臂越短、收益越低，保持张力即可',
            source: 'douyin-2',
          },
          {
            q: '能不能力竭？',
            a: '起步 4×15 不力竭；递进到 4×12 后最后两组到力竭、再加一点重量；可用 10+5 休息停顿',
            source: 'douyin-1',
          },
        ],
        adjust:
          '起步 4×15 留 2 次余量不力竭 → 第 2 次训练把 1 组换 12 次 → 逐次 2 组 12、3 组 12、4 组 12 → 4×12 RPE 8 基础上最后两组到力竭 → 再加一点重量；组间歇 30 秒–1 分钟',
      },
      {
        id: 'push-y-raise',
        name: 'Y 字侧平举（外旋位）',
        muscles: '三角肌中束',
        sets: '3 组 ×（10 次 + 歇 5 秒 + 10 次）',
        intensity: '第二段力竭 · 两侧做完算一组',
        toFailure: true,
        tips: [
          '器械的高度与胸口平齐',
          '双手相握，全过程保持外旋',
          '预拉启动：三角肌先绷紧对抗，再动',
          '肩胛面停（与躯干同一平面），继续往后 = 没阻力 = 休息',
          '离心保持外旋拉到最长后再进下一组，不要弹回来',
        ],
        video: {
          bilibili: 'https://www.bilibili.com/video/BV1CSoKBaEgK?t=4155',
          douyin: 'https://www.douyin.com/video/7625479021379194118',
          chapter: 'Y字侧平举',
          seconds: 4155,
        },
        notes: [
          {
            text: '板书定位：肩胛冈平面（外展前斜 30°）外旋位抬起，专攻中束、背部不易借力',
            source: 'board',
          },
        ],
        regression: [
          {
            text: '钢线重量找不到感觉时换更轻哑铃做 Y 字举，先练外旋位轨迹',
            source: 'derived',
          },
        ],
        progression: [
          {
            text: '顶端停 1 秒、离心放慢；不靠摆重升级——中束孤立加重量极易代偿',
            source: 'derived',
          },
        ],
        faq: [
          {
            q: '背/斜方借力？',
            a: '抬到肩胛面（与躯干同一平面）就停，继续往后 = 没阻力 = 休息；全程保持外旋、预拉启动',
            source: 'douyin-2',
          },
          {
            q: '为什么不安排推肩/普通侧平举？',
            a: '卧推 + 上斜 + 双杠已给前束和肘关节极大压迫，再加大重量推肩易劳损肘肩；Y 字举在肩胛冈平面专攻中束，保肘又精准',
            source: 'board',
          },
        ],
        adjust:
          '3 组 ×（10 次 + 歇 5 秒 + 10 次），两侧做完算一组；第二段推到力竭——轻重量孤立只有接近力竭才调动高门槛白肌',
      },
    ],
  },
  {
    id: 'pull',
    label: '拉日',
    en: 'PULL DAY',
    focus: '背 + 三角肌后束 + 肱二头肌',
    summary:
      '练背的所有拉拽动作天然借力肩后束、肱二头肌，练背收尾顺带练手臂前侧，改善圆肩、加厚后背、练出麒麟臂。',
    exercises: [
      {
        id: 'pull-single-pulldown',
        name: '单手钢线下拉',
        muscles: '背阔肌',
        sets: '前 3 组 × 12 次 · 第 4 组 10 次 + 歇 5 秒 + 5 次',
        intensity: '第 4 组两段力竭',
        toFailure: true,
        tips: [
          '微后仰坐，脚底抵住做支点，手放在膝盖上固定胸椎，不要过度后仰',
          '对握，手腕带勾不塌',
          '拉的时候肩胛往下推（下降 + 内收），手不完全锁死，拉到背阔拉长就可以',
          '离心保持对抗时不要往前推出去——背阔松开之后再启动，才不是靠背阔发力',
          '重量标准：背阔能控制多少就选多少',
        ],
        video: {
          bilibili: 'https://www.bilibili.com/video/BV1v5opBhEDc?t=16',
          douyin: 'https://www.douyin.com/video/7627846384783297834',
          chapter: '单手钢线下拉',
          seconds: 16,
        },
        notes: [
          {
            text: '力线与背阔肌纤维走向完全吻合，单侧行程更长、肩胛下降更充分',
            source: 'board',
          },
        ],
        regression: [
          {
            text: '找不到「先降肩胛再拉」的模式：先双手下拉或直臂下压建立感觉',
            source: 'derived',
          },
        ],
        progression: [
          {
            text: '前 3 组 ×12 稳定后第 4 组 10+5 加重；或离心放慢到 3 秒',
            source: 'derived',
          },
          {
            text: '第 2 次训练就两组做 10 到力竭 + 5；再下一回适当加重，仍以感觉与动作质量为主',
            source: 'douyin-1',
          },
        ],
        faq: [
          {
            q: '背没感觉、全是手臂？',
            a: '肩胛先下降 + 内收再动手；回放先拉长背阔再屈肘——手先动就是废行程',
            source: 'douyin-4',
          },
          {
            q: '重量怎么选？',
            a: '背阔能控制多少就选多少，控制不住就降重量',
            source: 'douyin-4',
          },
          {
            q: '为什么用单手？',
            a: '力线与背阔肌纤维走向完全吻合，单侧能拉得更长、肩胛下降更充分',
            source: 'board',
          },
        ],
        adjust:
          '前 3 组 ×12 不力竭；第 4 组 10 + 歇 5 秒 + 5 两段力竭；第 2 次训练 2 组 10+5，第 3 次起适当加重、感觉与动作质量优先；逐组掉重正常（RM 动态 ±2），次数目标不变',
      },
      {
        id: 'pull-single-row',
        name: '单手器械划船',
        muscles: '背阔肌（大重量）',
        sets: '前 3 组 × 10 次 · 末组 10 + 5',
        intensity: '末组 10 + 5 · 逐周加力竭组',
        toFailure: true,
        tips: [
          '拉的时候肩膀往下推——很多人只用上半身的力量，下半背没有参与',
          '回放先把背拉长再动手，手先动了、背阔没拉长就是废行程',
          '节奏偏快但适中，太慢的话其他肌群就会代偿',
        ],
        video: {
          bilibili: 'https://www.bilibili.com/video/BV1v5opBhEDc?t=1684',
          douyin: 'https://www.douyin.com/video/7627846384783297834',
          chapter: '单手器械划船',
          seconds: 1684,
        },
        notes: [
          {
            text: '胸/手支撑消除腰部代偿，强化水平面拉力',
            source: 'board',
          },
          {
            text: '次数差异：纯享版写前 3 组 ×12，①计划口播为前 3 组 ×10；此处采①（计划作者本人），④跟练演示口径待复核',
            source: 'douyin-1',
          },
          {
            text: '器械比哑铃多了手撑支点，肩关节活动度/稳定性要求更小，能用的重量更大',
            source: 'douyin-1',
          },
        ],
        regression: [
          {
            text: '先用轻重量胸支撑划船或海豹划船找肩胛后缩感觉',
            source: 'derived',
          },
        ],
        progression: [
          {
            text: '第 2 周再加一个 10 到力竭 + 5 组，第 3 周再加一个；之后减到两组加重量做 10 次不到力竭，如此循环再加回来',
            source: 'douyin-1',
          },
        ],
        faq: [
          {
            q: '腰酸 / 甩腰借力？',
            a: '胸贴紧支撑垫，绝对无下背借力；回放先把背拉长再动手',
            source: 'douyin-4',
          },
          {
            q: '只有上背发力、下背阔没参与？',
            a: '拉的时候肩膀往下推——很多人只用上半身的力量',
            source: 'douyin-4',
          },
        ],
        adjust:
          '前 3 组 ×10 不力竭；末组 10 到力竭 + 歇 5 秒 + 5；第 2/3 周逐周加一个 10+5 力竭组 → 减到两组加重做 10 次不力竭 → 循环再加回来；节奏偏快但适中，太慢其他肌群代偿',
      },
      {
        id: 'pull-neutral-pulldown',
        name: '对握下拉',
        muscles: '背阔肌',
        sets: '4 组 × 12–8 次',
        intensity: '不力竭',
        toFailure: false,
        tips: [
          '宽握对握比单手下拉对肩胛的要求更高，行程也更长',
          '身体微后仰，不要过分挺胸——挺胸过度肩胛内收过多 → 腰压增大',
          '把背阔拉长就可以，不需要放到关节最大位置',
          '下放过程保持降肋收紧、核心稳定，肩胛往下推，背阔收紧',
          '宽握稍微容易一些，窄握比较难，根据自己的感觉决定',
          '追求强度高：下放幅度大一些，身体不要过多参与，保持相对中立',
        ],
        video: {
          bilibili: 'https://www.bilibili.com/video/BV1v5opBhEDc?t=3117',
          douyin: 'https://www.douyin.com/video/7627846384783297834',
          chapter: '对握下拉',
          seconds: 3117,
        },
        notes: [
          {
            text: '板书把对握下拉列为拉日负重主项（背阔上部 + 大圆肌，上重量的动作）',
            source: 'board',
          },
          {
            text: '顺序差异：板书序 = 单手下拉 → 对握下拉 → 单手划船 → 开肘 → 弯举；视频④序 = 单手下拉 → 单手划船 → 对握下拉 → 开肘 → 弯举。两种都成立，主项放在神经状态好的前段即可',
            source: 'board',
          },
        ],
        regression: [
          {
            text: '肌肉张力感觉不好：4 组全做 12 次，先用较轻重量建立动作模式',
            source: 'douyin-1',
          },
        ],
        progression: [
          {
            text: '动作熟练度高就多做 8 次；4×12 稳定后递进 4×8 加重（主项口径 RPE 8、严禁力竭），重量一点一点提高',
            source: 'douyin-1',
          },
        ],
        faq: [
          {
            q: '腰压大 / 过度挺胸？',
            a: '微后仰即可，不要过分挺胸——挺胸过度 → 肩胛内收过多 → 腰压增大；下放保持降肋收紧、核心稳定',
            source: 'douyin-4',
          },
          {
            q: '宽握还是窄握？',
            a: '宽握稍微容易、窄握比较难，根据自己的感觉决定；追求强度就下放幅度大一些、躯干保持相对中立',
            source: 'douyin-4',
          },
          {
            q: '放到多低？',
            a: '把背阔拉长就可以，不需要放到关节最大位置',
            source: 'douyin-4',
          },
        ],
        adjust: '4 组 ×12–8 次、RPE 8 不力竭（主项口径）；12 次稳定后向 8 次递进加重',
      },
      {
        id: 'pull-elbow-row',
        name: '开肘划船',
        muscles: '中下斜方肌、菱形肌',
        sets: '4 组 × 12–15 次',
        intensity: '不力竭 · 以感觉为主',
        toFailure: false,
        tips: [
          '马格南、钢线、海豹划船、T 杠都可以用，核心是开肘 + 水平向后拉',
          '正握（前面四个动作都是反手 / 对握，这里平衡）',
          '躯干中立位接近杠铃划船；微后仰带斜方；微前倾偏中下背，根据自己的弱势调整',
          '找感觉就可以，不用考虑重量',
        ],
        video: {
          bilibili: 'https://www.bilibili.com/video/BV1v5opBhEDc?t=3723',
          douyin: 'https://www.douyin.com/video/7627846384783297834',
          chapter: '开肘拉',
          seconds: 3723,
        },
        notes: [
          {
            text: '拮抗推日的恢复动作：推日练多胸肌紧张 → 胸椎屈曲（含胸）；开肘/海豹划船收缩中下斜方 + 菱形肌，肩胛充分后缩拉伸胸椎前侧，改善圆肩与肩痛',
            source: 'board',
          },
          {
            text: '胸部紧贴支撑垫，完全杜绝用下背甩动代偿',
            source: 'board',
          },
          {
            text: '健身房有海豹划船就优先替换开肘划船——海豹完全没法借力；没有才用滑轮版',
            source: 'douyin-1',
          },
          {
            text: '谭指导特意强调：一定要有感觉，不能抡、甩，用中下斜方肌感觉肩胛有一个很好的内收角度',
            source: 'douyin-1',
          },
        ],
        regression: [
          {
            text: '先轻重量海豹划船找肩胛后缩感觉，再加开肘角度',
            source: 'derived',
          },
        ],
        progression: [
          {
            text: '感觉稳定后缓加重但保持 12–15 次；顶峰后缩停 1 秒',
            source: 'derived',
          },
        ],
        faq: [
          {
            q: '用什么器械？',
            a: '马格南、钢线、海豹划船、T 杠都可以，核心是开肘 + 水平向后拉；正握平衡前面四个反手/对握动作',
            source: 'douyin-4',
          },
          {
            q: '重量怎么选？',
            a: '找感觉就可以，不用考虑重量；微后仰带斜方、微前倾偏中下背，根据自己的弱势调整',
            source: 'douyin-4',
          },
        ],
        adjust: '4 组 ×12–15 次、不力竭、以感觉为主',
      },
      {
        id: 'pull-cable-curl',
        name: '钢线二头弯举',
        muscles: '肱二头肌',
        sets: '3 组 × 12–15 次',
        intensity: '接近力竭（末 1–2 次）· 动作不变形',
        toFailure: true,
        tips: [
          '钢线高度：放下来时手臂微曲还有阻力（完全伸直就是二头放松了）',
          '大臂放膝盖上稍微往前，肩屈程度大一些感受更好',
          '手腕勾起不塌，外旋时内侧募集感更强',
          '收到顶峰马上放下，不要放得太远——眼睛看得见的地方大脑才会记住',
        ],
        video: {
          bilibili: 'https://www.bilibili.com/video/BV1v5opBhEDc?t=4358',
          douyin: 'https://www.douyin.com/video/7627846384783297834',
          chapter: '钢线弯举',
          seconds: 4358,
        },
        notes: [
          {
            text: '一个月后内侧刺激充分 → 换角练外侧，通过动作力线微调释放局部关节压力',
            source: 'board',
          },
          {
            text: '力竭口径：纯享版标「不力竭」，板书明确弯举属轻重量孤立、必须接近力竭才调动高门槛白肌；此处采板书口径（与碎颅者一致）',
            source: 'board',
          },
        ],
        regression: [
          {
            text: '控制不住重量先哑铃牧师凳弯举固定大臂，再回钢线',
            source: 'derived',
          },
        ],
        progression: [
          {
            text: '3×12–15 稳定后微加重或离心放慢到 3 秒；不摆躯干借力',
            source: 'derived',
          },
        ],
        faq: [
          {
            q: '前臂酸、二头没感觉？',
            a: '手腕勾起不塌；大臂放膝盖上稍微往前，肩屈程度大一些感受更好',
            source: 'douyin-4',
          },
          {
            q: '为什么不放到底？',
            a: '收到顶峰马上放下、不要放太远——眼睛看得见的地方大脑才会记住；钢线高度以放下来手臂微曲仍有阻力为准',
            source: 'douyin-4',
          },
          {
            q: '一直练内侧？',
            a: '一个月后换角练外侧（板书微调），调整肩屈角度/握距改变力线',
            source: 'board',
          },
        ],
        adjust: '3 组 ×12–15 次、接近力竭不变形；一个月后换角练外侧释放关节压力',
      },
    ],
  },
]

export function findPlanDay(day: PlanDay): PlanDayInfo {
  return PLAN_DAYS.find((item) => item.id === day) ?? PLAN_DAYS[0]
}