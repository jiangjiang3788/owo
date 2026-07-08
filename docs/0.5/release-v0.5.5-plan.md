# OWO v0.5.5：纠错影响传播

## 目标

把 v0.5.1～v0.5.4 产生的可信修正，不停留在单点对象上，而是传播到下游结构：

```text
事实改写 / 冲突事实处理 / 家族合并拆分 / 长期模型修正
  ↓
family / graph / model / review inbox 下游状态刷新
  ↓
correction-propagation batch
  ↓
可回滚
```

## 本版范围

新增：

```text
memoryBrain.correctionPropagations
memoryBrain.correctionPropagationRuns
memoryBrain.batches(kind = correction-propagation)
```

传播会更新：

```text
fact.propagationStatus
family.propagationStatus / needsSummaryRefresh
edge.validationStatus / propagationStatus
model.propagationStatus / needsRebuildReason
reviewInboxItem.propagationStatus
```

## 边界

```text
不正式注入 prompt
不接 sendMessage / getAiReply / promptSemantics
不写旧 memory_table / vector_memory / journal
不自动重建长期模型
不做外部脑 / MCP
```

到 v0.9 完成前，Memory Brain 仍然只读 / 可整理 / 可预览 / 可演练 / 可纠错；正式聊天注入仍由当前旧记忆 owner 执行。

## 验收

```bash
node tools/correction-propagation-gate.js
node tools/netlify-build.js
```
