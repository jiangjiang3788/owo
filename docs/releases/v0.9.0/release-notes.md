# OWO v0.9.0

这是全项目 AI 运行时收敛的第一版。

- 新增统一 `AiTask` 契约和 canonical task ID。
- 将旧 API 设置归一为 Provider Account、Model Profile 和 Task Route。
- 新增 `OwoApp.features.aiRuntime.publicApi.invokeTask()`。
- 支持专业模型失败后回退主模型。
- 主聊天、后台回复、视频通话、通话总结和图片描述的请求执行已进入 Runtime。
- 旧 `fetchAiResponse()` 已成为 Runtime 兼容桥，因此日记、档案等旧功能无需立即重写即可进入统一 Trace。
- Request Trace 新增任务、路由和回退信息。
- 本版不修改现有 Prompt、世界书和旧记忆效果。
