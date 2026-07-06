# V14：chat message semantics/model 收口版

## 目标

只迁移消息 `role / content / parts` 的纯归一化能力，不改 prompt builder，不改 fetch，不改 stream。

## 新增 owner

```text
js/core/chat/messageSemantics.js
OwoApp.core.chat.messageSemantics
```

## 迁移内容

| 符号 | 新 owner | legacy 入口 |
|---|---|---|
| `aiMessageContentToText` | `OwoApp.core.chat.messageSemantics.aiMessageContentToText` | `window.aiMessageContentToText` |
| `wrapSystemMessageForCompat` | `OwoApp.core.chat.messageSemantics.wrapSystemMessageForCompat` | `window.wrapSystemMessageForCompat` |
| `mergeAdjacentCompatMessages` | `OwoApp.core.chat.messageSemantics.mergeAdjacentCompatMessages` | `window.mergeAdjacentCompatMessages` |
| `normalizeMessagesForProvider` | `OwoApp.core.chat.messageSemantics.normalizeMessagesForProvider` | `window.normalizeMessagesForProvider` |
| `openAiMessagesToGeminiContents` | `OwoApp.core.chat.messageSemantics.openAiMessagesToGeminiContents` | `providerRequestAdapter.js` 消费 |

## 保持不变

- `fetch()` 仍在 `chat_ai.js`。
- `processStream()` 仍在 `chat_ai.js`。
- 非流式响应解析不改。
- 主聊天 prompt builder 不改。
- Gemini 主聊天 `contents` 构造不改。
- 旧模块仍可调用 `normalizeMessagesForProvider()`。

## 防两套路径

`utils.js` 删除原函数实现，只保留：

```js
const normalizeMessagesForProvider = window.OwoApp.core.chat.messageSemantics.normalizeMessagesForProvider;
```

并通过 `OwoApp.compat.expose()` 暴露旧 `window.normalizeMessagesForProvider`。

`providerRequestAdapter.js` 不再保留 `openAiPartToGeminiPart / openAiMessagesToGeminiContents / collectSystemInstruction` 的实现，只消费 core owner。

## 验收

```bash
node --check js/core/chat/messageSemantics.js
node --check js/platform/ai/providerRequestAdapter.js
node --check js/modules/chat_ai.js
node --check js/utils.js
node tools/arch-check.js
```

浏览器控制台：

```js
window.normalizeMessagesForProvider === window.OwoApp.core.chat.messageSemantics.normalizeMessagesForProvider
window.OwoApp.platform.ai.providerRequestAdapter.openAiMessagesToGeminiContents === window.OwoApp.core.chat.messageSemantics.openAiMessagesToGeminiContents
```
