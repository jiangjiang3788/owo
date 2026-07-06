# V26：worldbook context builder 拆分

## 目标

只抽出世界书触发 / 注入位置语义和 context service：

- `js/core/memory/worldBookSemantics.js`
- `js/features/worldBook/contextService.js`
- `js/features/worldBook/public.js`

## 不做

- 不改 `chat_ai.js`。
- 不改主 prompt 输出顺序。
- 不改 `fetch` / stream / provider 请求。
- 不迁移 `js/modules/worldbook.js` 的 DOM、导入、拖拽、分类、持久化。
- 不碰 vector memory。

## 新路径

```text
chat_ai.js
  -> getActiveWorldBooksContents(character)
  -> OwoApp.core.chat.promptSemantics.getActiveWorldBooksContents()
  -> OwoApp.core.chat.promptContext.getActiveWorldBooksContents()
  -> OwoApp.features.worldBook.contextService.getActiveWorldBooksContents()
  -> OwoApp.core.memory.worldBookSemantics
```

## Ownership

| 文件 | 职责 |
|---|---|
| `core/memory/worldBookSemantics.js` | 纯世界书触发/注入语义：关联 ID、全局世界书、关键词触发、权重排序、position 分组 |
| `features/worldBook/contextService.js` | 用运行时 state snapshot 生成 `before/middle/after` context |
| `features/worldBook/public.js` | public facade 和 routing report |
| `core/chat/promptContext.js` | 保留兼容桥接，不再实现世界书触发算法 |

## 验收

```js
window.OwoApp.features.worldBook.publicApi.getRoutingReport()
typeof window.OwoApp.features.worldBook.contextService.getActiveWorldBooksContents
```

手工 smoke：

1. 带世界书角色私聊正常回复。
2. 全局世界书仍会注入。
3. `alwaysOn === false` 的条目只有命中关键词时注入。
4. before / middle / after 插入位置和旧版一致。
5. 离线节点优先使用 `offlineWorldBookIds`。
6. `chat_ai.js` 主 prompt 输出顺序不改变。
