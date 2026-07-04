# V4：状态默认值第一刀 + Netlify 静态发布

V4 目标：继续遵守“两入口一实现 / 单一路径”原则，先拆 `db.js` 中最低风险的默认状态，不碰 Dexie migration、`loadData` 修复逻辑和真正写入逻辑。

## 本版新增 owner

| owner | 文件 | 职责 | 禁止内容 |
|---|---|---|---|
| `OwoApp.app.state.constants` | `js/app/state/constants.js` | `defaultWidgetSettings`、`DEFAULT_COT_PRESETS`、`globalSettingKeys` 等跨旧脚本共享常量 | Dexie、localStorage、DOM、保存逻辑 |
| `OwoApp.app.state.initialState.createInitialDbState` | `js/app/state/initialState.js` | 创建初始内存 `db` 形状 | 读取旧数据、修复旧数据、写 IndexedDB |
| `OwoApp.app.state.globalSettingsDefaults.createDefaultGlobalSettings` | `js/app/state/globalSettingsDefaults.js` | 创建全局设置默认值表 | 读取 `settingsArray`、写 `db`、平台持久化 |
| Netlify static build | `tools/netlify-build.js`、`netlify.toml` | 架构检查后复制静态站点到 `dist/` | bundle、转译、生成第二套运行时代码 |

## 防止两套路径的规则

1. `js/db.js` 不再声明 `defaultWidgetSettings`、`DEFAULT_COT_PRESETS`、`globalSettingKeys`。
2. `js/db.js` 不再内联 `var db = { ... }` 初始对象。
3. `js/db.js` 不再内联 `const defaultValue = { ... }` 全局设置默认值表。
4. `db.js` 仍然保留 Dexie 初始化、migration、load repair 和 V3 private writer；这些不能在 V4 复制到新文件。
5. `index.html` 必须先加载 `js/app/state/*.js`，再加载 `js/db.js`。
6. Netlify 构建只生成 `dist/` 静态复制产物，不能引入 Vite/React/TS 或另一套路由系统。

## Netlify 发布路径

```text
Netlify build command
  ↓
node tools/arch-check.js
  ↓
node tools/netlify-build.js
  ↓
dist/
  index.html
  _redirects
  sw.js
  manifest.json
  css/
  js/
```

`_redirects` 仍保留在项目根目录，由 `tools/netlify-build.js` 复制到 `dist/`，用于 SPA fallback。

## V4 不做

- 不拆 Dexie `initDatabase()`。
- 不拆 Dexie version upgrade migration。
- 不拆 `loadData()` 内的数据修复和旧 localStorage 迁移。
- 不拆 `dataStorage` 存储分析工具。
- 不改 API key 保存方式。
- 不新建第二套保存或加载路径。

## 验收

```bash
node --check js/app/state/constants.js
node --check js/app/state/initialState.js
node --check js/app/state/globalSettingsDefaults.js
node --check js/db.js
node --check tools/netlify-build.js
node tools/arch-check.js
node tools/netlify-build.js
```

浏览器控制台应满足：

```js
window.OwoApp.app.state.constants.globalSettingKeys === globalSettingKeys
typeof window.OwoApp.app.state.initialState.createInitialDbState === 'function'
typeof window.OwoApp.app.state.globalSettingsDefaults.createDefaultGlobalSettings === 'function'
Array.isArray(db.characters)
```
