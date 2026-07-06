# V38：legacy globals deprecation 收口

V38 是当前主重构计划的收尾版。它不删除任何旧 `window.*` 兼容入口，只把已经有 canonical owner 的旧全局路径标记为 deprecated，并通过 gate 阻止新结构代码继续直接调用旧全局。

## Ownership

- Canonical owner 仍以 `tools/ownership-map.json` 为准。
- Runtime deprecation registry：`OwoApp.app.legacyDeprecation`。
- 旧入口暴露仍使用 `OwoApp.compat.expose()`。
- `OwoApp.compat.expose()` 默认把暴露的 `window.*` 记录为 `deprecated: true`。

## 允许

- legacy 文件继续保留旧函数名，服务历史 onclick、旧脚本和外部用户脚本。
- 旧入口通过 `OwoApp.compat.expose()` 暴露。
- 浏览器控制台可以查询 `OwoApp.app.legacyDeprecation.getDeprecationReport()`。

## 禁止

- 新结构文件直接调用 `window.saveData`、`global.showToast`、`window.normalizeMessagesForProvider` 等旧全局。
- legacy 文件继续使用 `window.xxx = fn` 直接赋值暴露已迁移 symbol。
- `legacyDeprecation.js` 承载业务逻辑、保存、fetch、stream。

## Gate

```bash
node tools/legacy-globals-gate.js
node tools/arch-check.js
```

## V38 不做什么

- 不删除旧全局入口。
- 不引入 ESM / Vite / TypeScript。
- 不重写业务逻辑。
- 不修改 Netlify 直发配置。

## 浏览器验收

```js
window.OwoApp.app.legacyDeprecation.getDeprecationReport()
window.OwoApp.app.legacyDeprecation.isDeprecatedGlobal('saveData')
window.saveData === window.OwoApp.platform.storage.repository.saveData
```
