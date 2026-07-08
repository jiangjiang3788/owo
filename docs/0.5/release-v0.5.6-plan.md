# OWO v0.5.6：记忆信任分

目标：为 Memory Brain 内的 facts / families / graph edges / long-term models 生成可解释 trust score，让可信记忆阶段不仅能纠错，还能知道哪些记忆更适合后续召回、审查和正式接管演练。

## 范围

- 计算事实、家族、关系边、长期模型的信任分。
- 写入 `memoryBrain.trustScoreRecords`、`memoryBrain.trustScoreRuns` 和 `memoryBrain.batches(kind = memory-trust-score)`。
- 同步把 `trustScore / trustLevel / trustReasons / trustUpdatedAt` 写到新记忆脑对象上。
- 支持回滚最近信任分批次。

## 信任分参考因素

- 置信度。
- 证据数量和来源范围。
- duplicate / obsolete / disputed / retired 状态。
- 事实改写、冲突处理、家族调整、模型修正历史。
- 纠错影响传播状态。
- 家族成员规模和成员事实平均信任分。
- graph 关系验证状态。
- 长期模型是否 sourceStale 或 needs-rebuild。

## 边界

- 不跑 AI。
- 不写旧 `memory_table` / `vector_memory` / `journal`。
- 不正式注入 prompt。
- 不做 v0.5.7 gate 收口。

到 v0.9 完成前，Memory Brain 仍然只读 / 可整理 / 可预览 / 可演练 / 可纠错；正式聊天注入仍由当前旧记忆 owner 执行。
