# OWO v0.4.0：Memory Brain 历史源扫描器

## 目标

解决“最近几十条能整理，但几万条历史还没有入口”的问题。

v0.4.0 不做历史总结，不让 AI 读取几万条消息，只先盘点：

```text
全部单人聊天 / 群聊
  ↓
消息数量
时间范围
旧日记 / 表格 / 向量数量
预计切片数
  ↓
memoryBrain.archiveSources
memoryBrain.archiveScanRuns
history-archive-scan batch
```

## 新增文件

```text
js/core/memoryBrain/archiveSourceSemantics.js
js/platform/memoryBrain/historyArchiveScanner.js
js/features/memoryBrain/historyArchiveService.js
js/features/memoryBrain/historyArchiveView.js
css/modules/memory_brain_archive.css
docs/0.4/README.md
docs/0.4/release-v0.4.0-plan.md
tools/history-archive-gate.js
```

## 新增状态

```text
memoryBrain.archiveSources
memoryBrain.archiveScanRuns
memoryBrain.lastArchiveScan
memoryBrain.batches(kind = history-archive-scan)
```

## UI

记忆脑 App 新增“历史整理室 / 历史源扫描”：

```text
扫描全部历史
切片消息数
重叠消息
最少消息
聊天来源数量
历史消息数量
预计切片数量
超大聊天数量
扫描记录
```

## 边界

```text
不跑 AI
不总结历史
不生成事件
不生成事实
不迁移旧记忆
不修改 memory_table / vector_memory / journal
不正式注入 prompt
```

## 下一版

```text
v0.4.1：历史切片 / 游标
```

把 archiveSources 里的聊天拆成 archiveChunks，支持 overlap、cursor、pending/running/done/failed 状态。
