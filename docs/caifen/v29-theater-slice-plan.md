# V29：theater 垂直切片第一刀

目标：只拆小剧场的 scene/model/prompt semantics 和 service，不改 `chat_ai.js`、不改 forum、不改消息发送、不改 stream。

## 新 owner

| 文件 | 角色 | 职责 |
|---|---|---|
| `js/core/theater/sceneSemantics.js` | semantics | 模式、列表 key、场景归一化、排序、占位符替换、生成内容清理 |
| `js/core/theater/promptSemantics.js` | semantics | 手动生成和角色主动生成的小剧场 prompt pieces |
| `js/features/theater/model.js` | model | 小剧场场景列表、提示词预设列表、增删改查 |
| `js/features/theater/promptService.js` | service | 绑定运行时 state，组装 manual / character theater generation request |
| `js/features/theater/public.js` | public facade | 只导出稳定 API 和 routing report |

## 不做

- 不改 `js/modules/chat_ai.js`。
- 不改 provider fetch / stream / `processStream`。
- 不改 forum。
- 不改聊天消息发送。
- 不迁移小剧场 DOM renderer / modal / 分享 UI。
- 不迁移 `callChatCompletion()` 的请求发送路径。

## 单一路径规则

旧 `js/modules/theater.js` 仍保留 DOM、事件和 AI 请求编排，但：

- scene 语义走 `OwoApp.core.theater.sceneSemantics`。
- prompt pieces 走 `OwoApp.core.theater.promptSemantics`。
- scene list / prompt preset list 走 `OwoApp.features.theater.model`。
- prompt runtime context 走 `OwoApp.features.theater.promptService`。

旧入口继续可用，但不能再把这些语义写回 `theater.js`。

## 验收

```js
window.OwoApp.core.theater.sceneSemantics
window.OwoApp.core.theater.promptSemantics
window.OwoApp.features.theater.model
window.OwoApp.features.theater.promptService
window.OwoApp.features.theater.publicApi.getRoutingReport()
```

手工 smoke：

1. 打开小剧场列表。
2. 纯文字模式生成剧情。
3. HTML 模式生成剧情。
4. 绑定角色、人设、世界书、聊天记录和日记上下文后生成剧情。
5. 角色主动小剧场仍能触发。
6. 小剧场分享卡片和系统通知仍正常。
7. 导出、编辑、收藏、删除仍正常。
8. forum 和私聊/群聊 AI 回复正常。
