# P0 跟练追踪 · 详细需求（可直接实现）

> 版本：v5.23 候选 · 编写日期 2026-11-18 · 状态：待确认，未实现
> 目标：让「研究别人设计的计划并跟练一段时间」有落点——记录练到第几次、完成打卡、写心得并挂回计划。
> 全程本地存储，单手机，无后端。所有行号基于当前 main（v5.22 / 47d4bec）。

---

## 0. 红线（不可违反）

1. 不出现任何重量 / 次数 / RPE 输入控件，不做组间计时。重量组次仍在「训记」记。
2. 本功能只记「**进度**」：哪天、第几次、完成没完成、一句心得的关联。不记任何训练数据。
3. 数据进 localStorage（前缀 `gt.v1.`），随 JSON 备份/导入；视频仍不进备份。
4. 不改动 `coachPlans.ts` / `coachGuide.ts` 的静态内容。

---

## 1. 数据模型

### 1.1 新增类型（`src/types.ts` 末尾追加）

```ts
export interface TrainingSession {
  id: string          // s-<timestamp>-<rand>
  date: string        // 本地日期 YYYY-MM-DD，用 todayKey() 生成
  day: 'push' | 'pull'
  seq: number         // 该 day 的第几次，打卡时定，删除其他记录不改变它
  noteId?: string     // 关联的心得笔记 id（写心得后回填）
  createdAt: string   // ISO
}
```

> `day` 故意用字面量联合，不在 types.ts 反向 import `coachPlans` 的 `PlanDay`，避免模块耦合；两者结构兼容，赋值无障碍。

### 1.2 新增数据层 `src/lib/trainingLog.ts`

key：`gt.v1.trainingLog`（走 `storage.ts` 的 `readJSON/writeJSON`）。

```ts
const KEY = 'trainingLog'
// 读取时白名单重建，剔除坏数据（照 exerciseNotes.ts:21-30 的写法）
export function getSessions(): TrainingSession[]

export function getSessionsByDay(day: 'push' | 'pull'): TrainingSession[]

export function countByDay(day: 'push' | 'pull'): number

export function lastSessionOfDay(day): TrainingSession | undefined

// 幂等：同一天同一 day 已有记录则直接返回旧记录，不重复插入
export function completeSession(day: 'push' | 'pull'): TrainingSession

// 删除一条；有 noteId 的笔记保留，只删记录
export function removeSession(id: string): void

// 把心得笔记 id 回填到某次打卡
export function linkNote(sessionId: string, noteId: string): void
```

要点：
- `completeSession` 里 `seq = countByDay(day) + 1`，`date = todayKey()`（`src/lib/date.ts:1-5` 已有，本地日期，避开 UTC 跨天偏移）。
- 每次写操作都 `writeJSON(KEY, …)` 全量覆盖，与现有数据层一致。

### 1.3 备份（`src/lib/backup.ts`）

- `trainingLog` 前缀是 `gt.v1.`，不在 `LOCAL_ONLY_KEYS`（`:11`），自动进 JSON 备份、导入时自动恢复，**无需改主逻辑**。
- 一次性意图键 `noteSeed`（见 3.3）建议加进 `LOCAL_ONLY_KEYS`，防止备份出无意义数据。

---

## 2. 界面落点

### 2.1 计划详情页（`ExerciseTab.tsx:648-678`，route `plan`）

在 `</ol>`（`:674`）之后、页面结束前，插入「本次训练」区块：

```
本次训练
推日 · 第 3 次        上次：11/15
[ 完成本次训练 ]      [ 写心得 ]      <- 未打卡：写心得按钮禁用或点击先打卡
```

打卡后同一区块变为：

```
✓ 今天已完成推日第 3 次
[ 写心得 ]   [ 撤销打卡 ]
```

- 「第 N 次」= `countByDay(day) + 1`（打卡前）或该记录的 `seq`（打卡后）。
- 打卡按钮只在「今天该 day 未打卡」时可用；已打卡时显示完成态。
- 撤销 = `removeSession(id)`，二次确认；关联笔记不删，只解除。
- 推日用 `is-push` 荧光绿、拉日用 `is-pull` 信息蓝，沿用现有计划页配色（`:665`）。

### 2.2 系列页（`ExerciseTab.tsx:684-746`，route `coaches`）

在「训练逻辑」块（`:696-699`）之后插入「我的跟练」统计卡：

```
我的跟练
推日 3 次 · 拉日 2 次 · 共 5 次
最近：11/18 推日
[ 查看记录 ]
```

「查看记录」展开一个折叠列表，列出最近 20 条：`推日 第3次 · 11/18 · 有心得/无心得`，每条可删除（调 `removeSession`）。无记录时显示「还没有跟练记录，打开推日或拉日开始第一次。」

### 2.3 数据刷新

`ExerciseTab` 顶部加 `const [sessions, setSessions] = useState(() => getSessions())`；打卡/撤销/删除后 `setSessions(getSessions())` 刷新。注意 `ExerciseTab` 当前用 `hidden` 挂载（App.tsx:169-177），需像 `NotesTab:762-765` 那样在 `active` 变 true 时重读一次，避免外部改动后显示旧值。

---

## 3. 写心得：跨 tab 链路（本次最难点）

### 3.1 为什么必须改这里

现有 `saveDraft` 在新增笔记时**不接收返回值**（`NotesTab.tsx:838`），拿不到新笔记 id，无法回填。要打通闭环，这里必须配套改。

### 3.2 `Draft` 扩展（`NotesTab.tsx:31-38`）

加一个字段 `sessionId?: string`，仅用于回填，不进 `ExerciseNote`。

### 3.3 一次性意图键 `gt.v1.noteSeed`

```
{ sessionId: string; title: string; text: string }
```

流程：

1. 用户在计划页点「写心得」：
   - 若今天该 day 未打卡，先 `completeSession(day)`；
   - `writeJSON('noteSeed', { sessionId, title: `${dayLabel} · 第 ${seq} 次`, text: `${date}\n\n` })`；
   - 调上层回调切到笔记 tab（见 3.4）。
2. 切 tab 后，`NotesTab` 在 `active` 变 true 的 effect（`:762-765`）里读 `noteSeed`：
   - 有则 `setDraft({ id:null, title:seed.title, text:seed.text, pinned:false, createdAt:now, sessionId:seed.sessionId })`；
   - 立即 `removeKey('noteSeed')`，保证只消费一次。
3. 保存时改 `saveDraft`（`:829-848`）：

```ts
const created = addExerciseNote({ title, text, html, pinned })
if (next.sessionId && created) linkNote(next.sessionId, created.id)
```

- 取消/返回不保存：清空 draft 即可，`linkNote` 不会发生；打卡记录仍在，只是没有心得。
- 一篇笔记只关联一次打卡；不做多对多。

### 3.4 切 tab 通道（`App.tsx`）

`ExerciseTab` 无法直接 `setTab`。给它加 prop：

```ts
onOpenNotes: () => void     // App.tsx 传 () => setTab('notes')
```

- `Props`（`ExerciseTab.tsx:42-44`）加该字段；`App.tsx:170` 传值。
- 不引入 context、不引入路由库，与项目现状一致。

---

## 4. 交互状态与边界

| 场景 | 规则 |
|---|---|
| 同一天同一 day 重复打卡 | 幂等，不新增第二条；按钮显示已完成 |
| 推拉交替、中间休息日 | 不做连续天数 streak（计划本就有休息日，streak 语义错） |
| 撤销已关联心得的打卡 | 只删 session，笔记保留；下次写心得会生成新笔记 |
| 删除某条历史记录 | 其他记录的 seq 不变，序号稳定 |
| 跨天 | 用 `todayKey()` 本地日期，不用 ISO UTC，避免半夜跨天算错 |
| 导入旧备份（无 trainingLog 键） | `getSessions()` 回落空数组，不报错 |
| 存储写满 | 沿用 `storage.ts:20-23` 的提示，不静默丢数据 |

---

## 5. 实现步骤（编号任务，按文件）

1. `src/types.ts`：追加 `TrainingSession`。
2. `src/lib/trainingLog.ts`：新建，实现 1.2 的 6 个函数。
3. `src/lib/trainingLog.test.ts`：新建，覆盖 6.1 的断言。
4. `src/lib/backup.ts`：把 `noteSeed` 加进 `LOCAL_ONLY_KEYS`（`:11`）。
5. `src/App.tsx`：给 `ExerciseTab` 传 `onOpenNotes`。
6. `src/screens/ExerciseTab.tsx`：加 `sessions` state、`active` 重读、计划页打卡区块、系列页统计卡与记录列表。
7. `src/screens/NotesTab.tsx`：`Draft` 加 `sessionId`；`active` effect 消费 `noteSeed`；`saveDraft` 接收返回值并 `linkNote`。
8. `src/styles.css`：新增 `.training-*` 样式，复用 `plan-*` / `module-row` 视觉。
9. 验证：`npm run build` 零错误；`npx vitest run` 全绿；390×844 走查打卡→写心得→返回→统计更新。
10. 版本：`src/version.ts` 升到 v5.23；`REQUIREMENTS.md` 追加 P30。
11. 提交与发布：**等确认后**再做，本需求不自动 commit / push。

---

## 6. 验收标准

### 6.1 数据层（`trainingLog.test.ts`）
- [ ] 空态 `getSessions()` 返回 `[]`，坏数据被过滤
- [ ] `completeSession('push')` 两次（同一天）只产生 1 条，第二次返回旧对象
- [ ] `seq` 按 day 独立递增：推日第1、2次与拉日第1次互不串号
- [ ] `removeSession` 后其他记录 `seq` 不变
- [ ] `linkNote` 后 `noteId` 正确写入，重复 link 覆盖
- [ ] `countByDay` / `lastSessionOfDay` 结果正确

### 6.2 界面与链路
- [ ] 计划页显示「第 N 次 / 上次日期」，打卡后变完成态
- [ ] 打卡后统计卡立即更新
- [ ] 写心得跳到笔记并预填标题（含 day 与次数）
- [ ] 保存笔记后，回到计划页该次记录显示「有心得」
- [ ] 取消写心得不产生关联，打卡记录仍在
- [ ] 撤销打卡后笔记不丢
- [ ] 导出备份含 trainingLog；导入后记录恢复
- [ ] 深浅主题、390×844 无横向溢出

### 6.3 红线复查
- [ ] 全流程无重量 / 次数 / RPE 输入框，无计时器
- [ ] 无来源话术、无 http 外链
- [ ] 视频仍不进备份

---

## 7. 明确不在本次范围（后续 P1/P2，另行确认）

- 跟练历史页做独立 route、按周分组、连续天数统计
- 计划组次自定义 / 收藏多个计划 / 导入他人计划
- 从计划动作一键跳到自建动作档案（需先解决两套 ID 映射）
- 笔记类型标签（健身 / 感悟 / 跟练心得）与筛选
- 删除动作、动作档案扩字段、视频备份提示
- `execCommand` 富文本重构
