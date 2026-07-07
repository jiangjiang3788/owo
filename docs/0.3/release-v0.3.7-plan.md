# OWO Memory Brain v0.3.7：调度 / 成本 / 浮现衰减

## 目标

`v0.3.7` 的目标不是让新记忆脑正式接管聊天，而是让它开始拥有“轻整理节奏”：

```text
省钱 / 均衡 / 深度成本档
  ↓
生成 shadow scheduleQueue
  ↓
运行浮现 / 衰减维护
  ↓
更新新记忆脑 weight / activation / decay
  ↓
写入 schedulerRuns / memory-maintenance batch
  ↓
控制台 trace 和批次回滚
```

这一版让记忆脑从“手动整理工具”推进到“可配置的自我整理小脑”，但仍然保持影子模式。

## 已落地范围

- 新增 `core/memoryBrain/weightSemantics.js`：纯计算成本档、整理计划、记忆权重、浮现和衰减。
- 新增 `platform/memoryBrain/memoryScheduleStore.js`：保存 `memoryBrain.scheduleQueue`、`memoryBrain.schedulerRuns` 和 `memory-maintenance` batch。
- 新增 `features/memoryBrain/memorySchedulerService.js`：编排成本档更新、整理计划、浮现/衰减维护、控制台 trace 和回滚。
- 新增 `features/memoryBrain/schedulerView.js`：手机端展示成本档、整理队列、今日浮现、运行记录。
- 新增 `css/modules/memory_brain_scheduler.css`：调度生命层 UI 样式。
- 记忆脑 App 新增“保存成本档”“生成整理计划”“运行浮现/衰减”“撤回最近维护”。

## 三档成本模式

```text
省钱模式 economy
- 少跑模型
- 大批次间隔
- 日常低成本使用

均衡模式 balanced
- 事件、事实、家族、graph 定期整理
- 长期模型低频重建
- 当前默认推荐

深度模式 deep
- 更频繁整理和长期模型重建
- 适合睡前、阶段总结、重要关系事件后
```

## 调度队列

`buildMaintenancePlan` 会根据当前 snapshot 给出影子整理计划：

```text
weight-maintenance
fact-extraction
family-clustering
graph-linking
long-term-model
injection-preview
event-summary
```

队列只是建议和影子记录，不会自动跑贵模型，也不会后台承诺未来执行。

## 浮现 / 衰减

`runMaintenanceCycle` 会计算每条新记忆脑对象的：

```text
weight
activation
decay
freshness
lastWeightAt
weightProfileId
weightReason
```

参与计算的对象：

```text
memoryBrain.events
memoryBrain.facts
memoryBrain.families
memoryBrain.edges
memoryBrain.models
memoryBrain.injectionPreviews
```

浮现因素包括：

```text
置信度 / 重要度
时间新鲜度
未完成线索
证据数量
家族 / graph 连接数量
被召回次数
```

## 写入边界

只允许写：

```text
memoryBrain.scheduleQueue
memoryBrain.schedulerRuns
memoryBrain.batches
新记忆脑对象上的 weight / activation / decay / freshness / lastWeightAt 字段
```

不允许写：

```text
memory_table.js / memoryTables
vector_memory.js / vectorMemory.entries
journal.js / memoryJournals
core/chat/promptSemantics.js
正式聊天请求 prompt
```

## 回滚

`memory-maintenance` batch 保存：

```text
updates
floating
beforeItems
schedulerRunId
profileId
```

撤回时会恢复被维护对象原来的 `weight / activation / decay / freshness / lastWeightAt / weightProfileId / weightReason` 字段。

## 控制台 trace

新增 trace：

```text
记忆脑成本档更新
记忆脑调度计划输入
记忆脑调度计划应用结果
记忆脑浮现衰减输入
记忆脑浮现衰减应用结果
记忆脑浮现衰减批次回滚
```

## 仍不做的事

- 不正式注入 prompt。
- 不修改 `core/chat/promptSemantics.js`。
- 不接 `getAiReply` / `sendMessage`。
- 不替换旧记忆表格、旧向量记忆、旧日记。
- 不自动后台承诺未来执行。
- 不做真正 MCP server。
- 不做 v0.3.8 的记忆小屋视觉总收口。

## 下一版

`v0.3.8` 应该做产品化收口：

```text
记忆小屋 / 记忆宫殿式 UI
fixture gate 扩展
导出 / 备份路线
影子系统稳定审查
切换旧系统前的安全 gate
```
