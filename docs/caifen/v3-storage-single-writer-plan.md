# V3：存储单写路径准备版

## 目标

在不大拆 `db.js` 的前提下，先解决存储重构最危险的问题：保存入口散落、`main.js` 额外包装 `window.saveData`、后续容易出现双写。

V3 完成后：

```js
window.saveData === window.OwoApp.platform.storage.repository.saveData
window.saveCharacter === window.OwoApp.platform.storage.repository.saveCharacter
window.saveGroup === window.OwoApp.platform.storage.repository.saveGroup
window.saveGlobalSettings === window.OwoApp.platform.storage.repository.saveGlobalSettings
```

实际 Dexie 写入仍在 `js/db.js` 的 private writer 中，并且只能注册一次：

```js
storageRepository.setLegacyWriters(...)
```

## 为什么不是直接把 db.js 全搬走

`db.js` 同时包含：

- 默认数据
- Dexie 初始化和迁移
- 全量保存
- 单角色/单群组保存
- 全局设置保存
- load 后的数据补齐迁移
- 存储分析

如果一版里全部搬到 `platform/storage`，极容易形成新旧双写。V3 只收口公开入口，不复制保存实现。

## V3 修改点

| 文件 | 修改 |
|---|---|
| `js/app/namespace.js` | 增加 `OwoApp.platform.storage` |
| `js/platform/storage/repository.js` | 新增 storage repository，负责公开保存入口、writer 注册、保存中状态 |
| `js/db.js` | 将原保存函数改名为 private writer，并注册到 repository；旧 window API 只兼容转发 |
| `js/main.js` | 删除对 `window.saveData` 的二次包装，改用 repository 的 `isSaving()` |
| `tools/ownership-map.json` | 登记保存 API 的 canonical public owner |
| `tools/arch-check.js` | 增加 storage single-writer gate |
| `index.html` | 在 `js/db.js` 前加载 `js/platform/storage/repository.js` |

## 验收

```bash
node --check js/platform/storage/repository.js
node --check js/db.js
node --check js/main.js
node --check tools/arch-check.js
node tools/arch-check.js
```

浏览器控制台检查：

```js
window.saveData === window.OwoApp.platform.storage.repository.saveData
window.saveCharacter === window.OwoApp.platform.storage.repository.saveCharacter
window.saveGroup === window.OwoApp.platform.storage.repository.saveGroup
window.saveGlobalSettings === window.OwoApp.platform.storage.repository.saveGlobalSettings
window.OwoApp.platform.storage.repository.getWriterMeta()
```

## 下一版允许做什么

V4 可以开始拆 `db.js`：

1. `app/state/defaults.js`
2. `platform/storage/dexieAdapter.js`
3. `platform/storage/migrations.js`
4. `platform/storage/loadRepair.js`

但仍然必须保持单写：写 IndexedDB 的函数只能由 repository 暴露。
