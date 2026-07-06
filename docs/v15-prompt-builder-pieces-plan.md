# V15：prompt builder pieces / context 收口版

## 目标

V15 只迁移 prompt builder 的可复用片段和上下文组装，不改 `fetch()`、`processStream()`、非流式响应解析，也不整体搬迁 `generatePrivateSystemPrompt()`。

## 新 owner

```text
js/core/chat/promptContext.js
js/core/chat/promptPieces.js
js/core/chat/promptSemantics.js
```

- `promptContext.js`：世界书上下文、peek 摘要、用户手机状态等上下文片段。
- `promptPieces.js`：人设选择、线上规则、输出格式、额外格式、token 估算等 prompt 片段。
- `promptSemantics.js`：facade，只聚合 context 和 pieces，不写业务逻辑。

## 保持不变

- `chat_ai.js` 继续保留主 prompt builder 编排。
- 不改 AI 请求发送路径。
- 不改 stream 解析。
- 不改 prompt 注入顺序。
- 不改私聊 / 群聊的 fetch 主链路。

## 防两套路径规则

1. `chat_ai.js` 只能保留 wrapper，不能重新实现已迁移的 prompt pieces。
2. `core/chat` 文件禁止访问 DOM、storage、fetch、stream 和 compat facade。
3. prompt context 需要运行时数据时只能通过依赖注入 `{ state }` 获取内存快照。
4. 瞬时状态消费，例如 `phoneControlLastReadResult`，由 `chat_ai.js` wrapper 负责删除字段，core 只返回消费清单。

## 验收

```bash
node --check js/core/chat/promptContext.js
node --check js/core/chat/promptPieces.js
node --check js/core/chat/promptSemantics.js
node --check js/modules/chat_ai.js
node tools/arch-check.js
```

手工 smoke：私聊、带世界书、带表情包、带图库、生图格式、peek 感知、手机操控结果、节点模式 prompt 均能正常生成。
