# OWO v0.9.0 AI Runtime 所有权地图

| 领域 | canonical owner | 兼容入口 | 状态 |
|---|---|---|---|
| Task ID、输入模式、能力需求 | `core/ai/taskContracts.js` | 旧 task alias | 已收敛 |
| Task pattern 与候选顺序 | `core/ai/routingSemantics.js` | 无 | 已收敛 |
| 旧 API 设置归一 | `platform/ai/aiConfigStore.js` | `apiSettings` 等旧字段 | 已收敛 |
| Provider Account | `platform/ai/aiConfigStore.js` | 旧 API 设置 | 只读归一视图 |
| Model Profile | `platform/ai/aiConfigStore.js`、`modelRegistry.js` | 旧模型字段 | 只读归一视图 |
| Task Route | `platform/ai/aiConfigStore.js` | `aiConfig.taskRoutes` | 已收敛 |
| 请求体组装 | `platform/ai/providerRequestAdapter.js` | legacy 模块已组装请求体 | 部分收敛 |
| Provider 请求执行 | `features/aiRuntime/service.js` | `utils.fetchAiResponse`、`aiRouter.chat` | 已收敛 |
| 标准化响应 | `platform/ai/responseNormalizer.js` | legacy 解析仍保留 | 部分收敛 |
| 请求追踪 | `platform/ai/requestTraceStore.js` | 无 | 已增加 task/route 信息 |
| 主聊天 Prompt | `modules/chat_ai.js` | 无 | 尚未迁移 |
| 世界书上下文 | `features/worldBook/contextService.js` | legacy Prompt 拼接 | 尚未迁移 |
| 日记 Prompt | `modules/journal.js` | 无第二套 Builder | 单一 Prompt owner |
| 日记 AI 执行 | `features/journalRuntime/service.js` | `journal-legacy-adapter` | 三态过渡中 |
| 日记输出契约 | `core/output/outputContracts.js`、`core/journal/outputContracts.js` | XML/JSON 兼容解析 | 已收敛 |
| 档案 Prompt | `modules/memory_table.js` | `utils.fetchAiResponse` | 请求已收敛，Prompt 未收敛 |
| 向量内容与索引 | `features/vectorMemory`、`embeddingAdapter.js` | 旧向量模式 | 尚未重构 |

## 当前唯一高层入口

```javascript
OwoApp.features.aiRuntime.publicApi.invokeTask(request)
```

## 兼容执行入口

```javascript
OwoApp.features.aiRuntime.publicApi.executeProviderRequest(request)
```

它只用于已自行组装 Provider Request 的旧功能。新功能不得优先使用这个入口，而应使用 `invokeTask()`。

## 下一步

v0.10.0 将在私聊和日记两个真实纵向切片基础上冻结：

- `ContextItem v1`；
- `ContextProvider`；
- `PromptSection v1`；
- `Prompt Compiler`；
- 上下文权限与不可信资料隔离。
