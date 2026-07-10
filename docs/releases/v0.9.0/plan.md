# OWO v0.9.0：统一 AI Task Runtime 与模型路由

## 本版目标

本版只收敛模型调用基础设施，不改变世界书、日记、档案、向量和聊天 Prompt 的业务效果。

统一调用链：

```text
业务功能
  -> AiTask
  -> Task Route
  -> Provider Account / Model Profile
  -> Provider Request Adapter
  -> AI Task Runtime
  -> Response Normalizer
  -> Request Trace
```

## 新 canonical owner

| 领域 | owner |
|---|---|
| AI 任务定义与旧别名 | `js/core/ai/taskContracts.js` |
| task pattern 与候选排序 | `js/core/ai/routingSemantics.js` |
| Provider Account / Model Profile / Task Route 快照 | `js/platform/ai/aiConfigStore.js` |
| 模型能力只读视图 | `js/platform/ai/modelRegistry.js` |
| 任务执行、回退与标准化 | `js/features/aiRuntime/service.js` |
| 公开任务入口 | `js/features/aiRuntime/public.js` |

## 兼容策略

旧设置仍然是实际配置来源：

- `apiSettings`
- `summaryApiSettings`
- `backgroundApiSettings`
- `imageRecognitionApiSettings`
- `vectorApiSettings`

运行时会把它们转换成 Provider Account 和 Model Profile。当前不强制用户重新配置 API。

旧调用也不会一次全部重写：

- `chat_ai.js` 的主聊天、后台回复、通话、通话总结和图片描述先经过 Runtime 执行请求；
- `utils.fetchAiResponse()` 作为兼容桥，让日记、档案等大量旧功能先经过 Runtime；
- 功能自己的 Prompt 和响应解析暂时保留，后续版本再迁入 Prompt Runtime 和 Output Contract。

## canonical task

首批任务包括：

- `conversation.reply`
- `conversation.background`
- `conversation.summary`
- `conversation.video_call`
- `journal.generate`
- `journal.merge`
- `archive.suggest_updates`
- `memory.extract`
- `memory.consolidate`
- `image.describe`
- `embedding.create`
- `theater.generate`
- `forum.generate`

旧的 `conversation`、`summary`、`memory-fact` 等名称只作为迁移别名存在。

## 故障回退

专业设置优先，主 API 作为默认回退：

```text
journal.generate
  -> summaryApiSettings
  -> apiSettings
```

每次失败和回退会进入统一 Trace。用户主动取消请求时不会继续尝试备用模型。

## 本版明确不做

- 不统一 Prompt；
- 不改变世界书注入；
- 不改变日记、档案、向量的正式记忆行为；
- 不建立成长型记忆数据库；
- 不删除 `memoryMode` 三选一；
- 不迁移所有 legacy 模块内部的请求体组装。

这些内容分别留给 v0.9.1 和 v0.10.x。

## 验收

1. `invokeTask()` 可以根据任务自动选择模型；
2. 总结模型失败后可以回退主模型；
3. 主聊天与旧 `fetchAiResponse()` 都经过 Runtime 执行请求；
4. Trace 中包含 `taskType / taskId / routeId / fallbackIndex`；
5. 旧 API 设置和原有功能仍可运行；
6. Memory Brain 不得重新出现。
