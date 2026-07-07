# OWO v0.4.5：历史事实去重 / 冲突 / 过时事实

目标：在全量家族 / graph 重建前，先清理历史事实池。

本版范围：
- 事实生命周期计划：duplicate / obsolete / disputed。
- 应用 lifecycle batch，可回滚。
- UI 展示重复、冲突和过时事实。
- 修复控制台详情中 AI 回复批次、用户发送消息的重复展示。
- 主聊天 prompt 改为每条消息附带轻量时间戳，时间更明显。

边界：
- 不重建 family。
- 不重建 graph。
- 不重建长期模型。
- 不写旧 memory_table / vector_memory / journal。
- 不正式注入 Memory Brain prompt。
