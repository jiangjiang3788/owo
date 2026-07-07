# v0.3 Memory Brain Release Plan

## 总目标

建立适合个人小手机 AI 陪伴 App 的长期记忆脑，不用固定分类，而是让 AI 从聊天中自动生成事件、事实、家族、graph、人物画像、AI 自我和世界观。

## 版本路线

| 版本 | 目标 | 是否替换旧系统 |
|---|---|---|
| `v0.3.0` | 架构骨架、App 入口、旧来源扫描、替换路线 | 否，影子模式 |
| `v0.3.1` | 事件摘要层和真实时间线：最近聊天 → 事件卡片 | 否，旧系统仍正式注入 |
| `v0.3.2` | 原子事实层：事件 → fact candidates，保留证据、置信度、来源和批次回滚 | 否 |
| `v0.3.3` | 记忆家族、相似度聚类、家族摘要 | 否，继续影子整理 |
| `v0.3.4` | graph 关系网和轻量关系卡片 | 否，继续影子整理 |
| `v0.3.5` | 用户画像、AI 自我、世界观、项目脑，保留版本历史和回滚 | 否，继续影子整理 |
| `v0.3.6` | 注入预览和影子注入对照 | 否，开始判断可替换性 |
| `v0.3.7` | 调度、成本档、后台整理、浮现/衰减 | 否，继续影子调度 |
| `v0.3.8` | 记忆小屋 UI、fixture gate、导出路线、稳定收口 | 否，产品化收口 |
| `v0.4.0+` | 正式接管审查 / 单一注入 owner | 通过 gate 后再决定 |

## 避免双系统策略

- 新记忆脑在 `v0.3.0`～`v0.3.8` 只扫描、整理、预览、影子调度和产品化收口。
- 旧回忆日记、记忆表格、向量记忆继续维持当前用户可用能力。
- `v0.3.6` 开始做 shadow injection：新系统生成注入包，但不影响正式请求。
- 只有当控制台连续证明新系统能稳定召回、不过度注入、不漏核心记忆，才切换正式 owner。

## 历史整理策略

1. 先扫描聊天原文、回忆日记、记忆表格和向量记忆。
2. v0.3.1 已支持对当前聊天最近 N 条消息手动生成事件。
3. 后续再按聊天对象、时间范围、消息数量做自动分批。
4. v0.3.2 已支持从事件拆原子事实候选，写入 facts 和 fact-extraction batch。
5. v0.3.3 已支持对事实做 embedding 准备；失败时 fallback 到关键词、标签和 factType。
6. v0.3.3 已支持相似事实进入记忆家族，并记录 `family-clustering` batch。
7. 家族整理会生成或更新摘要、关键词、成员预览，并支持批次回滚。
8. v0.3.4 已支持建立 graph link：人物、主题、目的、情绪、项目和家族关系边。
9. graph-linking batch 会保存 edgeIds、beforeEdges、beforeFactEdgeIds 和 beforeFamilyEdgeIds。
10. v0.3.5 已支持从 facts / families / graph 生成 4 个长期模型，并记录 `long-term-model` batch。
11. 长期模型拥有版本历史：旧 active 模型会 superseded，回滚会恢复 beforeModels。
12. v0.3.6 已支持生成 shadow injection package，写入 `memoryBrain.injectionPreviews` 和 `injection-preview` batch。
13. 注入预览会和旧 memoryJournals / vectorMemory / memoryTables 做只读对照，但不进入正式 prompt。
14. 每个批次写入控制台，支持回滚。
15. v0.3.7 已支持生成 shadow scheduleQueue，写入 `memoryBrain.scheduleQueue` / `memoryBrain.schedulerRuns`，并用 `memory-maintenance` batch 维护浮现和衰减权重。
16. v0.3.8 已支持记忆小屋、今日浮现、切换前 safety gate 和 memoryBrain 导出包；App 内只保存 manifest-only 导出记录。
