# V25：journal/archive/favorites 记忆周边归属第一刀

## 目标

V25 只拆 `journal` 的纯语义和 service，不改 `chat_ai.js` prompt 主编排，不改 `vector_memory.js`，不迁移 archive / favorites 业务实现。

## Ownership

| 范围 | owner | 说明 |
|---|---|---|
| Journal 纯语义 | `OwoApp.core.memory.journalSemantics` | ID、range、导入项归一化、收藏 prompt pieces、排序筛选、XML 解析、合并 prompt pieces |
| Journal 状态服务 | `OwoApp.features.journal.service` | `chat.memoryJournals` 列表、手动新增、导入、删除、收藏、详情更新、自动总结游标 |
| Journal public facade | `OwoApp.features.journal.publicApi` | 只导出 routing report 和稳定 API |
| Legacy DOM / AI 编排 | `js/modules/journal.js` | 暂时保留 DOM 渲染、按钮绑定、生成/合并 API 调用、自动总结编排 shell |
| Archive | `js/modules/archive.js` | V25 只登记为 memory 周边 legacy-owner，暂不拆 |
| Favorites | `js/modules/favorites.js` | V25 只登记为 memory 周边 legacy-owner，暂不拆 |

## 不做事项

- 不修改 `js/modules/chat_ai.js`。
- 不修改 `js/modules/vector_memory.js`。
- 不重写生成日记 / 合并日记的 AI 请求路径。
- 不迁移 archive / favorites 的 UI 和存储逻辑。
- 不改变日记 JSON 导入导出格式。

## 防两套路径

`js/modules/journal.js` 现在只保留兼容 wrapper 和 DOM / AI 编排 shell：

```text
migrateJournalSettings() -> OwoApp.features.journal.service.migrateJournalSettings()
ensureAutoJournalState() -> OwoApp.features.journal.service.ensureAutoJournalState()
getAutoJournalCursorInfo() -> OwoApp.features.journal.service.getAutoJournalCursorInfo()
```

日记导入、手动新增、收藏、删除、详情更新、列表筛选排序、收藏 prompt pieces 已经复用 `journalSemantics/service`。

## 验收

```js
window.OwoApp.core.memory.journalSemantics
window.OwoApp.features.journal.service
window.OwoApp.features.journal.publicApi.getRoutingReport()
```

手工检查：

1. 打开回忆日记页面。
2. 手动新增日记。
3. 搜索日记。
4. 收藏 / 取消收藏。
5. 批量删除、批量导出、导入 JSON。
6. 合并多篇日记。
7. 自动总结开关、重试、总结到最新。
8. 私聊 AI 回复正常，vector memory 正常。
