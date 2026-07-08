# OWO v0.5.2：冲突事实处理

本版目标：把 `disputed facts` 从“自动标记为冲突”推进到“可以人工处理”。

## 做什么

```text
disputed facts
  ↓
冲突组
  ↓
选择真实版本 / 两边保留 / 条件保留 / 标记过时 / 忽略误报
  ↓
fact-conflict-resolution batch
  ↓
可回滚
```

新增写入：

```text
memoryBrain.factConflictResolutions
memoryBrain.factConflictRuns
memoryBrain.batches(kind = fact-conflict-resolution)
memoryBrain.facts conflict resolution fields
memoryBrain.conflicts status
```

## 不做什么

```text
不正式注入 prompt
不接 sendMessage / getAiReply / promptSemantics
不写旧 memory_table / vector_memory / journal
不做家族合并 / 拆分
不做长期模型人工修正
不做外部脑 / MCP
```

到 `v0.9` 完成前，Memory Brain 仍然只是可读取、可整理、可预览、可演练、可纠错的新脑；正式聊天注入继续由当前旧记忆 owner 执行。

## 验收

```bash
node tools/fact-conflict-gate.js
node tools/fact-correction-gate.js
node tools/review-inbox-gate.js
node tools/netlify-build.js
```
