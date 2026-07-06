# V9 / V10：Storage Writer Owner Flip + db.js 收口完成版

## 目标

把阶段 2 的最后两步合并完成：

1. V9：将 IndexedDB 写入实现从 `js/db.js` 迁到 `js/platform/storage/dexieWriter.js`。
2. V10：将 `loadData` 读取编排、静态配置和运行时全局变量从 `js/db.js` 收口到明确 owner。

## 单写路径

```text
saveData()
  -> OwoApp.platform.storage.repository.saveData()
  -> OwoApp.platform.storage.dexieWriter.saveData()
  -> Dexie 写入
```

`js/db.js` 不再出现 `bulkPut()`、`globalSettings.put()` 或单表 `put()` 实现。

## 读取路径

```text
loadData()
  -> OwoApp.platform.storage.dexieReader.loadData()
  -> Dexie 读表
  -> OwoApp.platform.storage.loadRepair.*
```

## 文件职责

| 文件 | 职责 |
|---|---|
| `js/platform/storage/dexieWriter.js` | 唯一 IndexedDB writer |
| `js/platform/storage/dexieReader.js` | IndexedDB 读取编排 |
| `js/app/state/staticConfigBase.js` | 静态配置基础常量 |
| `js/app/state/updateLogRecent.js` | 更新日志近期分片 |
| `js/app/state/updateLogArchive.js` | 更新日志历史分片 |
| `js/app/state/staticConfig.js` | 静态配置聚合和 OwoApp 注册 |
| `js/app/state/runtimeGlobals.js` | legacy runtime globals |
| `js/db.js` | compatibility shell |

## 验收

```bash
node tools/arch-check.js
node tools/netlify-build.js
```

浏览器控制台：

```js
window.saveData === window.OwoApp.platform.storage.repository.saveData
window.OwoApp.platform.storage.repository.getWriterMeta().owner === 'OwoApp.platform.storage.dexieWriter'
typeof loadData === 'function'
Array.isArray(updateLog)
Array.isArray(db.characters)
```
