# OWO v0.4.2：Memory Brain 回填队列 / 断点续跑

## 目标

把 v0.4.1 生成的 `archiveChunks` 编入可控的历史回填队列。

```text
archiveSources
  ↓
archiveChunks
  ↓
backfillJobs
  ↓
backfillRuns
```

v0.4.2 只排队、记断点、支持暂停/继续/重试/回滚；不跑 AI、不总结历史、不生成事件、不迁移旧记忆、不参与正式 prompt 注入。

## 新增写入

```text
memoryBrain.backfillJobs
memoryBrain.backfillRuns
memoryBrain.lastBackfillRun
memoryBrain.batches(kind = history-backfill-queue)
archiveChunks.backfillJobId / backfillStatus
archiveCursors.backfillStatus / backfill counters
```

## 新增文件

```text
js/core/memoryBrain/backfillQueueSemantics.js
js/platform/memoryBrain/backfillQueueStore.js
js/features/memoryBrain/historyBackfillService.js
js/features/memoryBrain/historyBackfillView.js
css/modules/memory_brain_backfill.css
tools/history-backfill-gate.js
```

## UI

记忆脑 App 新增“回填队列 / 断点续跑”区：

```text
建立回填队列
开始一批
暂停队列
继续队列
重试失败
撤回最近回填队列
```

## 边界

```text
不跑 AI
不调用 aiRouter.chat
不生成事件
不生成事实
不写旧 memory_table
不写旧 vector_memory
不写旧 journal
不接 sendMessage / promptSemantics
formalPromptInjection = false
writesLegacyMemory = false
```

下一版 `v0.4.3` 才开始从 queued chunk 生成历史事件。
