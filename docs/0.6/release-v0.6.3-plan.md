# OWO v0.6.3：旧系统只读降级

目标：建立旧档案 / 日记 / 向量记忆未来降为只读历史来源的演练报告。

本版只做准备度检查和 UI 报告，不修改旧记忆、不改正式 prompt、不切换 owner。

## 边界

- Memory Brain 到 v0.9 前仍 blocked。
- 正式聊天注入仍由当前旧记忆 owner 执行。
- 不写 `memory_table`、`vector_memory`、`journal`。
- 不接 `sendMessage` / `getAiReply` / `promptSemantics`。

## 写入

- `memoryBrain.legacyReadOnlyReports`
- `memoryBrain.legacyReadOnlyRuns`
- `memoryBrain.batches(kind=legacy-readonly-downgrade)`
