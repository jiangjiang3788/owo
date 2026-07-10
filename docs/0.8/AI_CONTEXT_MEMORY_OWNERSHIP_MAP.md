# OWO v0.8.13 AI / Context / Memory 所有权地图

本文件只描述当前真实结构，不代表最终目标结构。下一版本以此为迁移清单。

| 领域 | 当前主要 owner | 当前状态 | 下一步收敛方向 |
|---|---|---|---|
| 主聊天 Prompt | `js/modules/chat_ai.js` | 巨型拼接入口，职责过多 | 降级为 Chat Adapter |
| AI 路由 | `js/platform/ai/aiRouter.js`、`aiConfigStore.js`、`modelRegistry.js` | 已有统一化基础 | 建立统一 `invokeAiTask()` |
| Provider 请求 | `providerRequestAdapter.js`、各 legacy 模块 | 仍有功能自有路径 | 全部经过 AI Runtime |
| 响应标准化 | `responseNormalizer.js` | 已可复用 | 扩展为统一 Output Contract |
| 请求追踪 | `requestTraceStore.js`、`platform/observability` | 已可复用 | 增加 Context/Prompt 来源追踪 |
| 世界书 | `core/memory/worldBookSemantics.js`、`features/worldBook/contextService.js` | 聊天直接消费 | 改为 Context Provider |
| 日记 | `modules/journal.js`、`features/journal`、角色 `memoryJournals` | 时间叙事兼正式注入 | 保留资料源，改为片段级 Provider |
| 档案/表格 | `modules/memory_table.js`、`features/memoryTable`、角色 `memoryTables` | 结构资料兼正式注入 | 保留资料库，改为字段/行级 Provider |
| 向量 | `modules/vector_memory.js`、`features/vectorMemory`、`embeddingAdapter.js` | 内容源与索引混合 | 降级为可重建索引能力 |
| 旧记忆 owner | `core/memory/legacyMemoryOwnerSemantics.js` | journal/table/vector 三选一 | 统一 Context Runtime 后取消 |
| Memory Brain | 已退休 | 不执行、不加载 | 不迁移为新核心 |
| Prompt 设置 | `magic-room-screen`、`features/promptCenter/public.js` | facade + legacy UI | 建立模板/策略中心 |
| API 设置 | `features/settings/apiSettings` 与多套 settings | 多任务配置分散 | Provider Account + Model Profile + Task Route |
| 剧场 AI | `core/theater`、`features/theater`、legacy 模块 | 独立上下文和 Prompt | 第二个 Runtime 接入验证功能 |
| 论坛 AI | `features/forum` | 独立任务路径 | 后续迁入统一 Runtime |
| 通话 / Live | `features/videoCall`、legacy modules | 实时状态与 Prompt 混合 | 临时 Context Provider |

## 下一版唯一目标

建立三个契约，不迁移业务效果：

1. `AiTask`：功能声明要完成的任务。
2. `ContextItem`：世界书、记忆、状态统一格式但语义分区。
3. `invokeAiTask()`：统一模型路由、请求和 Trace 的入口。
