# V16：chat render/view 拆分计划

## 目标

只抽出聊天消息渲染入口和 view model owner，不修改消息保存、AI 请求和 stream 解析。

## 新 owner

```text
js/features/chat/messageViewModel.js
js/features/chat/renderMessageBubble.js
```

## 路径变化

V15 前：

```text
renderMessages()
  -> createMessageBubbleElement()
  -> chat_render.js DOM 实现
```

V16 后：

```text
renderMessages()
  -> renderMessageBubble()
  -> OwoApp.features.chat.renderMessageBubble.renderMessageBubble()
  -> OwoApp.features.chat.messageViewModel.createMessageViewModel()
  -> js/modules/chat_render.js::legacyCreateMessageBubbleElement()
```

旧外部调用仍可使用：

```text
createMessageBubbleElement()
  -> renderMessageBubble()
```

## 边界

- `messageViewModel.js` 只做展示前数据归一化，不碰 DOM 保存和 AI。
- `renderMessageBubble.js` 只做 facade 和 legacy renderer 注册，不复制 DOM 卡片细节。
- `chat_render.js` 的 DOM 细节后续再按卡片类型拆分。
- 本版不修改 `saveData`、`fetchAiResponse`、`processStream`、prompt builder。

## 验收

```bash
node --check js/features/chat/messageViewModel.js
node --check js/features/chat/renderMessageBubble.js
node --check js/modules/chat_render.js
node tools/arch-check.js
```

浏览器控制台：

```js
window.OwoApp.features.chat.messageViewModel
window.OwoApp.features.chat.renderMessageBubble
typeof createMessageBubbleElement === 'function'
```
