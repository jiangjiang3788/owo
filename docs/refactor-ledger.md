# Refactor Ledger

用于记录每个旧全局符号的唯一 owner，避免重构期间出现两套路径。

## 状态说明

| 状态 | 含义 |
|---|---|
| `legacy-owner` | 旧文件仍是唯一实现，不允许新建同义实现 |
| `migrating` | 正在迁移，必须同一次改动完成转发和验收 |
| `canonical` | 新模块是唯一实现，旧路径只兼容转发 |
| `compat-only` | 旧 API 仅为了老调用保留，不允许新代码调用 |
| `remove-later` | 等调用清零后删除 |

## V1 已登记

| 符号 | canonical owner | legacy alias | 状态 | 说明 |
|---|---|---|---|---|
| `pad` | `OwoApp.shared.utils.pad` | `window.pad` | `canonical` | V1 pilot，验证单一路径迁移方式 |
| `showToast` | `js/utils.js` | `window.showToast` | `legacy-owner` | 暂不迁移，避免 UI 行为风险 |
| `saveData` | `js/db.js` / `js/main.js` 保存保护包装 | `window.saveData` | `legacy-owner` | 暂不迁移，存储路径后续单独拆 |
| `normalizeMessagesForProvider` | `js/utils.js` | 全局函数 | `legacy-owner` | 后续应迁到 `platform/ai`，V1 不新建同义实现 |

## V1 风险观察

这些符号存在多次 window 赋值或跨文件覆盖风险，第一版先登记，不直接改业务：

| 符号 | 文件 | V1 处理 |
|---|---|---|
| `_searchScrollToMessageId` | `js/chat.js`、`js/modules/search.js` | 后续收口到 search feature |
| `_theaterDetailFromChat` | `js/modules/chat_render.js`、`js/modules/theater.js` | 后续收口到 theater feature facade |
| `openStatusBarEditor` | `js/modules/more_menu.js` | 同文件多次赋值，后续转为 settings/statusBar facade |
| `deleteStatusBarPreset` | `js/modules/more_menu.js` | 同上 |
