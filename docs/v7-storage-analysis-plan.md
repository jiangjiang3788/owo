# V7：storage analysis 拆分计划

## 目标

把 `js/db.js` 末尾的 `dataStorage.getStorageInfo()` 存储占用分析迁移到 `js/platform/storage/storageAnalysis.js`。

本版只移动读模型和纯计算，不移动保存 writer，不改变 Netlify 直接发布路径。

## Ownership

| 文件 | 职责 |
|---|---|
| `js/platform/storage/storageAnalysis.js` | 存储占用分类计算 owner，提供 `computeStorageInfo / createDataStorage / bindDataStorage` |
| `js/db.js` | 只绑定旧运行时 `db` 和 `loadData`，保留 `dataStorage` lexical alias |
| `tools/ownership-map.json` | 登记 `dataStorage` canonical owner |
| `tools/arch-check.js` | 阻断 `db.js` 重新拥有 storage analysis 实现 |

## 不做

- 不迁移 `saveData / saveCharacter / saveGroup / saveGlobalSettings`。
- 不把 `dataStorage` 改成第二套 window API。
- 不读写 Dexie。
- 不改 `js/modules/storage.js` 的旧调用。
- 不改变 Netlify 直接发布配置。

## 验收

```bash
node --check js/platform/storage/storageAnalysis.js
node --check js/db.js
node --check tools/arch-check.js
node tools/arch-check.js
```

浏览器控制台应满足：

```js
typeof dataStorage.getStorageInfo === 'function'
window.OwoApp.platform.storage.storageAnalysis.dataStorage === dataStorage
```

## 回滚方式

如果存储分析页面出现问题，可以回滚本版 patch；保存路径和 Dexie writer 不受影响。
