# V6：loadData repair shell 版

## 目标

V6 只拆 `db.js` 中 `loadData()` 后半段的字段补齐、旧结构修复和旧 localStorage 迁移逻辑。

它不改保存入口，不复制 `saveData`，不改 Dexie schema。

## 新 owner

| 职责 | owner |
|---|---|
| 已读取表数据写回内存 db | `OwoApp.platform.storage.loadRepair.applyLoadedTables` |
| globalSettings 默认值合并 | `OwoApp.platform.storage.loadRepair.hydrateGlobalSettings` |
| 角色 / 群组 / 根状态字段补齐 | `OwoApp.platform.storage.loadRepair.repairLoadedData` |
| 旧 `gemini-chat-app-db` localStorage 迁移 | `OwoApp.platform.storage.loadRepair.migrateLegacyLocalStorage` |

## 单一路径规则

```text
loadData()
  -> 读 IndexedDB 表
  -> loadRepair.applyLoadedTables()
  -> loadRepair.hydrateGlobalSettings()
  -> loadRepair.repairLoadedData()
  -> loadRepair.migrateLegacyLocalStorage()
```

保存路径仍然是：

```text
saveData()
  -> OwoApp.platform.storage.repository.saveData()
  -> js/db.js private legacySaveDataImpl()
```

## 禁止事项

- `loadRepair.js` 不允许实现 `saveData`。
- `loadRepair.js` 不允许直接调用 `window.saveData`。
- `db.js` 不允许再保留 `Data integrity checks` 大段修复逻辑。
- `db.js` 不允许直接读取 `localStorage.getItem('gemini-chat-app-db')`。

## MVP 验收

```bash
node --check js/platform/storage/loadRepair.js
node --check js/db.js
node tools/arch-check.js
```

浏览器验收：

```js
window.OwoApp.platform.storage.loadRepair
window.OwoApp.platform.storage.repository.loadData
```

页面能打开，旧数据能加载，刷新后数据不丢。
