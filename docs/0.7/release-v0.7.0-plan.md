# v0.7.0 · 关系连续性模型

目标：从全历史事件、事实、家族、graph 和长期模型里提炼长期关系线，生成顾客可读的“关系连续性模型”。

本版只写 Memory Brain shadow 状态：

- `memoryBrain.relationshipContinuityNodes`
- `memoryBrain.relationshipContinuityRuns`
- `memoryBrain.models(type=relationship-continuity)`
- `memoryBrain.batches(kind=relationship-continuity-model)`

边界：不正式注入 prompt，不替换旧表格 / 档案记忆，不写旧 `memory_table` / `vector_memory` / `journal`。
