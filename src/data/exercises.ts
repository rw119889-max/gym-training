import type { Exercise, ExerciseGroup } from '../types'

export const GROUP_LABELS: Record<ExerciseGroup, string> = {
  legs: '腿臀腹',
  chest: '胸肩三头',
  back: '背二头后束',
}

export const GROUP_HINTS: Record<ExerciseGroup, string> = {
  legs: '深蹲 · 腿举 · 硬拉 · 腿屈伸/弯举 · 提踵 · 抬腿',
  chest: '卧推 · 上斜 · 推举 · 侧平举 · 后束 · 三头',
  back: '引体 · 下拉 · 划船 · 面拉 · 弯举',
}

export const EXERCISES: Exercise[] = [
  // ================= 腿臀腹 =================
  {
    id: 'barbell-squat',
    name: '杠铃深蹲',
    group: 'legs',
    preChecks: [
      '脚：与肩同宽，脚尖略外八，大脚趾根 / 小脚趾根 / 脚跟三点压地',
      '杠位：压在斜方肌上，脖子放松，不压颈椎',
      '气：吸气把肚子顶起来（腰带位置鼓），不是提胸',
    ],
    cue: '全脚掌压地，先坐髋',
    targetFeeling: '大腿前侧和臀部共同发力；起身时膝盖与髋部同时打开',
    safetyNotes: [
      '出现锐痛、麻木或疼痛持续加重时，停止本组',
      '调整动作后仍不适，不要通过加重量硬做',
    ],
    symptoms: [
      { id: 'lower-back', label: '腰酸 / 下背发紧', fix: '先坐髋，别让腰先起' },
      { id: 'knee-in', label: '膝盖内扣或膝前痛', fix: '膝盖推开，对准脚尖' },
      { id: 'heel-up', label: '脚跟离地 / 重心跑到前脚掌', fix: '屁股往后坐，压住脚跟' },
      { id: 'no-glute', label: '只有大腿前侧胀，屁股没感觉', fix: '起身用髋往前顶' },
    ],
    commonMistakes: [
      {
        name: '早安式起身',
        symptom: '起身时屁股先撅起，腰跟着弯',
        cause: '腿蹬地不足，髋伸启动太晚，或重量超出当前控制',
        fix: '减 10%，起身时胸口和屁股同时上升',
      },
      {
        name: '膝盖内扣',
        symptom: '蹲到底或起身瞬间膝盖往内靠，膝内侧不舒服',
        cause: '臀中肌不发力，脚外侧没压住',
        fix: '脚外旋 5°，蹲时想“用膝盖把地面掰开”',
      },
      {
        name: '蹲太深后腰塌',
        symptom: '到底时尾骨往内卷，腰突然松掉',
        cause: '踝 / 髋活动度不足，用腰椎代偿深度',
        fix: '只蹲到能保持腰弓的最低点，再逐周加深',
      },
    ],
  },
  {
    id: 'leg-press',
    name: '腿举',
    group: 'legs',
    preChecks: [
      '脚：踩满踏板，与髋同宽，脚尖略外八',
      '腰：下背贴紧靠垫，别拱起留缝',
      '膝：起始微屈，不要完全锁死',
    ],
    cue: '脚掌推远，别锁膝',
    targetFeeling: '大腿前侧和臀部发力；膝盖跟着脚尖方向走',
    safetyNotes: [
      '下背离开靠垫或腰部拱起时，减重量或减幅度',
      '膝盖出现锐痛时停止，检查角度与脚位',
    ],
    symptoms: [
      { id: 'knee-front', label: '膝前痛', fix: '脚位抬高一点，膝盖对准脚尖' },
      { id: 'lower-back', label: '下背酸 / 离垫', fix: '减幅度，下背贴住靠垫' },
      { id: 'no-glute', label: '只有大腿前侧胀', fix: '脚踩高一点，用整只脚推' },
      { id: 'knee-in', label: '膝盖内扣', fix: '脚尖外八一点，膝盖推开' },
    ],
    commonMistakes: [
      {
        name: '下背离垫',
        symptom: '下放到很深时腰部拱起、离垫',
        cause: '幅度太大、核心没收住',
        fix: '别追求最低，下背全程贴垫，减幅度',
      },
      {
        name: '膝盖锁死',
        symptom: '顶点把腿蹬到完全伸直',
        cause: '追求“推满”导致膝关节过伸',
        fix: '顶点留一点微屈，保持张力',
      },
      {
        name: '只用前脚掌',
        symptom: '下放时膝盖往前跑、脚跟抬',
        cause: '脚位太靠下',
        fix: '脚踩高一点，重心放中脚掌',
      },
    ],
  },
  {
    id: 'conventional-deadlift',
    name: '传统硬拉',
    group: 'legs',
    preChecks: [
      '杠：在脚掌中间，贴着小腿（约 2 cm）',
      '位：肩在杠的正上方，手臂垂直，腋窝夹紧',
      '紧：吸满气顶住肚子，起杠前先把杠“拉紧”',
    ],
    cue: '杠贴腿，用腿蹬地',
    targetFeeling: '大腿后侧和臀部参与发力；杠贴近身体向上移动',
    safetyNotes: [
      '腰部出现锐痛、麻木或向腿部放射时，立即停止',
      '背部无法保持稳定时，先减重或结束本组',
    ],
    symptoms: [
      { id: 'lower-back', label: '腰酸 / 下背发紧', fix: '起杠前先拉紧杠，胸口顶住' },
      { id: 'no-hamstring', label: '大腿后侧和屁股没感觉', fix: '先送髋，再用腿压地起身' },
      { id: 'knees-first', label: '膝盖先伸直，像直腿拉', fix: '起杠时膝盖和肩一起走' },
      { id: 'grip', label: '手握不住 / 杠往下滑', fix: '杠贴腿，握紧后再起' },
    ],
    commonMistakes: [
      {
        name: '用腰提',
        symptom: '起杠瞬间腰先受力，腿几乎没参与',
        cause: '起杠前没把杠拉紧，臀位过高或过低',
        fix: '起杠前 2 秒把杠拉紧、腿绷住，再推地',
      },
      {
        name: '杠离身体',
        symptom: '杠离开小腿，越拉越远，腰压力变大',
        cause: '背阔没夹紧，杠没贴腿',
        fix: '腋窝夹紧，让杠沿着小腿和大腿“刮”上去',
      },
      {
        name: '锁定时过度后仰',
        symptom: '站直后腰往后折，肋骨挺出去',
        cause: '用腰椎后伸代替髋伸直',
        fix: '站直就停，屁股夹紧，肋骨收住',
      },
    ],
  },
  {
    id: 'leg-extension',
    name: '坐姿腿屈伸',
    group: 'legs',
    preChecks: [
      '膝：膝关节对准转轴，垫子压在脚踝上方',
      '背：屁股贴紧靠垫，腰不离开',
      '重：从轻开始，感受股四头',
    ],
    cue: '抬起，顶端停一下',
    targetFeeling: '大腿前侧（股四头）主动收缩；膝盖不痛',
    safetyNotes: [
      '膝前出现锐痛时，减重量或减小活动范围',
      '顶端不要猛甩，避免膝关节过伸',
    ],
    symptoms: [
      { id: 'knee-front', label: '膝前痛', fix: '减重量、减幅度，转轴对准膝盖' },
      { id: 'no-quad', label: '大腿前侧没感觉', fix: '顶端停 1 秒，主动收紧' },
      { id: 'swing', label: '靠甩起来', fix: '用 2 秒下放，控制离心' },
    ],
    commonMistakes: [
      {
        name: '甩腿',
        symptom: '靠惯性把腿踢起来',
        cause: '重量太大',
        fix: '降重量，顶端停一下再放',
      },
      {
        name: '臀部离垫',
        symptom: '身体前倾、屁股离开座位借力',
        cause: '核心没固定、重量偏大',
        fix: '屁股贴紧，握住把手，减重量',
      },
      {
        name: '转轴不对',
        symptom: '膝前不适，发力发空',
        cause: '座位前后没调好，垫子不在脚踝上方',
        fix: '调到膝关节对准转轴，垫子压脚踝上方',
      },
    ],
  },
  {
    id: 'leg-curl',
    name: '腿弯举',
    group: 'legs',
    preChecks: [
      '垫：压在脚踝上方，别压脚跟',
      '位：膝关节对准转轴',
      '身：骨盆贴住，不拱腰',
    ],
    cue: '脚跟收回，慢慢放',
    targetFeeling: '大腿后侧（腘绳肌）收紧；下放时也在控制',
    safetyNotes: [
      '抽筋或膝后锐痛时停止',
      '重量别过大，避免用腰借力',
    ],
    symptoms: [
      { id: 'hamstring-cramp', label: '大腿后侧抽筋', fix: '减重量，动作放慢，先热身' },
      { id: 'no-ham', label: '大腿后侧没感觉', fix: '脚踝发力，顶端收紧 1 秒' },
      { id: 'lower-back', label: '腰拱起借力', fix: '骨盆贴垫，降重量' },
    ],
    commonMistakes: [
      {
        name: '抬臀借力',
        symptom: '发力时屁股抬起、腰拱起',
        cause: '重量太大，用腰代偿',
        fix: '骨盆贴住，减重量',
      },
      {
        name: '下放太快',
        symptom: '只用力收回，放下时松掉',
        cause: '忽略离心控制',
        fix: '用 3 秒控制下放，保持张力',
      },
      {
        name: '幅度太大',
        symptom: '膝后不适、抽筋',
        cause: '屈膝过度，顶端挤压膝后',
        fix: '减小范围，顶端不过度屈膝',
      },
    ],
  },
  {
    id: 'leg-raise',
    name: '抬腿',
    group: 'legs',
    preChecks: [
      '背：下背贴地 / 靠垫，别拱腰',
      '核心：先收紧腹部再抬腿',
      '呼：抬腿呼气，放下吸气',
    ],
    cue: '先收腹，再抬腿',
    targetFeeling: '下腹发力把骨盆卷起来；腰不酸',
    safetyNotes: [
      '腰部拱起或下背痛时，减小幅度或屈膝做',
      '不要用甩腿的惯性',
    ],
    symptoms: [
      { id: 'lower-back', label: '腰酸、下背离地', fix: '先收腹，屈膝减小幅度' },
      { id: 'hip-flexor', label: '只有大腿根酸', fix: '用腹卷骨盆，不是抬大腿' },
      { id: 'no-abs', label: '腹部没感觉', fix: '放慢，顶端把骨盆卷起来' },
    ],
    commonMistakes: [
      {
        name: '拱腰抬腿',
        symptom: '下背离地、腰酸',
        cause: '核心没先收紧',
        fix: '先收腹再抬，下背全程贴住',
      },
      {
        name: '甩腿',
        symptom: '靠惯性上下摆',
        cause: '速度太快、控制不足',
        fix: '放慢速度，控制放下',
      },
      {
        name: '幅度过大',
        symptom: '大腿根（髋屈肌）代偿',
        cause: '只抬大腿不卷骨盆',
        fix: '屈膝做，专注把骨盆卷起来',
      },
    ],
  },
  {
    id: 'standing-calf-raise',
    name: '站姿自重提踵',
    group: 'legs',
    preChecks: [
      '脚：前脚掌踩实台阶 / 地面，脚跟悬空',
      '身：身体直立，核心收紧',
      '膝：伸直但不锁死',
    ],
    cue: '踮到最高，停一下',
    targetFeeling: '小腿后侧收紧；下落时被拉长',
    safetyNotes: [
      '跟腱不适时减小幅度',
      '扶稳，避免崴脚',
    ],
    symptoms: [
      { id: 'achilles', label: '跟腱紧 / 痛', fix: '减小幅度，先热身小腿' },
      { id: 'no-calf', label: '小腿没感觉', fix: '顶端停 1–2 秒，全幅度' },
      { id: 'ankle', label: '踝不稳', fix: '扶墙，放慢速度' },
    ],
    commonMistakes: [
      {
        name: '弹震',
        symptom: '靠弹跳上下',
        cause: '速度太快，没控制',
        fix: '顶端停一下，控制下放',
      },
      {
        name: '幅度太小',
        symptom: '只踮一点点',
        cause: '怕不稳、幅度不够',
        fix: '全幅度：脚跟尽量下沉，再踮到最高',
      },
      {
        name: '屈膝借力',
        symptom: '膝盖弯曲，用大腿发力',
        cause: '膝没伸直',
        fix: '腿伸直，只动踝关节',
      },
    ],
  },

  // ================= 胸肩三头 =================
  {
    id: 'barbell-bench',
    name: '杠铃卧推',
    group: 'chest',
    preChecks: [
      '肩：肩胛骨往后往下夹住，胸口挺起',
      '脚：脚掌踩实地面，屁股不离凳',
      '握：握距让小臂垂直地面，手腕立直不后折',
    ],
    cue: '肩胛夹紧，脚蹬地推',
    targetFeeling: '胸部主动推起杠铃；肩前侧不应出现尖锐疼痛',
    safetyNotes: [
      '肩前侧或手腕出现锐痛时，停止本组并检查姿势',
      '疼痛持续或影响活动范围时，不要继续加重训练',
    ],
    symptoms: [
      { id: 'shoulder-front', label: '肩前侧紧 / 痛', fix: '肩胛夹紧，手肘收向身体' },
      { id: 'wrist', label: '手腕不适', fix: '手腕立直，杠压掌根' },
      { id: 'no-chest', label: '胸没感觉，三头 / 肩前束先酸', fix: '下放到触胸，用胸顶起' },
      { id: 'bar-high', label: '杠落点太靠上，压到脖子 / 锁骨', fix: '落点改到乳头上方' },
    ],
    commonMistakes: [
      {
        name: '肩胛松掉',
        symptom: '推起时肩前侧顶住，肩膀往前跑',
        cause: '肩胛没后收下压，杠落点太靠上',
        fix: '每次落杠前重新夹肩胛，杠落到乳头上方',
      },
      {
        name: '手腕后折',
        symptom: '杠压在手掌靠后的位置，手腕疼',
        cause: '握杠太靠手指，杠没压在掌根',
        fix: '杠压在掌根，手腕与前臂成一条线',
      },
      {
        name: '顶臀 / 屁股离凳',
        symptom: '推起时屁股抬起，腰拱得很紧',
        cause: '脚蹬地变成顶髋，核心没撑住',
        fix: '脚只负责“传力”，屁股保持贴凳',
      },
    ],
  },
  {
    id: 'incline-bench',
    name: '上斜杠铃卧推',
    group: 'chest',
    preChecks: [
      '角度：靠背 30–45°，太高就变成推肩',
      '肩：肩胛后收下沉，胸口挺起',
      '握：小臂垂直，手腕立直',
    ],
    cue: '锁骨下方落杠',
    targetFeeling: '上胸主动发力；肩前侧不应刺痛',
    safetyNotes: [
      '肩前侧锐痛时停止，检查握距与落点',
      '上大重量前确认有保护或安全杆',
    ],
    symptoms: [
      { id: 'shoulder-front', label: '肩前侧痛', fix: '夹紧肩胛，手肘收一点' },
      { id: 'no-upper-chest', label: '上胸没感觉', fix: '肩往内收，落点上胸' },
      { id: 'wrist', label: '手腕不适', fix: '手腕立直，杠压掌根' },
    ],
    commonMistakes: [
      {
        name: '角度太高',
        symptom: '变成推肩，上胸没感觉',
        cause: '靠背接近垂直',
        fix: '调到 30–45°',
      },
      {
        name: '落点太靠上',
        symptom: '压到喉 / 肩，肩前不适',
        cause: '杠落点过高',
        fix: '落到锁骨下方、上胸位置',
      },
      {
        name: '肩胛松',
        symptom: '肩膀往前跑',
        cause: '没后收下沉',
        fix: '每次落杠前重新夹肩胛',
      },
    ],
  },
  {
    id: 'hammer-shoulder-press',
    name: '悍马机坐姿推举',
    group: 'chest',
    preChecks: [
      '座：把手与肩同高或略低',
      '背：下背贴靠垫，核心收住',
      '腕：手腕立直，别后折',
    ],
    cue: '向上推，别耸肩',
    targetFeeling: '三角肌前中束发力；肩不痛',
    safetyNotes: [
      '肩顶或肩前锐痛时减重量',
      '不要憋气硬顶',
    ],
    symptoms: [
      { id: 'shoulder-top', label: '肩顶痛 / 夹痛', fix: '减重量，别顶到完全锁死' },
      { id: 'shrug', label: '耸肩借力', fix: '先沉肩，再推' },
      { id: 'wrist', label: '手腕不适', fix: '手腕立直，掌根发力' },
    ],
    commonMistakes: [
      {
        name: '耸肩',
        symptom: '斜方先累，肩顶夹',
        cause: '推起时肩往上耸',
        fix: '先沉肩，再向上推',
      },
      {
        name: '行程太短',
        symptom: '只推一半',
        cause: '怕酸、重量偏大',
        fix: '全幅度，下放到把手与肩齐',
      },
      {
        name: '腰拱',
        symptom: '推起时下背离垫',
        cause: '核心没撑住',
        fix: '下背贴垫，收腹',
      },
    ],
  },
  {
    id: 'machine-lateral-raise',
    name: '器械侧平举',
    group: 'chest',
    preChecks: [
      '座：调到肩关节对准转轴',
      '臂：肘微屈，贴在侧垫',
      '身：背贴靠垫，不前后晃',
    ],
    cue: '用肘带动，抬到肩高',
    targetFeeling: '三角肌中束发力；肩不耸',
    safetyNotes: [
      '肩夹痛时减小幅度',
      '不要用惯性甩',
    ],
    symptoms: [
      { id: 'shrug', label: '耸肩', fix: '减重量，先沉肩' },
      { id: 'shoulder-pain', label: '肩夹痛', fix: '抬到肩高即止，别过高' },
      { id: 'trap', label: '斜方先累', fix: '肘引领，专注侧方抬起' },
    ],
    commonMistakes: [
      {
        name: '甩起来',
        symptom: '靠惯性把垫子甩上去',
        cause: '重量太大',
        fix: '放慢，顶端停一下',
      },
      {
        name: '抬太高',
        symptom: '超过肩高后耸肩',
        cause: '追求幅度',
        fix: '抬到肩高就停',
      },
      {
        name: '身体晃',
        symptom: '躯干前后摆动借力',
        cause: '核心松',
        fix: '背贴垫，核心收住',
      },
    ],
  },
  {
    id: 'reverse-pec-deck',
    name: '蝴蝶机反向飞鸟',
    group: 'chest',
    preChecks: [
      '座：把手与肩同高',
      '胸：胸口贴靠垫，别耸',
      '肘：微屈，向外打开',
    ],
    cue: '向后打开，夹后束',
    targetFeeling: '三角肌后束发力；脖子不紧',
    safetyNotes: [
      '肩后不适时减重量',
      '肘不要过度伸直',
    ],
    symptoms: [
      { id: 'neck', label: '脖子紧', fix: '沉肩，别耸肩' },
      { id: 'no-rear-delt', label: '后束没感觉', fix: '肘引领，向后夹' },
      { id: 'shoulder-front', label: '肩前顶', fix: '胸口贴垫，别顶肩' },
    ],
    commonMistakes: [
      {
        name: '耸肩',
        symptom: '斜方代偿，脖子紧',
        cause: '肩没沉住',
        fix: '沉肩再做',
      },
      {
        name: '用背发力',
        symptom: '夹背太多，后束没感觉',
        cause: '肘没引领，幅度过大',
        fix: '专注肩后束，用肘带动',
      },
      {
        name: '幅度过大',
        symptom: '肩前顶、夹痛',
        cause: '向后打开过头',
        fix: '打到与身体平齐即可',
      },
    ],
  },
  {
    id: 'hammer-triceps-pushdown',
    name: '悍马机三头下压',
    group: 'chest',
    preChecks: [
      '肘：贴近身体两侧，固定不动',
      '位：身体站直，微前倾',
      '腕：手腕中立',
    ],
    cue: '只动小臂，压到底',
    targetFeeling: '肱三头肌收紧；肘不甩',
    safetyNotes: [
      '肘部锐痛时减重量',
      '不要用身体重量硬压',
    ],
    symptoms: [
      { id: 'elbow', label: '肘痛', fix: '减重量，肘固定贴近身体' },
      { id: 'no-triceps', label: '三头没感觉', fix: '底端伸直收紧 1 秒' },
      { id: 'shoulder', label: '肩前代偿', fix: '肘夹紧，只动小臂' },
    ],
    commonMistakes: [
      {
        name: '肘外展',
        symptom: '肘向两侧张开',
        cause: '没固定大臂',
        fix: '肘贴身体固定',
      },
      {
        name: '身体压',
        symptom: '借体重往下压',
        cause: '重量偏大',
        fix: '站直，只用手臂发力',
      },
      {
        name: '行程短',
        symptom: '没压到底',
        cause: '怕酸、幅度不足',
        fix: '全幅度伸直',
      },
    ],
  },
  {
    id: 'machine-flat-bench',
    name: '躺卧器械平板卧推',
    group: 'chest',
    preChecks: [
      '把手：与胸中缝同高',
      '肩：肩胛后收下沉贴垫',
      '脚：踩实地面',
    ],
    cue: '胸挺起，推到接近伸直',
    targetFeeling: '胸部发力；肩前不痛',
    safetyNotes: [
      '肩前锐痛时停止',
      '推到底别把关节锁死',
    ],
    symptoms: [
      { id: 'shoulder-front', label: '肩前痛', fix: '肩胛夹紧，别顶肩' },
      { id: 'no-chest', label: '胸没感觉', fix: '落点放到胸中缝，用胸推' },
      { id: 'elbow', label: '肘痛', fix: '调整把手高度，手腕中立' },
    ],
    commonMistakes: [
      {
        name: '肩前顶',
        symptom: '推起时肩往前跑',
        cause: '肩胛没夹住',
        fix: '夹肩胛贴垫',
      },
      {
        name: '行程短',
        symptom: '只推一半',
        cause: '怕酸、幅度不足',
        fix: '全幅度，下放到胸中缝',
      },
      {
        name: '锁死',
        symptom: '顶点过度伸直',
        cause: '追求推满',
        fix: '顶点留一点微屈',
      },
    ],
  },
  {
    id: 'triceps-extension',
    name: '伸缩臂屈伸',
    group: 'chest',
    preChecks: [
      '肘：对准转轴 / 固定，不要张太开',
      '身：背贴靠垫，核心收住',
      '腕：中立，别后折',
    ],
    cue: '只动小臂，伸直收紧',
    targetFeeling: '肱三头肌被拉长后再收紧',
    safetyNotes: [
      '肘部锐痛时减重量',
      '不要甩动',
    ],
    symptoms: [
      { id: 'elbow', label: '肘痛', fix: '减重量，固定肘位置' },
      { id: 'no-triceps', label: '三头没感觉', fix: '顶端收紧，慢放' },
      { id: 'shoulder', label: '肩代偿', fix: '固定大臂，只动小臂' },
    ],
    commonMistakes: [
      {
        name: '大臂晃',
        symptom: '大臂上下移动借力',
        cause: '没固定',
        fix: '固定大臂，只动小臂',
      },
      {
        name: '幅度不够',
        symptom: '没伸直或没下放到位',
        cause: '怕酸、行程短',
        fix: '全幅度完成',
      },
      {
        name: '甩',
        symptom: '靠惯性甩',
        cause: '重量偏大',
        fix: '控制离心，放慢',
      },
    ],
  },

  // ================= 背二头后束 =================
  {
    id: 'pull-up',
    name: '引体向上',
    group: 'back',
    preChecks: [
      '握：正握，略宽于肩',
      '肩：先下沉后收，再拉',
      '核：收腹，身体别乱摆',
    ],
    cue: '肩下沉，胸口找杠',
    targetFeeling: '背阔肌发力；手臂只是勾住',
    safetyNotes: [
      '肩前或肘部锐痛时停止',
      '拉不上去用助力带 / 助力器械，别硬甩',
    ],
    symptoms: [
      { id: 'no-back', label: '只有手臂酸', fix: '先沉肩，想“用肘下拉”' },
      { id: 'shoulder-front', label: '肩前痛', fix: '别耸肩，控制下放' },
      { id: 'swing', label: '靠摆荡', fix: '核心收紧，动作放慢' },
    ],
    commonMistakes: [
      {
        name: '耸肩上拉',
        symptom: '脖子紧，背没感觉',
        cause: '肩没先下沉',
        fix: '先沉肩再拉',
      },
      {
        name: '半程',
        symptom: '幅度太小',
        cause: '力量不足或怕掉',
        fix: '下放到手臂接近伸直',
      },
      {
        name: '甩腿借力',
        symptom: '身体前后摆',
        cause: '核心松',
        fix: '收腹，控制身体',
      },
    ],
  },
  {
    id: 'lat-pulldown-wide',
    name: '宽距高位下拉',
    group: 'back',
    preChecks: [
      '握：宽握，略宽于肩',
      '身：胸挺起，微后仰',
      '肩：先下沉再拉',
    ],
    cue: '肘往下拉，胸口挺起',
    targetFeeling: '背阔肌两侧收紧；手臂只是传力',
    safetyNotes: [
      '肩前痛时减小宽度或检查沉肩',
      '别把杠拉到颈后',
    ],
    symptoms: [
      { id: 'no-back', label: '只有二头酸', fix: '先沉肩，用肘下拉' },
      { id: 'shoulder-front', label: '肩前痛', fix: '减宽，别拉到颈后' },
      { id: 'lean-back', label: '后仰太多', fix: '微后仰，核心收住' },
    ],
    commonMistakes: [
      {
        name: '后仰借力',
        symptom: '用体重往下压',
        cause: '重量偏大',
        fix: '减轻重量，只微后仰',
      },
      {
        name: '拉到颈后',
        symptom: '肩前不适',
        cause: '追求幅度',
        fix: '拉到上胸即可',
      },
      {
        name: '耸肩',
        symptom: '斜方先累',
        cause: '没沉肩',
        fix: '先沉肩再拉',
      },
    ],
  },
  {
    id: 'seated-row',
    name: '坐姿划船',
    group: 'back',
    preChecks: [
      '背：脊柱中立，别驼背',
      '肩：先下沉后收',
      '膝：微屈，不锁死',
    ],
    cue: '肘贴身后拉，夹背',
    targetFeeling: '中背与背阔发力；腰不代偿',
    safetyNotes: [
      '腰酸或下背痛时减重量、减后仰',
      '别用身体大幅前后晃',
    ],
    symptoms: [
      { id: 'lower-back', label: '腰酸', fix: '减小后仰，核心收住' },
      { id: 'no-back', label: '只有手臂', fix: '用肘后拉，夹背' },
      { id: 'shrug', label: '耸肩', fix: '先沉肩再拉' },
    ],
    commonMistakes: [
      {
        name: '前后晃',
        symptom: '用惯性来回荡',
        cause: '重量偏大',
        fix: '身体稳住，只动手臂',
      },
      {
        name: '驼背拉',
        symptom: '背没中立，腰吃力',
        cause: '核心松',
        fix: '挺胸，脊柱中立',
      },
      {
        name: '肘外展',
        symptom: '夹不住背',
        cause: '肘朝两侧',
        fix: '肘贴近身体后拉',
      },
    ],
  },
  {
    id: 'hammer-row',
    name: '悍马机划船',
    group: 'back',
    preChecks: [
      '胸：贴靠垫，胸口顶住',
      '肩：下沉后收，别耸',
      '握：握紧，手腕中立',
    ],
    cue: '肘往后拉，夹住背',
    targetFeeling: '单侧背阔 / 中背收紧；身体不转',
    safetyNotes: [
      '肩前痛时减重量',
      '别用身体扭转借力',
    ],
    symptoms: [
      { id: 'no-back', label: '手臂先累', fix: '用肘引领，夹背' },
      { id: 'twist', label: '身体扭转', fix: '核心稳住，不转体' },
      { id: 'shoulder-front', label: '肩前顶', fix: '沉肩，别顶胸垫' },
    ],
    commonMistakes: [
      {
        name: '转体借力',
        symptom: '用腰转着拉',
        cause: '重量偏大',
        fix: '固定躯干',
      },
      {
        name: '耸肩',
        symptom: '斜方代偿',
        cause: '没沉肩',
        fix: '沉肩后拉',
      },
      {
        name: '幅度短',
        symptom: '没夹到背',
        cause: '怕酸',
        fix: '拉到肘超过身后',
      },
    ],
  },
  {
    id: 'face-pull',
    name: '面拉',
    group: 'back',
    preChecks: [
      '位：绳索与眼 / 额头同高',
      '握：对握，肘抬高',
      '身：站直，核心收住',
    ],
    cue: '拉向脸，肘打开',
    targetFeeling: '后束与上背发力；脖子放松',
    safetyNotes: [
      '肩前痛时减重量',
      '重量别大，动作要稳',
    ],
    symptoms: [
      { id: 'neck', label: '脖子紧', fix: '沉肩，别耸' },
      { id: 'no-rear-delt', label: '后束没感觉', fix: '肘抬高，拉向额头' },
      { id: 'shoulder-front', label: '肩前顶', fix: '减重量，控制' },
    ],
    commonMistakes: [
      {
        name: '拉向胸',
        symptom: '变成划船',
        cause: '绳索太低或拉的方向偏低',
        fix: '拉向脸 / 额头',
      },
      {
        name: '耸肩',
        symptom: '斜方代偿',
        cause: '没沉肩',
        fix: '沉肩，肘打开',
      },
      {
        name: '重量太大',
        symptom: '靠甩',
        cause: '追求重量',
        fix: '减重量，控制',
      },
    ],
  },
  {
    id: 'machine-curl',
    name: '器械弯举',
    group: 'back',
    preChecks: [
      '肘：对准转轴 / 贴垫',
      '臂：大臂固定，别抬',
      '腕：中立不后折',
    ],
    cue: '只动小臂，顶端收紧',
    targetFeeling: '肱二头肌收紧；肩不抬',
    safetyNotes: [
      '肘 / 腕不适时减重量',
      '下放别完全松掉',
    ],
    symptoms: [
      { id: 'elbow', label: '肘前不适', fix: '减重量，固定大臂' },
      { id: 'no-bicep', label: '二头没感觉', fix: '顶端停一下收紧' },
      { id: 'shoulder', label: '大臂上抬', fix: '大臂贴垫固定' },
    ],
    commonMistakes: [
      {
        name: '抬大臂借力',
        symptom: '大臂跟着起来',
        cause: '重量偏大',
        fix: '固定大臂，只动小臂',
      },
      {
        name: '甩',
        symptom: '靠惯性',
        cause: '速度太快',
        fix: '放慢，控制离心',
      },
      {
        name: '行程短',
        symptom: '没下放到底',
        cause: '怕酸',
        fix: '全幅度完成',
      },
    ],
  },
  {
    id: 'hammer-curl',
    name: '哑铃锤式弯举',
    group: 'back',
    preChecks: [
      '握：对握（拇指朝上）',
      '肘：贴近身体固定',
      '身：站直，别后仰',
    ],
    cue: '锤着弯起，慢慢放',
    targetFeeling: '肱肌 / 肱桡肌与前臂发力',
    safetyNotes: [
      '肘 / 腕痛时减重量',
      '别靠甩',
    ],
    symptoms: [
      { id: 'elbow', label: '肘不适', fix: '减重量，固定大臂' },
      { id: 'swing', label: '靠甩', fix: '放慢，控制离心' },
      { id: 'no-forearm', label: '前臂没感觉', fix: '对握，顶端收紧' },
    ],
    commonMistakes: [
      {
        name: '身体晃',
        symptom: '用腰晃着弯',
        cause: '重量偏大',
        fix: '站稳，核心收住',
      },
      {
        name: '大臂前抬',
        symptom: '肩代偿',
        cause: '没固定肘',
        fix: '肘固定贴近身体',
      },
      {
        name: '下放太快',
        symptom: '松掉张力',
        cause: '忽略离心',
        fix: '控制下放',
      },
    ],
  },
  {
    id: 'lever-seated-row',
    name: '杠杆式坐姿划船',
    group: 'back',
    preChecks: [
      '胸：贴靠垫',
      '肩：下沉后收',
      '握：握紧，肘贴身',
    ],
    cue: '肘后拉，夹背',
    targetFeeling: '中背 / 背阔收紧',
    safetyNotes: [
      '腰 / 肩不适时减重量',
      '别后仰借力',
    ],
    symptoms: [
      { id: 'no-back', label: '手臂先累', fix: '用肘引领' },
      { id: 'lean', label: '后仰借力', fix: '稳住躯干' },
      { id: 'shrug', label: '耸肩', fix: '沉肩' },
    ],
    commonMistakes: [
      {
        name: '后仰',
        symptom: '用体重往后压',
        cause: '重量偏大',
        fix: '减轻重量',
      },
      {
        name: '耸肩',
        symptom: '斜方代偿',
        cause: '没沉肩',
        fix: '沉肩后拉',
      },
      {
        name: '肘外展',
        symptom: '夹不住背',
        cause: '肘朝两侧',
        fix: '肘贴身',
      },
    ],
  },
  {
    id: 'ez-bar-curl',
    name: 'EZ杆二头弯举',
    group: 'back',
    preChecks: [
      '握：EZ 杆斜握，手腕舒适',
      '肘：贴近身体固定',
      '身：站直，核心收住',
    ],
    cue: '弯到顶，慢慢放',
    targetFeeling: '肱二头肌收紧；手腕不痛',
    safetyNotes: [
      '腕 / 肘痛时减重量或换器械',
      '别用腰晃',
    ],
    symptoms: [
      { id: 'wrist', label: '手腕不适', fix: '用 EZ 杆斜握，手腕中立' },
      { id: 'swing', label: '靠甩', fix: '减重量，控制' },
      { id: 'no-bicep', label: '二头没感觉', fix: '顶端收紧，慢放' },
    ],
    commonMistakes: [
      {
        name: '晃腰',
        symptom: '用腰借力',
        cause: '重量偏大',
        fix: '站稳，收紧核心',
      },
      {
        name: '大臂前移',
        symptom: '肩代偿',
        cause: '没固定肘',
        fix: '肘固定',
      },
      {
        name: '半程',
        symptom: '幅度小',
        cause: '怕酸',
        fix: '全幅度完成',
      },
    ],
  },
  {
    id: 'unilateral-high-row',
    name: '分动式高位划船',
    group: 'back',
    preChecks: [
      '胸：贴靠垫，胸口顶住',
      '肩：下沉，别耸',
      '握：单侧拉，身体不转',
    ],
    cue: '肘往下后拉，夹背',
    targetFeeling: '单侧背阔发力；躯干稳定',
    safetyNotes: [
      '肩前痛时减重量',
      '别扭转躯干',
    ],
    symptoms: [
      { id: 'no-back', label: '手臂先累', fix: '用肘引领，夹背' },
      { id: 'twist', label: '身体转', fix: '核心稳住' },
      { id: 'shoulder-front', label: '肩前顶', fix: '沉肩，别顶垫' },
    ],
    commonMistakes: [
      {
        name: '转体',
        symptom: '靠转体借力',
        cause: '重量偏大',
        fix: '固定躯干',
      },
      {
        name: '耸肩',
        symptom: '斜方代偿',
        cause: '没沉肩',
        fix: '沉肩后拉',
      },
      {
        name: '幅度短',
        symptom: '没夹到背',
        cause: '怕酸',
        fix: '拉到肘超过身后',
      },
    ],
  },
]
