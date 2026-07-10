# 私聊 Runtime 所有权地图

| 责任 | v0.9.2 owner |
|---|---|
| 私聊历史裁剪与节点隔离 | `js/modules/chat_ai.js` |
| 角色、世界书、旧记忆 Prompt 构建 | `js/modules/chat_ai.js` + 既有 semantics/provider |
| Prepared Request 契约 | `js/core/chat/preparedRequestSemantics.js` |
| legacy/shadow/unified 决策 | `js/core/chat/runtimeModeSemantics.js` |
| 私聊请求执行切换 | `js/features/chatRuntime/service.js` |
| Task 注册与校验 | `js/core/ai/taskContracts.js` |
| Provider 请求执行和 Trace | `js/features/aiRuntime/service.js` |
| Stream 与业务响应解析 | `js/modules/chat_ai.js` |

v0.9.2 明确不创建第二个 Prompt owner。后续 Context Runtime 迁移采用逐片替换。
