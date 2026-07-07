# v0.3.2 Memory Brain 原子事实层

## Scope

本版在 `v0.3.1` 事件时间线之上新增原子事实层：把一条事件摘要拆成多条可追溯、可回滚、可多归属的 fact candidates。

仍然保持影子模式：不替换旧记忆系统，不写旧回忆日记、记忆表格、向量记忆，也不参与正式聊天 prompt 注入。

## 完整计划位置

`v0.3.x` 的完整路线是：

```text
v0.3.0 架构骨架
v0.3.1 事件时间线
v0.3.2 原子事实
v0.3.3 记忆家族
v0.3.4 Graph 关系
v0.3.5 长期模型：用户画像 / AI 自我 / 世界观 / 项目脑
v0.3.6 注入预览和影子注入对照
v0.3.7 成本调度、后台整理、浮现/衰减
v0.3.8 记忆小屋 UI、fixture gate、稳定收口
```

核心生长流程不变：

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

## 新增 owner

| 层 | owner | 职责 |
|---|---|---|
| core | `js/core/memoryBrain/factSemantics.js` | 事实提取 prompt、JSON 解析、confidence/polarity 归一化、来源事件补齐、事实 compact |
| platform | `js/platform/memoryBrain/memoryFactStore.js` | 保存 `fact-extraction` batch 和 `memoryBrain.facts`，提供事实撤回和批次回滚 |
| feature service | `js/features/memoryBrain/factExtractionService.js` | 从事件调用 AI 提取事实，记录控制台 trace，应用到新 store |
| feature view | `js/features/memoryBrain/factView.js` | 渲染事实候选、证据、标签、置信度、来源范围和撤回按钮 |
| css | `css/modules/memory_brain_facts.css` | 原子事实卡片、计划卡和事实操作区样式 |
| tools | `tools/memory-brain-gate.js` | 检查 v0.3.2 文件、加载顺序、影子模式和禁止旧大文件扩张 |

## 数据写入

成功提取后新增：

```text
memoryBrain.facts[]
memoryBrain.batches[] kind = fact-extraction
```

每条事实包含：

```text
content
subject
predicate
object
factType
labels
keywords
polarity
confidence
evidenceQuote
sourceReason
source.eventId / eventTitle / eventBatchId
source.chatId / chatType / chatName
source.startIndex / endIndex / messageCount
batchId
status = active
reviewStatus = auto-applied-candidate
mode = shadow
```

如果重复提取同一事件，store 会跳过同事件同内容的 active fact，并在 batch diagnostics 里记录 `duplicate_fact_skipped`。

## 控制台 trace

`factExtractionService` 会记录：

1. `记忆脑事实提取输入`：事件、来源、maxFacts、prompt。
2. `记忆脑事实提取 AI 请求`：由统一 request trace 记录请求。
3. `记忆脑事实提取模型输出`：模型原始文本。
4. `记忆脑事实提取解析结果`：JSON 解析结果、facts、diagnostics。
5. `记忆脑事实提取应用结果`：batchId、factCount、diagnostics。
6. `记忆脑事实提取错误`：API、解析或应用错误。
7. `记忆脑事实候选撤回` / `记忆脑事实批次回滚`：人工修正和回滚痕迹。

## 不做范围

- 不生成记忆家族。
- 不做 embedding 聚类。
- 不做 graph。
- 不重建人物画像、AI 自我或世界观。
- 不生成正式注入包。
- 不双写旧记忆系统。
- 不双注入聊天 prompt。

## 手动 smoke

1. 打开一个已有聊天记录的聊天。
2. 回到主页打开“记忆脑”。
3. 点击“整理最近聊天”，生成至少一条事件。
4. 点击“从事件提取事实”。
5. 原子事实区出现多张事实卡，能看到 content、subject / predicate / object、置信度、证据、来源事件。
6. 展开事实卡，点击“撤回这条事实”，该事实从 active 视图消失。
7. 再次提取事实后，点击“撤回最近事实批次”，最近批次事实全部 retired。
8. 打开控制台，确认输入、模型输出、解析、应用、撤回或错误都有 trace。
9. 发送新消息，确认 Memory Brain facts 没有进入正式 prompt 注入。
