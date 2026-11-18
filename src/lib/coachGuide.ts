// 凯圣王 × 谭成义 推拉系列 · 系列总纲（批次1）
// 来源：抖音系列①–④、凯圣王黑板板书博客（CC BY 4.0）、什么值得买③名词释义整理、
// 什么值得买减载5信号整理；derived = 小夕把上述原则操作化，非教练原话。
// 只读静态内容；重量/次数记录与组间计时一律用训记。

export type GuideSource =
  | 'douyin-1'
  | 'douyin-2'
  | 'douyin-3'
  | 'douyin-4'
  | 'board'
  | 'smzdm-terms'
  | 'smzdm-deload'
  | 'community'
  | 'derived'

export const GUIDE_SOURCE_LABELS: Record<GuideSource, string> = {
  'douyin-1': '抖音①训练计划',
  'douyin-2': '抖音②推日跟练',
  'douyin-3': '抖音③名词释义',
  'douyin-4': '抖音④拉日跟练',
  board: '凯圣王黑板板书（CC BY 4.0）',
  'smzdm-terms': '什么值得买·③名词释义整理',
  'smzdm-deload': '什么值得买·减载5信号整理',
  community: '社区问答整理（知乎/小红书/B站评论）',
  derived: '小夕落地操作化（非教练原话）',
}

export interface GuideItem {
  text: string
  source: GuideSource
}

export interface RestRow {
  type: string
  reps: string
  rest: string
  source: GuideSource
}

export interface ProgressionPhase {
  label: string
  steps: string[]
  source: GuideSource
}

export interface DecisionRow {
  condition: string
  action: string
  source: GuideSource
}

export interface GlossaryEntry {
  term: string
  def: string
  source: GuideSource
}

export interface FaqEntry {
  q: string
  a: string
  source: GuideSource
}

export const SERIES_GUIDE = {
  schedule: {
    split: {
      text: '系列原版是推/拉/腿三分化；本 App 按邓先生要求只保留推日（胸肩三头）→ 拉日（背·三角肌后束·二头）交替，腿日不收录。',
      source: 'derived',
    } as GuideItem,
    redLines: [
      {
        text: '练2休1 或 练3休1，绝不连练4天；恢复好的人练3休1，疲劳感重的普通人练2休1。',
        source: 'board',
      },
    ] as GuideItem[],
    exampleWeek: {
      text: '示例周：周一推、周二拉、周三休、周四推、周五拉、周六休、周日休；每个部位一周刺激 2 次。恢复好也可不按星期、纯「练2休1」滚动。',
      source: 'derived',
    } as GuideItem,
    threeDayWeek: {
      text: '一周只练得了 3 次：本周推/拉/推、下周拉/推/拉，频率 1.5 次/周，仍在推荐区间内。',
      source: 'derived',
    } as GuideItem,
    volumeCap: [
      { text: '单部位每次 6–10 个正式组，不要自行加组。', source: 'board' },
      {
        text: '跟练崩掉的第一原因是「怕练不够、疯狂加容量」，三四週就走不下去、减载都恢复不过来。',
        source: 'smzdm-deload',
      },
    ] as GuideItem[],
    frequencyWhy: {
      text: '肌蛋白合成窗口只有 24–48 小时，一周一练的后半周肌肉在「空转」；每部位每周 1.5–2 次正好骑在窗口上。肌肉是在恢复里长的，不是训练里。',
      source: 'board',
    } as GuideItem,
  },

  session: {
    steps: [
      {
        text: '热身：一般热身 + 主项轻重量热身组；谭成义亲自带的推日/拉日两套热身步骤见下方热身清单。',
        source: 'douyin-2',
      },
      {
        text: '组数口径：板书早期写法「15/12/10/8」里第一组 15 是热身组；递进到 4×8 之后热身组另算（原文「不含热身进阶到4组8次」）。App 里标的组数一律指正式组。',
        source: 'board',
      },
      {
        text: '组内执行：目标次数 + RPE8（留 2 次余量）；完不成目标次数就逐组降重完成（RM 是动态的，容差 ±2 次）。',
        source: 'smzdm-terms',
      },
      {
        text: '动作顺序：推日 卧推→上斜哑铃卧推→双杠臂屈伸→仰卧臂屈伸→Y字侧平举；拉日 单手钢线下拉→单手器械划船→对握下拉→开肘拉→钢线弯举（②④跟练章节顺序）。',
        source: 'douyin-2',
      },
      {
        text: '收尾：拉伸。成熟节奏为热身→30–40 分钟力量→有氧→拉伸。',
        source: 'smzdm-deload',
      },
      {
        text: '组间歇计时一律用训记，App 不做组间计时。',
        source: 'derived',
      },
    ] as GuideItem[],
    warmup: {
      push: {
        label: '推日热身 · 谭指导带练（②片尾）',
        steps: [
          {
            text: '放松胸小肌：站立位，小球（越小越好）压住胸小肌位置（偏上），压实后活动同侧肩做扇形环绕，两侧都做——打开肩关节灵活性。',
            source: 'douyin-2',
          },
          {
            text: '放松胸大肌：泡沫轴上前后滚动，身体撑起来、膝盖不着地（着地胸就不干活了）——同时用对抗激活胸廓扩张能力，尽量多滚。',
            source: 'douyin-2',
          },
          {
            text: '放松二头肌：把二头压在泡沫轴上滚——推力动作时二头紧张会让肩胛前倾，出现肩痛、肩胛不稳，还会让关节受限。',
            source: 'douyin-2',
          },
          {
            text: '弹力带激活：先做从前向后的拉——躯干稳定不往前顶，放回去留一点距离不完全松掉，小幅度多次数；再做环绕：从眼睛位置放到后脑勺/肩后即止（半程），全程有张力——大幅反而磨损。',
            source: 'douyin-2',
          },
          {
            text: '下斜方 Y 字：趴垫上、两手在身体侧方、大拇指朝上、头不抬朝下看，躯干不动只抬肩、不仰腰（仰腰就练成竖脊肌了）；进阶：胸口压泡沫轴做 Y 字，或 Y 字位拉过来推出去，肩胛活动度和本体感受更强。',
            source: 'douyin-2',
          },
          {
            text: '前锯肌：拉锯式平板——小臂往外发力（不要塌成三角形），再前后移动；进阶可练倒立（增加肩锁空间、胸口弹性、膈肌能力），怕就做退阶的折叠式俯卧（身体成三角形向前推），简单就上墙。',
            source: 'douyin-2',
          },
          {
            text: '手腕激活：站立位手放墙上成斜角、掌心朝自己、五指撑、掌根翘起做反向支撑——推类动作手腕痛的人必做；简单就把斜角加大，注意强度、别让手腕压力过大。',
            source: 'douyin-2',
          },
        ] as GuideItem[],
      },
      pull: {
        label: '拉日热身 · 谭指导带练（④片尾）',
        steps: [
          {
            text: '伟大者伸展：左腿在前、右手在前，左手从身体右侧穿过，吸气向上旋转、眼看手指方向——拉伸同侧臀和大腿后侧，每侧约 10 次（背阔与臀、腹外斜的筋膜长在一起，要一起伸展激活）。',
            source: 'douyin-4',
          },
          {
            text: '弹力带肩环绕：半程即可——从眼睛正前方到肩正后方就结束，不往前顶、不完全掉下来（底部没张力，幅度过大反而是磨损）；十几二十次 × 2 组，多做更好。',
            source: 'douyin-4',
          },
          {
            text: '胸椎泡沫轴：滚胸椎时手向上延伸，让前锯肌保持发力、维持向上延长力再向下滚——激活前锯离心对抗 + 胸椎伸展，放松菱形肌和中斜方，整个人不要松掉。',
            source: 'douyin-4',
          },
          {
            text: '四足支撑：撑起来后吸气顶高、呼气维持不掉，膝盖离地更难——不做伸展式，练背更需要的是稳定。',
            source: 'douyin-4',
          },
          {
            text: '靠墙顶肘对抗：肘顶墙相互对抗，引导背阔/大圆/前锯做对抗——比单纯拉伸效率高，做完肩活动度变好、肩胛后倾能力变强（拉背时肩胛不容易翻上去）；简单就把脚离墙距离拉大。',
            source: 'douyin-4',
          },
        ] as GuideItem[],
      },
    },
    restTable: [
      { type: '大力量（神经适应）', reps: '1–5RM', rest: '3–8 分钟', source: 'smzdm-terms' },
      { type: '增肌', reps: '8–15 次', rest: '30 秒–3 分钟', source: 'smzdm-terms' },
      { type: '小肌群/耐力', reps: '20 次以上', rest: '30 秒–1 分钟', source: 'smzdm-terms' },
      { type: '板书强度阶段（2×6 等步骤）', reps: '5–6 次', rest: '3–5 分钟', source: 'board' },
    ] as RestRow[],
    restPrinciple: {
      text: '休息不够导致动作变形或次数掉 → 延长；「1 小时内练完」服务于质量，不是限制休息。同等容量总耗时缩短本身就是进步。',
      source: 'smzdm-terms',
    } as GuideItem,
  },

  progression: {
    oneLiner: {
      text: '先锁「次数+RPE」，沿「容量→强度」链递进；当前步骤达标才进下一步；重量跟着次数走——次数降档、重量升档。',
      source: 'board',
    } as GuideItem,
    start: [
      {
        text: '起点：主项 4 组 = 15(热身)/12/10/8，正式组 RPE8。',
        source: 'board',
      },
      {
        text: '选重量：标准动作、留 2 次余量刚好完成目标次数的负荷；动作质量优先于重量，牺牲动作标准换大重量会增加损伤风险、降低目标肌肉刺激效率。',
        source: 'smzdm-terms',
      },
    ] as GuideItem[],
    chain: [
      {
        label: '阶段1 · 容量',
        steps: ['15/12/10/8（第一组 15 = 热身）'],
        source: 'board',
      },
      {
        label: '阶段2 · 过渡',
        steps: ['15/12/8/8', '15/8/8/8', '4×8（此后热身另算）'],
        source: 'board',
      },
      {
        label: '阶段3 · 强度',
        steps: ['2×6（歇3–5分）', '3×6', '4×6', '2×5', '3×5', '4×5'],
        source: 'board',
      },
    ] as ProgressionPhase[],
    advanceRule: {
      text: '连续 2 次训练、当前步骤所有正式组都完成目标次数且 RPE≤8 → 进下一步（次数降一档、重量加最小档：杠铃最小片、哑铃下一档）；加重后次数回落就再爬。没达标就留在本步，不按日历推进。',
      source: 'derived',
    } as GuideItem,
    decisionFlow: [
      { condition: '全达标且 RPE≤8', action: '递进/加重', source: 'derived' },
      { condition: '达标但 RPE9–10', action: '重量不动重复一次', source: 'derived' },
      {
        condition: '没达标',
        action: '当次逐组降重完成；连续 2 次卡同一步且无恢复警报 → 退回半步',
        source: 'derived',
      },
      { condition: '有恢复警报', action: '减载，不是硬扛', source: 'derived' },
    ] as DecisionRow[],
    recordLoop: {
      text: '每次练完在训记记下每组 重量×次数×RPE；下次开练前看记录决定「进不进」，不凭感觉。',
      source: 'derived',
    } as GuideItem,
    intraSet: {
      text: 'RM 动态：力量涨了同重量 RM 变大；后几组完不成就降重凑目标（±2 次）。别比公斤数：「100kg 对高手是 15RM、对新手是 1RM」。',
      source: 'smzdm-terms',
    } as GuideItem,
    setsRule: [
      { text: '增组先过恢复检查（见减载信号）。', source: 'derived' },
      { text: '减载时砍组数不砍重量。', source: 'smzdm-deload' },
    ] as GuideItem[],
    isolationNote: {
      text: '孤立动作不走这条链：轻重量接近力竭（见力竭原则）；逐动作的退阶/进阶/次数调整见推日/拉日详情。',
      source: 'board',
    } as GuideItem,
  },

  failure: {
    compound: {
      text: '复合主项（75–85% 1RM）严禁力竭：大负荷第一下就募集了全部快肌纤维，练的是神经适应；力竭会让中枢神经恢复数天，拖垮整个周期频率。守 RPE8。',
      source: 'board',
    } as GuideItem,
    isolation: {
      text: '孤立单关节（30–50% 1RM）必须接近力竭：轻重量只有接近力竭的后几次才调动高门槛快肌纤维；单关节神经消耗小、恢复快。可用休息暂停法 10+10 或 10+5（力竭后歇十几秒再补几次）。',
      source: 'board',
    } as GuideItem,
    motto: { text: '主项留余量，小项拼力竭。', source: 'board' } as GuideItem,
  },

  deload: {
    monitoring: [
      { text: '建晨脉（静息心率）和握力基线，日常监测。', source: 'board' },
      {
        text: '晨脉持续高出基线约 6–12 次（板书口径更保守：5–10 次）或握力明显下降 = 神经疲劳积累，加休息。',
        source: 'smzdm-terms',
      },
    ] as GuideItem[],
    signals: [
      { text: '越练越睡不着：入睡难、半夜易醒、比平时早醒。', source: 'smzdm-deload' },
      { text: '力量连续两周停滞甚至下滑。', source: 'smzdm-deload' },
      { text: '酸痛超 72 小时还加重，或关节固定位置疼。', source: 'smzdm-deload' },
      { text: '健身变任务：出门前要做心理建设、练时只想快点结束。', source: 'smzdm-deload' },
      { text: '感冒、生病变多了。', source: 'smzdm-deload' },
    ] as GuideItem[],
    signalRule: {
      text: '5 个信号中 2 个以上，就从减载第 1 步开始。',
      source: 'smzdm-deload',
    } as GuideItem,
    redLine: {
      text: '浓茶色尿 + 剧烈肌肉疼痛无力 → 直接急诊（横纹肌溶解信号），别先查网页。',
      source: 'smzdm-deload',
    } as GuideItem,
    steps: [
      {
        text: '保强度砍容量：主项重量不动，总量砍 1/3（3组→2组，或砍 1–2 个孤立动作）。',
        source: 'smzdm-deload',
      },
      {
        text: '降频率：一周两循环→一循环半（练3休1再练2休2），重的练1休1。',
        source: 'smzdm-deload',
      },
      {
        text: '每 4–6 周一个减载周：平时 5–6 成重量，动作照做、强度放轻。',
        source: 'smzdm-deload',
      },
      {
        text: '还不行退二分化/一分化——是阶梯不是退步。',
        source: 'smzdm-deload',
      },
    ] as GuideItem[],
    premise: {
      text: '保住复合主项，减的是组数不是动作；减载期一过随时切回原计划。',
      source: 'smzdm-deload',
    } as GuideItem,
  },

  monthTuning: [
    {
      text: '第一个月就按计划思路走；一个月以后根据感觉与疲劳做动作微调。',
      source: 'douyin-1',
    },
    {
      text: '肩屈位仰卧臂屈伸累积肘部疲劳 → 换肩伸位的钢线下压。',
      source: 'douyin-1',
    },
    {
      text: '二头内侧刺激充分/练多了 → 换角练外侧，微调力线释放局部关节压力。',
      source: 'douyin-1',
    },
    {
      text: '神经积累到一定强度 → 加入更多肩部训练、拉高肩容量，释放推带来的神经强度。',
      source: 'douyin-1',
    },
  ] as GuideItem[],

  glossary: [
    {
      term: 'RM',
      def: '标准动作下某重量能连续做的最大次数；10RM=只能做10次的重量。动态，随力量增长变化；计划「12RM」指每组做到力竭 ±2 次。',
      source: 'smzdm-terms',
    },
    {
      term: 'RPE',
      def: '主观用力 1–10；10=力竭，8=留2次；靠动作速度下降感知疲劳。',
      source: 'smzdm-terms',
    },
    { term: '1RM', def: '只能做1次的极限重量；百分比如75–85%1RM=负荷强度。', source: 'smzdm-terms' },
    { term: '正式组/热身组', def: '计入计划的训练组 / 轻重量准备组（不计入）。', source: 'board' },
    { term: '组间歇', def: '组与组之间休息，时长见执行流程的间歇表。', source: 'smzdm-terms' },
    { term: '力竭', def: '标准动作再也做不起一次。', source: 'smzdm-terms' },
    { term: '休息暂停法', def: '力竭后歇十几秒补几次（10+5 / 10+10）。', source: 'board' },
    { term: '减载', def: '计划性降容量/强度，给恢复让路；是计划的一部分不是偷懒。', source: 'smzdm-deload' },
    { term: '分化', def: '肌群按训练日划分；推/拉/腿=三分化。', source: 'douyin-1' },
    { term: '频率', def: '每部位每周被刺激次数；本系列 1.5–2。', source: 'board' },
    { term: '渐进超负荷', def: '逐步提高需求（重量/次数/组数）；递进链就是它在本系列的落地。', source: 'smzdm-terms' },
    { term: '容量', def: '组数×次数×重量；「砍容量」主要指砍组数。', source: 'smzdm-deload' },
  ] as GlossaryEntry[],

  faq: [
    {
      q: '推日为什么不安排推肩？',
      a: '卧推+上斜+双杠已给前束和肘关节极大压迫，再加大重量推肩极易肘/肩袖劳损；改用 Y字侧平举专攻中束（肩胛冈平面、外展前斜30°、外旋位），背不易借力、保肘又准。',
      source: 'board',
    },
    {
      q: '拉日为什么强调海豹划船/开肘划船？',
      a: '拮抗推日：推多了胸紧→胸椎屈曲含胸；这两个动作专注中下斜方肌+菱形肌、肩胛充分后缩，拉伸胸椎前侧，改善圆肩肩痛。',
      source: 'board',
    },
    {
      q: '能天天练/一周6练吗？',
      a: '不能。板书不连练4天；一周6练是自然训练者上限、上班族平均只能2.8练；频率要跟恢复走。',
      source: 'smzdm-deload',
    },
    {
      q: '计划次数完不成怎么办？',
      a: '逐组降重完成（±2次容差）；整次都差先查减载信号，不是加意志。',
      source: 'smzdm-terms',
    },
    {
      q: '要不要和别人比公斤数？',
      a: '不要：RM 消除个体差异，看次数+力竭程度，而非杠铃片数。',
      source: 'smzdm-terms',
    },
    {
      q: '练超1小时算失败吗？',
      a: '不算：休息服务于质量；同等容量总耗时缩短本身就是进步。',
      source: 'smzdm-terms',
    },
    {
      q: '新手能直接跟吗？',
      a: '系列定位「新手和发烧友都能用」，但首月纯新手/睡眠不足7小时的上班族/想增肌的瘦子，先一二分化或固定器械练熟模式，恢复跟得上再上。',
      source: 'smzdm-deload',
    },
    {
      q: '腿日去掉影响吗？',
      a: '系列原版含腿；本 App 按邓先生要求只收推/拉。上肢推拉力线不受影响；日后想补腿再单独采集。',
      source: 'derived',
    },
    {
      q: '视频在哪看？',
      a: '推日/拉日每个动作展开后可以上传自己的视频，存在这台手机上；播放器支持上下滑动切换和 0.5x 慢放，原片请留在相册。',
      source: 'derived',
    },
  ] as FaqEntry[],
}