import type { Exercise, ExerciseGroup } from '../types'

export const GROUP_LABELS: Record<ExerciseGroup, string> = {
  squat: '蹲',
  hinge: '髋铰链',
  push: '推',
}

export const EXERCISES: Exercise[] = [
  {
    id: 'barbell-squat',
    name: '杠铃深蹲',
    group: 'squat',
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
    id: 'conventional-deadlift',
    name: '硬拉',
    group: 'hinge',
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
    id: 'barbell-bench',
    name: '杠铃卧推',
    group: 'push',
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
]
