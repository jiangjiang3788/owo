# v0.3.1 Memory Brain 事件时间线版

## Scope

本版实现 Memory Brain 的第一条真实能力：把当前聊天最近 N 条消息整理成一条事件摘要，保存到 `memoryBrain.events`，并显示在记忆脑时间线卡片里。

仍然保持影子模式：不替换旧记忆系统，不替换旧回忆日记、记忆表格、向量记忆，也不参与正式聊天 prompt 注入。

## 新增 owner

| 层 | owner | 职责 |
|---|---|---|
| core | `js/core/memoryBrain/eventSemantics.js` | 事件 prompt、JSON 解析、emotion/importance 归一化、来源范围补齐、时间线 compact |
| platform | `js/platform/memoryBrain/memoryBrainStore.js` | 保存 `event-summary` batch 和 `memoryBrain.events`，只写新 store |
| feature service | `js/features/memoryBrain/eventTimelineService.js` | 读取当前聊天最近 N 条、调用总结 API、记录控制台 trace、应用结果 |
| feature view | `js/features/memoryBrain/timelineView.js` | 渲染事件卡片、关键词、情绪、重要度、未完成线索和来源范围 |
| css | `css/modules/memory_brain_timeline.css` | 时间线卡片和整理表单样式 |
| tools | `tools/memory-brain-gate.js` | 检查 v0.3.1 文件、加载顺序、影子模式和禁止旧大文件扩张 |

## 数据写入

成功整理后新增：

```text
memoryBrain.events[]
memoryBrain.batches[] kind = event-summary
```

每条事件包含：

```text
title
summary
keywords
emotion
importance
relationNodes
openThreads
promises
sourceReason
source.chatId / chatType / chatName
source.startIndex / endIndex / startMessageId / endMessageId / messageCount
batchId
mode = shadow
```

失败时也会写入 `memoryBrain.batches[]`，保留输入摘要、模型原始输出、解析诊断或错误信息，方便从控制台和数据里追踪。

## 控制台 trace

`eventTimelineService` 会记录四类操作：

1. `记忆脑事件整理输入`：聊天、范围、消息预览、prompt。
2. `记忆脑事件整理模型输出`：模型原始文本。
3. `记忆脑事件整理解析结果`：JSON 解析结果和 diagnostics。
4. `记忆脑事件整理应用结果 / 错误`：eventId、batchId 或错误信息。

AI 请求本身继续通过统一 request trace 记录 endpoint、requestBody、responseBodyText，并由控制台 renderer 展示。

## 不做范围

- 不拆原子事实。
- 不生成记忆家族。
- 不做 graph。
- 不重建人物画像、AI 自我或世界观。
- 不生成正式注入包。
- 不双写旧记忆系统。
- 不双注入聊天 prompt。

## 手动 smoke

1. 打开一个已有聊天记录的聊天。
2. 回到主页打开“记忆脑”。
3. 保持默认最近 30 条，点击“整理最近聊天”。
4. 如果总结 API / 主 API 已配置，等待事件生成。
5. 时间线出现一张事件卡。
6. 展开卡片，能看到关键词、未完成线索和来源 #start-#end。
7. 打开控制台，能看到输入、模型输出、解析结果、应用结果或错误。
8. 发送新消息，确认 Memory Brain 事件没有进入正式 prompt 注入。
