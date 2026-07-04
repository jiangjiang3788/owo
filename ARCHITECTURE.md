# OWO 架构重整 V1：单一路径守则

第一版目标不是大拆业务，而是防止重构时出现“两套实现”。

## 分层 ownership

| 层 | 放什么 | 禁止什么 |
|---|---|---|
| `js/core` | 领域语义、归一化、解析、映射、纯计算 | `window`、`document`、`fetch`、Dexie、DOM、UI |
| `js/app` | 启动、screen registry、全局 wiring | 具体业务规则、平台请求细节 |
| `js/features` | 功能用例、service、controller、view | 跨 feature 的中心语义 |
| `js/platform` | Dexie、localStorage、fetch、文件、音频、第三方 API | 领域 UI、角色/聊天业务规则 |
| `js/shared` | 通用 UI、通用 hook、通用 utils、样式桥 | chat/character/memory/forum/worldbook 等业务语义 |
| `js/compat` | 旧路径兼容转发 | 新业务逻辑 |

## 单一路径规则

1. 每个语义只能有一个 canonical owner。
2. 迁移时必须在同一次改动中完成：新 owner 实现 + 旧路径转发 + ledger 更新 + gate 通过。
3. 旧 `window.xxx` 可以存在，但只能是兼容 facade。
4. 新目录禁止依赖旧全局路径，例如 `js/features/**` 不应直接调用 `window.showToast`。
5. 未迁移的旧函数保持 `legacy-owner`，不要提前创建同义新实现。
6. facade 文件只允许转发，不允许写业务判断。

## V1 pilot

`pad` 已迁移为：

- canonical owner：`OwoApp.shared.utils.pad`
- legacy alias：`window.pad`
- 验收：`window.pad === window.OwoApp.shared.utils.pad`

这个 pilot 用来验证“两个入口，一个实现”的方式。

## V2：shared/platform 边界试点

V2 仍然不拆高风险业务主链路，只迁移低风险的通用工具和浏览器适配。

### V2 已迁移的 canonical owner

| 符号 | canonical owner | legacy alias | 文件角色 |
|---|---|---|---|
| `getRandomValue` | `OwoApp.shared.utils.getRandomValue` | `window.getRandomValue` | 通用文本工具 |
| `generateUUID` | `OwoApp.shared.utils.generateUUID` | `window.generateUUID` | 通用 ID 工具 |
| `getLocalTimeInTimezone` | `OwoApp.shared.utils.getLocalTimeInTimezone` | `window.getLocalTimeInTimezone` | 通用时间工具 |
| `formatTimeDivider` | `OwoApp.shared.utils.formatTimeDivider` | `window.formatTimeDivider` | 通用时间工具 |
| `getFormattedTimestamp` | `OwoApp.shared.utils.getFormattedTimestamp` | `window.getFormattedTimestamp` | 通用时间工具 |
| `formatTimeGap` | `OwoApp.shared.utils.formatTimeGap` | `window.formatTimeGap` | 通用时间工具 |
| `showAppConfirmDialog` | `OwoApp.shared.ui.showAppConfirmDialog` | `window.showAppConfirmDialog` | 通用 UI |
| `compressImage` | `OwoApp.platform.browser.compressImage` | `window.compressImage` | 浏览器图片适配 |
| `showSystemNotification` | `OwoApp.platform.browser.showSystemNotification` | `window.showSystemNotification` | 浏览器通知适配 |

### V2 禁止事项

1. 不允许在 `js/utils.js` 重新写上面这些函数的实现。
2. 不允许新代码直接调用 `window.compressImage`、`window.generateUUID` 等 legacy alias。
3. 不允许把 `showToast`、`saveData`、AI provider、prompt 构建提前复制到新路径。
4. 不允许 `platform` import 或读取领域状态；例如触感反馈里的 `db.hapticEnabled` 暂时不迁移。
5. 不允许 `shared` 出现角色、记忆、论坛、世界书、钱包等业务语义。

### V2 新 gate

`tools/ownership-map.json` 记录已迁移符号。`node tools/arch-check.js` 会检查：

- canonical owner 是否在 `index.html` 中先于 legacy 文件加载。
- legacy 文件是否还残留同名函数实现。
- legacy alias 是否通过 `OwoApp.compat.expose` 暴露，而不是直接 `window.xxx = xxx`。
- legacy 文件是否包含 `@compat canonical: ...` 标记。

## V3 storage single-writer rule

V3 开始，存储公开入口由 `OwoApp.platform.storage.repository` 管理：

- `saveData`
- `saveCharacter`
- `saveGroup`
- `saveGlobalSettings`

但这一版不复制 Dexie 写入实现。`js/db.js` 仍通过 private writer 承担唯一写入实现，随后只注册到 repository 一次。旧 `window.xxx` 入口只通过 `OwoApp.compat.expose` 指向 repository。

禁止行为：

1. `js/main.js` 再次包装 `window.saveData`。
2. `js/db.js` 直接 `window.saveData = ...`。
3. 新建第二套保存函数并和 `db.js` 同时写 IndexedDB。
4. 业务代码同时调用 `saveData()` 和 `OwoApp.platform.storage.repository.saveData()` 试图“双保险”。


## V4 state defaults ownership

V4 开始，`db.js` 不再拥有所有默认状态。默认状态第一刀迁到 `js/app/state/`：

| owner | 文件 | 职责 |
|---|---|---|
| `OwoApp.app.state.constants` | `js/app/state/constants.js` | 跨旧脚本共享的默认常量，例如 `defaultWidgetSettings`、`DEFAULT_COT_PRESETS`、`globalSettingKeys` |
| `OwoApp.app.state.initialState.createInitialDbState` | `js/app/state/initialState.js` | 创建初始内存 `db` 形状 |
| `OwoApp.app.state.globalSettingsDefaults.createDefaultGlobalSettings` | `js/app/state/globalSettingsDefaults.js` | 创建全局设置默认值表 |

禁止行为：

1. `js/db.js` 重新声明 `defaultWidgetSettings`、`DEFAULT_COT_PRESETS`、`globalSettingKeys`。
2. `js/db.js` 重新内联 `var db = { ... }`。
3. `js/db.js` 重新内联 `const defaultValue = { ... }`。
4. V4 新文件读取 Dexie、localStorage、DOM 或调用保存函数。
5. 默认值迁移和 Dexie migration 混在同一版做。

## V4 Netlify static deploy rule

项目当前仍按静态站发布。`netlify.toml` 只允许做两件事：

1. 运行 `node tools/arch-check.js`。
2. 运行 `node tools/netlify-build.js` 把浏览器静态文件复制到 `dist/`。

禁止为了发布直接引入 bundler、SSR、serverless function 或第二套路由系统。
