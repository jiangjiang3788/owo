# V5：Dexie adapter shell 版

## 目标

把 `db.js` 中最低风险的 Dexie 初始化、schema 注册、旧 storage 表迁移逻辑迁到 `platform/storage`，但不复制保存 writer，不改 `loadData` 的运行时修复逻辑。

## 修改清单

| 序号 | 修改性质 | 性价比 | 进度 | 修改原因 | 涉及文件 | 用时 | 危险性 | 验收标准 | 最小 MVP 标准 |
|---:|---|---|---|---|---|---|---|---|---|
| 1 | 新增 Dexie migration owner | A | V5-1 | `db.js` 不应继续拥有 schema upgrade 数据映射 | `js/platform/storage/dexieMigrations.js` | S/M | 中 | V2 旧 `storage` 表迁移逻辑只在该文件存在 | 旧 IndexedDB v1 数据仍可迁移 |
| 2 | 新增 Dexie adapter owner | A+ | V5-2 | Dexie 实例创建和 version/stores 属于 platform/storage | `js/platform/storage/dexieAdapter.js` | S | 中 | `db.js` 不再 `new Dexie` / `version().stores()` | `initDatabase()` 后 `dexieDB` 仍可用 |
| 3 | 旧 `initDatabase` 改成兼容 facade | A+ | V5-3 | 保持老调用可用，但真正 schema owner 迁走 | `js/db.js` | S | 中 | `window.initDatabase` 通过 `compat.expose` 暴露 | `main.js` 中裸 `initDatabase()` 不用改 |
| 4 | script 顺序固定 | A | V5-4 | migrations 必须先于 adapter，adapter 必须先于 db | `index.html` | S | 中低 | `dexieMigrations.js` → `dexieAdapter.js` → `db.js` | 页面启动无新增错误 |
| 5 | arch-check 加 gate | A+ | V5-5 | 防止以后把 `new Dexie` 写回 `db.js` | `tools/arch-check.js` | S/M | 低 | 发现 `db.js` 中 `new Dexie` 或 `version().stores()` 直接报错 | `node tools/arch-check.js` 通过 |

## 单一路径原则

V5 后数据库初始化路径是：

```text
旧调用 initDatabase()
  -> OwoApp.platform.storage.dexieAdapter.initDatabase()
  -> createDatabase()
  -> register schema / migration
  -> 回填 legacy dexieDB
```

保存路径没有变化：

```text
saveData()
  -> OwoApp.platform.storage.repository.saveData()
  -> js/db.js private legacySaveDataImpl()
```

这避免了 “adapter 写一套、db.js 再写一套” 的双路径问题。

## 不做什么

- 不拆 `loadData()` 的字段修复。
- 不拆 localStorage 旧数据迁移。
- 不改 `dexieDB.characters / groups / worldBooks` 的旧直接访问。
- 不复制 `legacySaveDataImpl`。
- 不引入构建工具或 TypeScript。

## 验收

```bash
node --check js/platform/storage/dexieMigrations.js
node --check js/platform/storage/dexieAdapter.js
node --check js/db.js
node --check tools/arch-check.js
node tools/arch-check.js
```

浏览器初始化后：

```js
window.OwoApp.platform.storage.dexieAdapter.getCurrentDatabase()
window.OwoApp.platform.storage.repository.getWriterMeta()
```

`getCurrentDatabase()` 应返回 Dexie 实例；writer meta 仍应指向 `js/db.js`。
