# OWO v0.4.8：新旧注入对照 / 接管演练

目标：对同一条用户输入，同时生成旧正式记忆 owner 的注入块和 Memory Brain shadow 注入包，比较漏召回、错召回、重复召回和接管风险。

边界：本版只生成 cutover report，不接正式 prompt，不写旧 memory_table / vector_memory / journal，不改变当前正式记忆 owner。

写入：

- `memoryBrain.cutoverReports`
- `memoryBrain.cutoverRehearsalRuns`
- `memoryBrain.batches(kind = cutover-rehearsal)`

验收：

- 接管报告必须包含旧 owner、旧注入预览、新注入预览、overlap、issues 和 readiness。
- `readyForFormalCutover` 必须保持 `false`。
- 报告可回滚。
- 不允许出现 `sendMessage` / `promptSemantics` / 正式注入接入。
