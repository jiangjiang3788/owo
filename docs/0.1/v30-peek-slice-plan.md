# V30：peek 垂直切片第一刀

## 目标

只迁移偷看手机模块中的三类低耦合逻辑：

1. XML parse 纯语义。
2. 消息会话 normalize 纯语义。
3. 手机应用列表 / 设置默认值 / 刷新范围 / 生成结果校验 model。

本版不改：

- `js/modules/chat_ai.js`
- `js/modules/theater.js`
- provider fetch / stream / `processStream`
- 偷看消息发送、代发、NPC 回复请求
- DOM renderer 和各子应用页面 UI

## 新 owner

| owner | 文件 | 职责 |
|---|---|---|
| `OwoApp.core.peek.xmlSemantics` | `js/core/peek/xmlSemantics.js` | XML result 解析、文本值 coercion、list flatten |
| `OwoApp.core.peek.conversationSemantics` | `js/core/peek/conversationSemantics.js` | `partnerId`、`suspicionLevel`、好友状态、history 的会话归一化 |
| `OwoApp.features.peek.phoneAppModel` | `js/features/peek/phoneAppModel.js` | 偷看手机 app model、默认设置、刷新条数、生成数据校验、viewed snapshot |
| `OwoApp.features.peek.publicApi` | `js/features/peek/public.js` | public facade，只导出稳定 API |

## 兼容策略

`js/modules/peek.js` 保留旧函数名：

- `parseXmlToJson()`
- `normalizePeekConversation()`
- `recordPeekViewedByUser()`

但它们只转发到 canonical owner。这样旧调用不需要立即修改，同时不会出现两套实现。

## 禁止事项

- `core/peek/*` 不允许出现 `window`、`document`、`fetch`、`localStorage`、`Dexie`、legacy state 或保存逻辑。
- `features/peek/phoneAppModel.js` 不允许操作 DOM、发起 provider 请求、处理 stream 或调用旧保存全局。
- `peek.js` 不允许重新内联 `DOMParser` XML 解析和 conversation 默认字段补齐。
- V30 不允许改 `chat_ai.js`、`theater.js` 和消息发送路径。

## 验收

```bash
node --check js/core/peek/xmlSemantics.js
node --check js/core/peek/conversationSemantics.js
node --check js/features/peek/phoneAppModel.js
node --check js/features/peek/public.js
node --check js/modules/peek.js
node tools/arch-check.js
node tools/memory-regression-gate.js
```

浏览器 smoke：

1. 打开偷看手机主屏。
2. 应用图标和自定义图标正常。
3. 打开消息列表，conversation 正常显示。
4. 刷新消息，AI XML 能解析并渲染。
5. 代发消息、NPC 回复、加好友流程仍正常。
6. 相册、备忘录、浏览器、钱包、时光想说等 app 刷新仍正常。
7. `chat_ai.js` 主 prompt 和小剧场不受影响。
