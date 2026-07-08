# OWO v0.6.4：一键关闭 / 回退演练

## 目标

- 提供一键关闭 Memory Brain 影子注入候选。
- 提供一键回退 legacy owner 演练。
- 继续保持 `blocked-until-v0.9`，不正式接管 prompt。
- 明确保证：如果当前聊天使用 `memoryMode = table`，旧表格记忆仍可自动总结 / 自动更新。

## 边界

不接 `sendMessage`、不接 `getAiReply`、不接 `promptSemantics`，不写旧 `memory_table` / `vector_memory` / `journal`。

## 写入

```text
memoryBrain.settings.shadowInjectionEnabled
memoryBrain.ownerState
memoryBrain.ownerRecoveryReports
memoryBrain.ownerRecoveryRuns
memoryBrain.batches(kind = owner-recovery)
```

## 结论

本版只控制 Memory Brain 的影子候选和 owner 演练，不影响当前正在使用的旧档案 / 表格记忆正式总结链路。
