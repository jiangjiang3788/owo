# v0.3.3 Memory Brain 记忆家族层

## Scope

本版在 `v0.3.2` 原子事实之上新增记忆家族层：把 active facts 通过 embedding / 关键词 / 标签 / factType 相似度自动聚成 family，并为 family 生成自然名称、摘要、关键词和成员预览。

仍然保持影子模式：不替换旧记忆系统，不写旧回忆日记、记忆表格、向量记忆，不生成 graph，不参与正式聊天 prompt 注入。

## 完整计划位置

`v0.3.x` 的生长流程不变：

```text
聊天原文
  → 事件摘要
  → 原子事实
  → 向量 + 关键词索引
  → 记忆家族
  → graph 关系网
  → 人物画像 / AI 自我 / 世界观 / 项目脑
  → 当前聊天召回
  → 注入包
  → 控制台追踪和回滚
```

`v0.3.3` 是核心 MVP 的收口点：到这一版，记忆已经有事件、事实和家族三层，不再只是孤立事实列表。

## 新增 owner

| 层 | owner | 职责 |
|---|---|---|
| core | `js/core/memoryBrain/familySemantics.js` | family draft、相似度、命名 prompt、命名 JSON 解析、family compact |
| platform | `js/platform/memoryBrain/memoryEmbeddingService.js` | 给 facts 补 embedding；失败时返回诊断，让 familyService 继续关键词 fallback |
| platform | `js/platform/memoryBrain/memoryFamilyStore.js` | 保存 `family-clustering` batch、`memoryBrain.families` 和 `fact.familyIds`，支持撤回和批次回滚 |
| feature service | `js/features/memoryBrain/familyService.js` | 编排 facts → embeddings → drafts → AI 命名 / fallback → store，并记录控制台 trace |
| feature view | `js/features/memoryBrain/familyView.js` | 渲染家族卡片、成员事实、关键词、整理理由和撤回按钮 |
| css | `css/modules/memory_brain_families.css` | 记忆家族卡片和家族操作区样式 |
| tools | `tools/memory-brain-gate.js` / `tools/memory-brain-fixture-gate.js` | 检查加载顺序、影子边界和事件→事实→家族 fixture |

## 数据写入

成功整理后新增或更新：

```text
memoryBrain.families[]
fact.familyIds[]
memoryBrain.batches[] kind = family-clustering
```

每个 family 包含：

```text
title
summary
labels
keywords
memoryTone
sourceReason
factIds
confidence
mode = shadow
status = active
lastBatchId
createdAt / updatedAt
```

每个 batch 额外保存：

```text
input
rawOutput
parsedDrafts
parserDiagnostics
familyIds
factIds
beforeFamilies
beforeFactFamilyIds
```

因此一次 family 整理可以整批回滚：新建家族会 retired，更新过的旧家族会恢复到整理前，facts 的 `familyIds` 也会恢复。

## 控制台 trace

`familyService` 会记录：

1. `记忆脑家族向量准备结果`：embedding 成功数、失败原因或 fallback。
2. `记忆脑家族整理输入`：fact/family 数量、draft、prompt、embedding 结果。
3. `记忆脑家族命名 AI 请求`：由统一 request trace 记录请求。
4. `记忆脑家族命名模型输出`：模型原始文本。
5. `记忆脑家族命名解析结果`：JSON 解析结果、families、diagnostics。
6. `记忆脑家族整理应用结果`：batchId、familyCount、changedFacts、diagnostics。
7. `记忆脑家族整理错误`：命名失败时 fallback 到本地 draft 并写入 batch。
8. `记忆脑家族撤回` / `记忆脑家族批次回滚`：人工修正和回滚痕迹。

## fallback 策略

- 如果向量 API 未配置或失败，继续用 keywords / labels / factType / content token 做相似度。
- 如果总结 API / 主 API 未配置，继续用本地 draft 的关键词生成家族名。
- 如果 AI 命名 JSON 解析失败，不丢弃聚类结果，改用本地 draft 名称，并在 diagnostics 记录 fallback。

## 不做范围

- 不做 graph link。
- 不做人物画像、AI 自我、世界观或项目脑。
- 不做正式 prompt 注入。
- 不让一条事实通过 graph 多跳召回。
- 不改 `memory_table.js`、`vector_memory.js`、`journal.js`。
- 不双写旧记忆系统，不双注入聊天 prompt。

## 手动 smoke

1. 先生成事件时间线。
2. 从事件提取至少 2 条原子事实。
3. 点击“整理记忆家族”。
4. 记忆家族区出现 family 卡片，显示标题、摘要、成员事实、关键词和整理理由。
5. 展开 family 卡，点击“撤回这个家族”，该 family retired，成员 facts 的 `familyIds` 被移除。
6. 再次整理后，点击“撤回最近家族批次”，family 和 facts 关系恢复到整理前。
7. 打开控制台，确认输入、embedding、命名、解析、应用、错误或回滚都有 trace。
8. 发送新消息，确认 Memory Brain families 没有进入正式 prompt 注入。
