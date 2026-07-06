# V8：备份 / 导入导出 adapter 拆分版

## 目标

V8 继续收口存储相关逻辑，但不迁移保存 writer，不改变备份文件格式。

本版只移动 ownership：

- `.ee` 备份数据结构、完整导出、分类导出、完整恢复、分类导入归 `js/platform/storage/backupAdapter.js`。
- gzip 压缩、解压、Blob 下载、File 读取、base64 编码归 `js/platform/browser/fileAdapter.js`。
- `js/modules/tutorial.js` 只保留按钮交互、GitHub UI 和 compatibility alias。

## 新路径

```text
备份按钮
  -> createFullBackupData()
  -> OwoApp.platform.storage.backupAdapter.legacyBackupApi.createFullBackupData()
  -> OwoApp.platform.browser.fileAdapter.downloadCompressedJson()
```

```text
导入数据
  -> OwoApp.platform.browser.fileAdapter.readCompressedJsonFile(file)
  -> importBackupData(data)
  -> OwoApp.platform.storage.backupAdapter.legacyBackupApi.importBackupData(data)
  -> saveData(db)
  -> OwoApp.platform.storage.repository.saveData()
  -> js/db.js::legacySaveDataImpl()
```

## 防两套路径规则

- 不复制 `saveData`。
- 不新增第二套 IndexedDB writer。
- `backupAdapter` 只能通过注入的 `saveData` 入口保存。
- `fileAdapter` 不能接触 `db`、Dexie 或业务数据格式。
- `tutorial.js` 不再直接使用 `CompressionStream`、`DecompressionStream`、`FileReader`。
- 旧全局函数只通过 `OwoApp.compat.expose()` 暴露。

## V8 验收

```bash
node --check js/platform/browser/fileAdapter.js
node --check js/platform/storage/backupAdapter.js
node --check js/modules/tutorial.js
node --check tools/arch-check.js
node tools/arch-check.js
```

浏览器控制台可检查：

```js
window.createFullBackupData === window.OwoApp.platform.storage.backupAdapter.legacyBackupApi.createFullBackupData
window.importBackupData === window.OwoApp.platform.storage.backupAdapter.legacyBackupApi.importBackupData
```

## 不做

- 不改变 `.ee` 文件格式。
- 不改变 GitHub 备份仓库结构。
- 不拆 GitHub Manager。
- 不迁移 `saveData` writer。
- 不清理 `settings.js` / `chat_ai.js` 等大文件。
