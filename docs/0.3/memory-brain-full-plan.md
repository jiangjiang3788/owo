# OWO Memory Brain v0.3.x 完整计划

## 总目标

这条主线不是“记忆表格增强版”，而是个人小手机长期陪伴 AI 的外置大脑。分类、家族名和关系网络不写死，由 AI 根据事件和事实自然生长；用户负责查看、撤回、纠正、回滚和决定什么时候接管旧系统。

## 生长流程

```text
聊天原文
  ↓
事件摘要
  ↓
原子事实
  ↓
向量 + 关键词索引
  ↓
记忆家族
  ↓
graph 关系网
  ↓
人物画像 / AI 自我 / 世界观 / 项目脑
  ↓
当前聊天召回
  ↓
注入包
  ↓
调度 / 成本 / 浮现衰减
  ↓
记忆小屋 / 导出 / safety gate
  ↓
控制台追踪和回滚
```

## 版本阶段

| 版本 | 目标 | 结果 | 替换旧系统 |
|---|---|---|---|
| `v0.3.0` | 架构骨架 | 有 memoryBrain namespace、store、App 壳、旧来源扫描 | 否 |
| `v0.3.1` | 事件时间线 | 记忆知道“发生过什么” | 否 |
| `v0.3.2` | 原子事实 | 复合事件能拆成可追溯事实 | 否 |
| `v0.3.3` | 记忆家族 | 相似事实自动成团，AI 命名和摘要 | 否 |
| `v0.3.4` | Graph 关系 | 事实连接家族、人物、主题、目的、情绪和项目；本版已落地轻量关系卡片 | 否 |
| `v0.3.5` | 长期模型 | 用户画像、AI 自我、世界观、项目脑；本版已落地版本历史和回滚 | 否 |
| `v0.3.6` | 注入预览 | shadow injection package、旧记忆只读对照、控制台可解释；本版已落地 | 否 |
| `v0.3.7` | 调度和成本 | 省钱/均衡/深度模式、整理队列、浮现/衰减；本版已落地 | 否 |
| `v0.3.8` | UI 和 gate 收口 | 记忆小屋、今日浮现、导出路线和切换前安全门；本版已落地 | 否 |
| `v0.4.0+` | 正式接管审查 | 连续 shadow injection 对照稳定后才考虑唯一注入 owner | 待 gate |

## 运行遍数

| 遍数 | 名称 | 做什么 | 模型策略 | 触发 |
|---:|---|---|---|---|
| 0 | 原文记录 | 保存发送、回复、附件、请求 | 不用模型 | 每次聊天 |
| 1 | 事件摘要 | 一段聊天变成事件 | 便宜聊天模型 | 手动 / 每 N 轮 / 高情绪 |
| 2 | 原子事实 | 事件拆事实 | 便宜结构化模型 | 事件生成后 |
| 3 | 向量化 | 给事实生成 embedding | embedding 模型 | 新 fact 后 |
| 4 | 家族匹配 | 相似度、关键词、已有家族匹配 | 本地算法为主 | embedding 后 |
| 5 | 家族摘要 | 家族超过阈值后总结 | 便宜模型 | 家族成员阈值 |
| 6 | graph link | 建立人、事、主题、目的、情绪关系 | 本地 + 便宜模型 | 批量整理 |
| 7 | 长期模型重建 | 用户画像、AI 自我、世界观、项目脑 | 强模型 | 每日/每周/手动 |
| 8 | 注入选择 | 当前聊天该想起什么 | 本地召回 + 可选便宜模型 | 每次发送前 |

## 不能做错

- 不把分类写死，family 名称由 AI 生成。
- 不把原文直接塞长期记忆，必须先事件，再事实，再家族。
- 不只用向量，必须结合关键词、时间线和 graph。
- 不每次聊天都跑强模型，使用分层整理。
- 不缺回滚，每次整理都必须 batch 化。
- 不做企业后台表格 UI，手机端要像记忆小屋 / 记忆宫殿。
- 不继续扩大 `memory_table.js`、`vector_memory.js`、`journal.js` 旧大文件。


## 当前落地状态（v0.3.8）

- 已有 `memoryBrain.events`：事件时间线。
- 已有 `memoryBrain.facts`：原子事实候选。
- 已有 `memoryBrain.families`：事实自动成团后的记忆家族。
- 已有 `memoryBrain.edges`：事实、家族、人物、主题、目的、情绪和项目之间的轻量 graph 关系边。
- 已有 `family-clustering` batch：记录输入、AI 命名输出、fallback、应用结果和回滚快照。
- 已有 `graph-linking` batch：记录 graph drafts、应用结果、edgeIds 以及 fact/family edge 索引回滚快照。
- 已有 `memoryBrain.models`：用户画像、AI 自我、世界观、项目脑。
- 已有 `long-term-model` batch：记录输入、模型输出、fallback、应用结果、版本历史和 beforeModels 回滚快照。
- 已有 `memoryBrain.injectionPreviews`：shadow injection package 和旧记忆只读对照。
- 已有 `injection-preview` batch：记录当前输入、选中模型/事实/家族/关系/事件、memoryBlock 和回滚信息。
- 已有 `memoryBrain.scheduleQueue`：省钱 / 均衡 / 深度模式下生成的影子整理队列。
- 已有 `memoryBrain.schedulerRuns`：调度计划和浮现/衰减维护运行记录。
- 已有 `memory-maintenance` batch：记录权重更新、今日浮现和 beforeItems 回滚快照。
- 仍不做正式注入，不替换旧记忆系统。
- 已有 `memoryBrain.exports`：manifest-only 导出记录。
- 已有 `memory-export-preview` batch：记录导出 manifest、policy 和回滚信息。
- 已有记忆小屋 UI：今日浮现、房间入口、切换前安全门和导出 / 备份路线。
- v0.3.8 仍不做正式注入，不替换旧记忆系统。

## v0.3.9 调整：AI Pipeline / API Layer / Console 2.0

`v0.3.9` 插在 Memory Palace 和历史大整理之间，原因是几万条历史回填不能建立在脏的 AI 请求链路上。

新增稳定层：

```text
v0.3.8 Memory Palace
  ↓
v0.3.9 AI Pipeline + API Layer
  ↓
v0.4 历史大整理
  ↓
v0.5 可信记忆
  ↓
v0.6 正式注入
  ↓
v0.7 长期陪伴人格
  ↓
v0.8 自我维护 / 梦境消化
```

本版明确不做外部脑 / 导出 / MCP 的新扩展。v0.3.8 里已有的 manifest-only 导出只保留作为安全备份路线，不继续扩展外部连接。

### v0.3.9 做到什么

- 旧 API 设置不废弃，但被 `aiConfigStore` 映射成 provider / task route。
- `modelRegistry` 负责 `conversation`、`memory-event`、`memory-fact`、`memory-family`、`memory-persona` 等任务的模型路由。
- `messageSanitizer` 保证 unknown / debug / reasoning / 连续重复消息不进入下一轮 provider context。
- `responseNormalizer` 只把 `message.content` 当用户可见回复，`reasoning_content` 只留下 redacted metadata。
- 一次 AI 返回多条 `[pp的消息：...]` 时，控制台记录一个 `ai-response-batch`，聊天界面仍显示多条气泡。
- `ai-pipeline-gate.js` 在进入 v0.4 前检查 AI 管线边界。
