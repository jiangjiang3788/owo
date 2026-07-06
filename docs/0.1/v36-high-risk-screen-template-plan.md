# V36：高风险 screen 静态模板拆分第一刀

## 目标

只把 `chat-room-screen`、`api-settings-screen`、`chat-settings-screen` 和 forum 相关 screen 的静态 HTML 从 `index.html` 移到对应 owner 文件，保持所有 DOM id 不变。

## Owner

| screen | owner file |
|---|---|
| `chat-room-screen` | `js/features/chat/chatRoomScreenTemplate.js` |
| `api-settings-screen` | `js/features/settings/settingsScreenTemplates.js` |
| `chat-settings-screen` | `js/features/settings/settingsScreenTemplates.js` |
| `forum-*` screen | `js/features/forum/forumScreenTemplates.js` |

## 禁止事项

- 不拆业务逻辑。
- 不绑定事件。
- 不改 `chat_ai.js`。
- 不改 provider fetch / stream。
- 不改消息保存。
- 不改设置业务和论坛业务。
- `screenTemplateRegistry` 不接管 `.screen.active` 切换。

## 验收

```bash
node tools/screen-template-gate.js
node tools/screen-registry-gate.js
node tools/feature-integration-gate.js
node tools/memory-regression-gate.js
node tools/arch-check.js
```

浏览器中检查：

```js
window.OwoApp.app.screenTemplates.getRoutingReport()
```

`pendingPlaceholders` 应为空，且 `templateIds` 应包含 V35 + V36 的全部模板 screen。
