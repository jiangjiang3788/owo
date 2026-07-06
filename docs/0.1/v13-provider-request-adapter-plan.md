# V13：AI provider request / endpoint / header adapter

## 目标

把 `chat_ai.js` 中重复出现的 provider request 组装逻辑迁到：

```text
js/platform/ai/providerRequestAdapter.js
```

本版只收口：

- endpoint 组装
- headers 组装
- requestBody 组装
- `fetch()` options 组装
- web search payload 合并

本版明确不迁移：

- `fetch()` 调用本身
- `processStream()`
- 非流式响应解析
- prompt builder
- `normalizeMessagesForProvider()`

## 新 owner

```text
OwoApp.platform.ai.providerRequestAdapter
```

主要 API：

| API | 职责 |
|---|---|
| `buildEndpoint()` | 根据 provider / stream 组装 OpenAI-like 或 Gemini endpoint |
| `buildHeaders()` | 根据 provider 组装 headers |
| `buildJsonPostRequest()` | 返回 `{ endpoint, headers, requestBody, fetchOptions }` |
| `buildOpenAiChatRequest()` | 组装 OpenAI-like chat completion 请求 |
| `buildGeminiContentRequest()` | 组装 Gemini contents 请求 |
| `buildMessageCompletionRequest()` | 组装通话类 message completion 请求 |
| `buildPromptCompletionRequest()` | 组装 prompt-only completion 请求 |
| `buildImageDescriptionRequest()` | 组装图片描述请求 |
| `applyWebSearchPayload()` | 合并联网搜索 payload 或默认 tools |

## 防两套路径规则

1. `chat_ai.js` 不再内联 `/v1/chat/completions`、Gemini `generateContent` endpoint、Authorization header。
2. `providerRequestAdapter.js` 不允许 `fetch()`，也不允许处理 stream。
3. `providerRequestAdapter.js` 不暴露旧 `window` API，不保存数据。
4. `chat_ai.js` 继续持有 `fetch()` 和 `processStream()`，避免 V13 同时改网络发送和 stream 解析。

## 验收

```bash
node --check js/platform/ai/providerRequestAdapter.js
node --check js/modules/chat_ai.js
node tools/arch-check.js
```

浏览器 smoke：

1. 主聊天 OpenAI-like provider 可回复。
2. 主聊天 Gemini provider 可回复。
3. 联网搜索自定义 payload 仍可合并。
4. 图片描述仍可生成。
5. 通话回复和通话总结仍可用。
