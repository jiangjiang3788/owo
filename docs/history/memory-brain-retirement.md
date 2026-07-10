# Memory Brain 历史与退休摘要

原 `docs/0.3` 至 `docs/0.8` 记录了 Memory Brain 的事实、家族、关系图、长期模型、冲突、夜间整理、梦境、衰减、开放线索、纪念回忆和低成本维护等实验。

这些模块在正式聊天接管前始终保持 shadow / preview / dry-run，核心安全约束包括：

- 不正式注入聊天；
- 不自动写入旧记忆；
- 不主动通知用户；
- 梦境和夜间整理只产生候选；
- 正式接管门在 v0.9 前保持阻断。

v0.8.13 已退休 Memory Brain：运行时代码、页面、样式和调度均移除；若旧数据存在，只保存到 `legacySnapshots.memoryBrain`。日记、档案和向量仍作为独立旧资产保留，等待统一 Context 与 Memory Gateway 重构。

详细退休边界见：

- `docs/releases/v0.8.13/plan.md`
- `docs/architecture/ownership/ai-context-memory.md`
