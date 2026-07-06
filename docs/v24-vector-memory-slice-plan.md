# V24 vector memory 垂直切片第一刀

目标：只迁移 embedding adapter、vector memory model、context service，不改 `chat_ai.js` prompt 主编排，不改 vector memory UI DOM 细节。

## 新 owner

| 文件 | 角色 | 职责 |
|---|---|---|
| `js/platform/ai/embeddingAdapter.js` | adapter | embedding API provider 选择、endpoint/header/request/fetch、cosine similarity |
| `js/features/vectorMemory/model.js` | model | vector template store、`chat.vectorMemory` 状态、entry normalization、历史、自动总结游标 |
| `js/features/vectorMemory/contextService.js` | service | query 构造、fallback 召回、embedding 检索、context block 构建和缓存 |
| `js/features/vectorMemory/public.js` | public facade | 暴露 routing report 和稳定 API，不写业务逻辑 |

## 保持不变

- 不修改 `chat_ai.js`。
- 不修改 prompt 主编排。
- 不修改 stream / fetch 聊天请求。
- 不修改 vector memory DOM 渲染和转换弹窗。
- 不修改保存路径。
- Netlify 仍然直接发布。

## 验收

```js
window.OwoApp.platform.ai.embeddingAdapter
window.OwoApp.features.vectorMemory.model
window.OwoApp.features.vectorMemory.contextService
window.OwoApp.features.vectorMemory.publicApi.getRoutingReport()
window.ensureVectorMemoryState === window.OwoApp.features.vectorMemory.model.ensureVectorMemoryState // 可能为 false，因为 legacy wrapper 注入 state，但 owner 应显示在 compat registry
window.OwoApp.compat.registry.getVectorMemoryContextBlock.owner
```

手工 smoke：

1. 打开向量记忆页。
2. 新增手动向量记忆。
3. 手动总结一段消息生成向量记忆。
4. 切换到 vector memory 模式，私聊 AI 回复能包含向量上下文。
5. 自动总结开关、重试、更新到最新正常。
6. 导入/导出向量模板和记忆包正常。
7. 日记/表格与向量转换入口仍可用。
