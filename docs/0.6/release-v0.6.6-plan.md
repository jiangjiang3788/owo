# OWO v0.6.6：正式默认开启候选 / 手动开启前 gate

## 目标

Memory Brain 可以作为未来正式 memory owner 的候选继续保持开启，但到 `v0.9` 完成前仍不允许接入正式 prompt。

本版提供一个用户可读的开启前报告：

```text
可信记忆 gate
注入质量测试
新旧注入对照
正式 adapter 演练
实时注入 trace
owner 安全状态
  ↓
候选开启前 gate
```

## 写入

```text
memoryBrain.settings.formalCandidateEnabled
memoryBrain.formalCandidateGateReports
memoryBrain.formalCandidateGateRuns
memoryBrain.batches(kind=formal-candidate-gate)
```

## 不做

```text
不正式注入 prompt
不接 sendMessage / getAiReply / promptSemantics
不替换旧记忆 owner
不写旧 memory_table / vector_memory / journal
不双系统注入
```

## 安全边界

即使候选 gate 通过，也固定：

```text
formalPromptInjection = false
manualEnableAllowed = false
cutoverGate = blocked-until-v0.9
finalOwner = legacy
```
