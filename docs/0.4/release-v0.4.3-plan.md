# OWO v0.4.3 · Memory Brain 历史事件回填

## 目标

把 `v0.4.2` 建好的 `event-backfill` 回填任务真正跑起来：

```text
archiveChunks
  ↓
backfillJobs(event-backfill, running)
  ↓
memory-event AI task
  ↓
0～多条历史事件
  ↓
memoryBrain.events
  ↓
job / chunk / cursor 断点状态推进
```

这一版解决“几万条历史只能看最近几十条”的第一层回填：先把历史切片压成可追溯的事件时间线。

## 写入范围

只允许写入：

```text
memoryBrain.events
memoryBrain.backfillJobs
memoryBrain.archiveChunks
memoryBrain.archiveCursors
memoryBrain.backfillRuns
memoryBrain.historyEventBackfillRuns
memoryBrain.batches(kind = history-event-backfill)
```

## 不做什么

```text
不生成历史事实
不重建家族
不重建 graph
不重建长期模型
不修改旧 memory_table
不修改旧 vector_memory
不修改旧 journal
不接 sendMessage
不修改 promptSemantics
不正式注入 prompt
```

## UI

记忆脑历史整理室新增：

```text
回填历史事件
撤回最近历史事件
历史事件回填运行记录
最近回填事件
```

## 控制台 trace

```text
历史事件回填输入
历史事件回填 chunk 输入
记忆脑历史事件回填 AI 请求
历史事件回填模型输出
历史事件回填解析结果
历史事件回填应用结果
历史事件回填错误
历史事件回填批次回滚
```

## 验收

```bash
node tools/history-event-backfill-gate.js
node tools/memory-brain-fixture-gate.js
node tools/netlify-build.js
```

继续保持：到 `v0.9` 完成之前，Memory Brain 只是可读取、可整理、可预览的新脑；正式聊天注入仍由当前旧记忆 owner 负责。
