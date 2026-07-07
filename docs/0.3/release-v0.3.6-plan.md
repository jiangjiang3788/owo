# OWO Memory Brain v0.3.6：注入预览 / 影子注入对照

## 目标

`v0.3.6` 的目标不是立刻替换旧 prompt，而是让新记忆脑先生成一份可检查、可回滚、可对照的 shadow injection package。

也就是：

```text
当前聊天输入
  ↓
Memory Brain 召回事件 / 事实 / 家族 / graph / 长期模型
  ↓
生成影子注入包
  ↓
和旧记忆来源只读对照
  ↓
写入 memoryBrain.injectionPreviews / batches
  ↓
在记忆脑 App 和控制台查看
```

## 已落地范围

- 新增 `core/memoryBrain/injectionSemantics.js`：纯语义召回和注入包构建。
- 新增 `platform/memoryBrain/memoryInjectionStore.js`：保存 `memoryBrain.injectionPreviews` 和 `injection-preview` batch。
- 新增 `features/memoryBrain/injectionPreviewService.js`：编排当前输入、旧记忆只读对照、控制台 trace 和写入。
- 新增 `features/memoryBrain/injectionView.js`：手机端 shadow injection package 卡片。
- 新增 `css/modules/memory_brain_injection.css`：注入预览 UI 样式。
- 记忆脑 App 新增“生成影子注入预览”和“撤回最近预览批次”。
- 控制台记录输入、应用结果、撤回和回滚。

## 写入边界

只允许写：

```text
memoryBrain.injectionPreviews
memoryBrain.batches
```

不允许写：

```text
memory_table.js / memoryTables
vector_memory.js / vectorMemory.entries
journal.js / memoryJournals
core/chat/promptSemantics.js
正式聊天请求 prompt
```

旧系统在这一版仍然是正式注入 owner。新记忆脑只展示“如果由我来注入，我会放入这些内容”。

## 注入包内容

每个 preview 保存：

```text
query.text
query.chatId / chatType / chatName
selected.modelIds
selected.factIds
selected.familyIds
selected.edgeIds
selected.eventIds
selectedCards
memoryBlock
legacyComparison
policy.previewOnly = true
policy.formalPromptInjection = false
diagnostics
```

## 旧系统对照

旧系统只读对照会统计当前聊天里的：

```text
memoryJournals
vectorMemory.entries
memoryTables data cells
```

只显示数量和片段，不迁移、不改写、不进入新记忆脑事实层。

## 回滚

`injection-preview` batch 保存：

```text
previewIds
selected
legacyComparison
memoryBlock
parserDiagnostics
```

撤回批次时只把对应 preview 标记为 retired，不影响事件、事实、家族、graph、长期模型，也不影响旧系统。

## 控制台 trace

新增 trace：

```text
记忆脑注入预览输入
记忆脑注入预览应用结果
记忆脑注入预览撤回
记忆脑注入预览批次回滚
```

## 仍不做的事

- 不正式注入 prompt。
- 不修改 `core/chat/promptSemantics.js`。
- 不替换旧记忆表格、旧向量记忆、旧日记。
- 不双系统注入。
- 不做后台调度、成本档、衰减 / 浮现。
- 不做真正 MCP server。

## 下一版

`v0.3.7` 应该做调度、成本、后台整理和记忆浮现 / 衰减：

```text
省钱模式
均衡模式
深度模式
手动深整理
后台轻整理
重要记忆 strengthen
过时记忆 decay
已解决线索沉底
```
