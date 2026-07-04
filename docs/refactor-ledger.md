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

## V2 已迁移

| 符号 | canonical owner | legacy alias | 状态 | 说明 |
|---|---|---|---|---|
| `getRandomValue` | `OwoApp.shared.utils.getRandomValue` | `window.getRandomValue` | `canonical` | 只处理逗号分隔值随机选择，不包含 API provider 语义 |
| `generateUUID` | `OwoApp.shared.utils.generateUUID` | `window.generateUUID` | `canonical` | 通用 ID 生成 |
| `getLocalTimeInTimezone` | `OwoApp.shared.utils.getLocalTimeInTimezone` | `window.getLocalTimeInTimezone` | `canonical` | 通用时区格式化 |
| `formatTimeDivider` | `OwoApp.shared.utils.formatTimeDivider` | `window.formatTimeDivider` | `canonical` | 通用时间展示格式化 |
| `getFormattedTimestamp` | `OwoApp.shared.utils.getFormattedTimestamp` | `window.getFormattedTimestamp` | `canonical` | 通用时间戳格式化 |
| `formatTimeGap` | `OwoApp.shared.utils.formatTimeGap` | `window.formatTimeGap` | `canonical` | 通用时长格式化 |
| `showAppConfirmDialog` | `OwoApp.shared.ui.showAppConfirmDialog` | `window.showAppConfirmDialog` | `canonical` | 通用确认弹窗，不含业务保存逻辑 |
| `compressImage` | `OwoApp.platform.browser.compressImage` | `window.compressImage` | `canonical` | 浏览器图片压缩，连接 FileReader/Image/Canvas |
| `showSystemNotification` | `OwoApp.platform.browser.showSystemNotification` | `window.showSystemNotification` | `canonical` | 浏览器通知和 Service Worker postMessage 适配 |

## V2 继续保持 legacy-owner

| 符号 | 当前 owner | 状态 | 暂不迁移原因 |
|---|---|---|---|
| `showToast` | `js/utils.js` | `legacy-owner` | 包含队列和 DOM 状态，后续作为 shared UI 单独迁移 |
| `triggerHapticFeedback` | `js/utils.js` | `legacy-owner` | 读取 `db.hapticEnabled`，不能直接塞进 platform |
| `saveData` | `js/db.js` / `js/main.js` 保存保护包装 | `legacy-owner` | 存储路径必须单写，不能在 V2 双写 |
| `normalizeMessagesForProvider` | `js/utils.js` | `legacy-owner` | 影响 AI provider 请求体，等 V3 provider adapter 一起迁移 |
| `fetchAiResponse` | `js/utils.js` | `legacy-owner` | 网络请求和 stream 处理风险高，等 V3 统一收口 |
| `writeOvoPngMetadata` | `js/utils.js` | `legacy-owner` | 含应用 PNG metadata 格式，后续拆 image/platform 时单独审查 |
| `readOvoPngMetadata` | `js/utils.js` | `legacy-owner` | 同上 |

## V3 已登记

| 符号 | canonical public owner | private writer | legacy alias | 状态 | 说明 |
|---|---|---|---|---|---|
| `saveData` | `OwoApp.platform.storage.repository.saveData` | `js/db.js::legacySaveDataImpl` | `window.saveData` | `canonical public / legacy private writer` | V3 不复制 Dexie 写入实现，只把公开入口和保存状态收口到 repository |
| `saveCharacter` | `OwoApp.platform.storage.repository.saveCharacter` | `js/db.js::legacySaveCharacterImpl` | `window.saveCharacter` | `canonical public / legacy private writer` | 单角色写入仍只有一个 writer |
| `saveGroup` | `OwoApp.platform.storage.repository.saveGroup` | `js/db.js::legacySaveGroupImpl` | `window.saveGroup` | `canonical public / legacy private writer` | 单群组写入仍只有一个 writer |
| `saveGlobalSettings` | `OwoApp.platform.storage.repository.saveGlobalSettings` | `js/db.js::legacySaveGlobalSettingsImpl` | `window.saveGlobalSettings` | `canonical public / legacy private writer` | 全局设置写入仍只有一个 writer |

V3 的重点不是把 `db.js` 清空，而是先让所有保存入口通过一个 repository 门面，且 writer 只能注册一次。下一版再拆 defaults / migrations / Dexie adapter 时，不能新建第二套写入路径。

## V4 已登记

| 符号 / 状态块 | canonical owner | legacy 使用点 | 状态 | 说明 |
|---|---|---|---|---|
| `defaultWidgetSettings` | `OwoApp.app.state.constants.defaultWidgetSettings` | 旧脚本全局 lexical `defaultWidgetSettings` | `canonical` | 从 `db.js` 移出，仍保留旧脚本可直接读的全局常量名 |
| `DEFAULT_COT_PRESETS` | `OwoApp.app.state.constants.DEFAULT_COT_PRESETS` | 旧脚本全局 lexical `DEFAULT_COT_PRESETS` | `canonical` | 用于初始 db 和设置默认值，不允许在 `db.js` 复制第二份 |
| `globalSettingKeys` | `OwoApp.app.state.constants.globalSettingKeys` | 旧脚本全局 lexical `globalSettingKeys` / `window.globalSettingKeysForBackup` | `canonical` | 保存和备份仍读同一份 key 列表 |
| 初始 `db` 形状 | `OwoApp.app.state.initialState.createInitialDbState` | `js/db.js` | `canonical` | `db.js` 只调用 factory，不再内联初始对象 |
| 全局设置默认值表 | `OwoApp.app.state.globalSettingsDefaults.createDefaultGlobalSettings` | `js/db.js::loadData` | `canonical` | `loadData` 仍负责合并旧数据；默认值表由 app/state 提供 |
| Netlify 静态构建 | `tools/netlify-build.js` / `netlify.toml` | 无 | `canonical` | 构建只跑 gate + 静态复制到 `dist/`，不引入第二套运行时代码 |

V4 之后，`db.js` 仍是 Dexie 初始化、migration、load repair 和 private writer 的 legacy owner。下一版如果继续拆 `db.js`，优先拆 `initDatabase` 周边的 Dexie adapter，但仍不能复制 writer。
