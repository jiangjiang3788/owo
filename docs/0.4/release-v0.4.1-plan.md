# OWO v0.4.1：Memory Brain 历史切片 / 游标

v0.4.1 解决“几万条历史不能一次交给 AI”的第一层工程问题：把历史来源切成可恢复、可续跑、可回滚的小块。

## 本版目标

```text
archiveSources
  ↓
archiveChunks
  ↓
archiveCursors
```

每个 chunk 只保存：

```text
来源聊天
消息范围
overlap 信息
时间范围
hash
短预览
pending / running / done / failed 状态
```

不保存完整消息正文到 memoryBrain 状态，避免重复膨胀。

## 新增文件

```text
js/core/memoryBrain/archiveChunkSemantics.js
js/platform/memoryBrain/historyChunkStore.js
js/features/memoryBrain/historyChunkService.js
js/features/memoryBrain/historyChunkView.js
tools/history-chunk-gate.js
```

## 数据写入

```text
memoryBrain.archiveChunks
memoryBrain.archiveCursors
memoryBrain.archiveChunkRuns
memoryBrain.batches(kind = history-archive-chunking)
```

## 边界

v0.4.1 仍然：

```text
不跑 AI
不总结历史
不生成事件
不生成事实
不迁移旧记忆
不改旧 journal / memory_table / vector_memory
不正式注入 prompt
```

到 v0.9 完成前，Memory Brain 仍是可读取 / 可整理 / 可预览的新脑；正式注入仍由当前旧记忆 owner 负责。

## 验收

```text
扫描来源后可准备切片
每个来源建立 cursor
chunk 带 overlap 和来源消息范围
切片批次可回滚
控制台能看到输入和应用结果
history-chunk-gate 通过
```
