# v0.8.13 architecture baseline: Memory Brain retirement

- The unused shadow-only `core/memoryBrain`, `platform/memoryBrain`, and `features/memoryBrain` stacks are retired.
- Existing payloads are preserved under `legacySnapshots.memoryBrain` during loaded-data repair and are not executed.
- Journal, structured archive/table memory, and vector memory remain unchanged in this release.
- The next architecture line will converge AI task routing, context providers, prompt compilation, and a new shared memory gateway.
- No new feature may reintroduce a `memoryBrain` runtime owner.

---

# OWO 架构与文档版本说明

当前产品功能迭代版本：`v0.3.0`。

文档从 v0.2.12 开始按 **固定根路径 allowlist** 收口：

```text
docs/0.1/
docs/0.2/
docs/0.3/
docs/css-ownership.md
docs/release-plan.md
docs/smoke-memory.md
docs/VERSIONING.md
docs/README.md
```

| 分卷 | 内容 | 入口 |
|---|---|---|
| `docs/0.1` | 历史架构整改和 `V2`～`V38.1` gate 文档 | `docs/0.1/README.md` |
| `docs/0.2` | 0.2 功能收口和 release 文档 | `docs/0.2/README.md` |
| `docs/0.3` | 长期记忆脑主线和 release 文档 | `docs/0.3/README.md` |
| 根路径固定文件 | gate / index 固定入口 | `docs/README.md`、`docs/VERSIONING.md` 等 |

不要再创建 `docs/caifen`、`docs/other` 或 `docs/0.1/caifen`。`v0.3.x` 已开启，长期记忆脑文档写入 `docs/0.3/`。

`V27`、`V37`、`V38` 等编号继续作为历史 gate 编号保留，但不再作为产品版本号新增。新功能 release 使用 `v0.2.x`。

---

# OWO 架构重整 v0.1：单一路径守则

> 文档版本说明：历史 `V2`～`V38.1` 是内部 gate / slice 编号，现在从 `docs/0.1` 导航；当前用户可见功能迭代使用 `v0.2.x` 产品版本号，并从 `docs/0.2` 导航；原历史文档直接放在 `docs/0.1`。


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

## V5 Netlify direct deploy rule

项目当前仍按原生静态站发布。V5 默认采用直接发布模式：

```toml
[build]
  publish = "."
```

规则：

1. `netlify.toml` 使用 `publish = "."` 时，不允许再设置 `command`。
2. Netlify UI 中的构建命令可以留空；真正生效的仍以 `netlify.toml` 为准。
3. 直接发布模式只要求根目录存在 `index.html`、`js/`、`css/`。
4. `_redirects`、`manifest.json`、`sw.js` 建议保留，但不作为直接发布的硬阻断。
5. `tools/netlify-build.js` 只作为可选的 `dist` 发布前整理脚本，不是当前默认部署路径。
6. 禁止为了发布直接引入 bundler、SSR、serverless function 或第二套路由系统。

如果后续要切回 `dist` 模式，必须同时改成：

```toml
[build]
  command = "node tools/arch-check.js && node tools/netlify-build.js"
  publish = "dist"
```

直接发布模式和 `dist` 构建模式不能混用，避免 Netlify UI 与 `netlify.toml` 出现两套部署路径。


## V5 Dexie adapter ownership

V5 开始，Dexie 初始化和 schema / migration ownership 从 `js/db.js` 迁到 `platform/storage`：

| owner | 文件 | 职责 |
|---|---|---|
| `OwoApp.platform.storage.dexieMigrations` | `js/platform/storage/dexieMigrations.js` | 只放旧 IndexedDB schema 到新 schema 的迁移映射 |
| `OwoApp.platform.storage.dexieAdapter` | `js/platform/storage/dexieAdapter.js` | 只负责创建 Dexie 实例、声明 version/stores、挂载 migration |
| `OwoApp.platform.storage.repository` | `js/platform/storage/repository.js` | 唯一公开保存入口和保存状态追踪 |
| `js/db.js` | legacy compatibility | 只保留 `dexieDB` 变量和 `initDatabase` 兼容入口，把实例回填给旧代码 |

禁止行为：

1. `js/db.js` 重新 `new Dexie(...)`。
2. `js/db.js` 重新声明 `dexieDB.version(...).stores(...)`。
3. `dexieAdapter` 或 `dexieMigrations` 调用 `saveData` / `saveCharacter` / `saveGroup` / `saveGlobalSettings`。
4. 迁移 Dexie schema 时顺带迁移保存 writer。保存 writer 仍由 V3 repository 单写路径管理。
5. 把运行时 `db` 状态、DOM、UI toast、业务 feature 逻辑放进 `dexieAdapter`。

V5 的边界是：

```text
initDatabase() legacy alias
  -> OwoApp.platform.storage.dexieAdapter.initDatabase()
  -> create Dexie instance + schema + migration
  -> 回填 legacy dexieDB 变量
```

保存路径仍然是：

```text
saveData()
  -> OwoApp.platform.storage.repository.saveData()
  -> js/db.js::legacySaveDataImpl()
```

这两条路径不能合并、不能双写。

## V6 补充：loadData repair shell

`js/platform/storage/loadRepair.js` 是读取后修复层，只负责把持久化数据补齐到当前运行时 schema。

允许：

- 接收 `db` 对象并补齐缺省字段。
- 接收 `settingsArray/globalSettingKeys/defaultValue` 并合并全局设置。
- 迁移旧 `gemini-chat-app-db` localStorage 数据到 Dexie。

禁止：

- 实现或复制 `saveData`。
- 直接调用 `window.saveData`。
- 维护 UI 状态或 DOM。
- 引入第二套 Dexie schema。

`db.js::loadData` 只做编排：读表、调用 loadRepair、必要时触发兼容保存。

## V7 补充：storage analysis owner

`js/platform/storage/storageAnalysis.js` 是存储占用分析层，只负责根据当前内存 `db` 快照计算分类大小。

允许：

- 接收 `getDb()` 和 `ensureLoaded()` 依赖，由 legacy `db.js` 绑定旧运行时状态。
- 计算 messages、charactersAndGroups、worldAndForum、personalization、apiAndCore 等分类占用。
- 暴露 `computeStorageInfo`、`createDataStorage`、`bindDataStorage`。

禁止：

- 实现或调用 `saveData`。
- 直接读写 Dexie、localStorage 或任何浏览器文件 API。
- 访问 DOM 或展示 UI。
- 把存储分析逻辑重新写回 `db.js`。

V7 的兼容关系：

```text
dataStorage.getStorageInfo()
  -> OwoApp.platform.storage.storageAnalysis.dataStorage.getStorageInfo()
  -> computeStorageInfo(db snapshot)
```

`db.js` 只保留旧脚本可直接访问的 lexical alias：

```js
const dataStorage = OwoApp.platform.storage.storageAnalysis.bindDataStorage(...)
```

新代码不要重新读取旧全局 `dataStorage`，应通过 `platform/storage/storageAnalysis` owner 获取能力。

## V8 补充：backup / file adapter

`js/platform/storage/backupAdapter.js` 是备份数据格式 owner。

允许：

- 生成完整备份数据。
- 生成分类备份数据。
- 恢复旧版备份中的 history chunks。
- 编排完整导入和分类导入。
- 通过注入的 `saveData` 保存结果。

禁止：

- 直接调用 `window.saveData`。
- 新建第二套保存 writer。
- 处理 DOM 下载和 FileReader 细节。
- 管理教程页 UI。

`js/platform/browser/fileAdapter.js` 是浏览器文件能力 owner。

允许：

- gzip 压缩 / 解压。
- Blob 下载。
- File 读取。
- Blob 与 base64 转换。

禁止：

- 读取或修改 `db`。
- 读写 Dexie。
- 理解 `.ee` 备份业务语义之外的 UI 状态。

V8 后，`js/modules/tutorial.js` 只负责教程页 UI、按钮交互和 GitHub 备份界面，不再直接实现备份数据格式或 gzip 文件操作。

## V9 / V10 storage owner flip and db shell rule

V9/V10 之后，`js/db.js` 不再拥有 IndexedDB 写入实现和读取修复编排。存储路径分为：

| 职责 | canonical owner | legacy 兼容点 |
|---|---|---|
| 公开保存入口 | `OwoApp.platform.storage.repository` | `window.saveData` / `saveData` 等旧入口 |
| IndexedDB 写入 | `OwoApp.platform.storage.dexieWriter` | 由 `db.js` 注册一次 writer，不在 `db.js` 实现 |
| IndexedDB 读取编排 | `OwoApp.platform.storage.dexieReader` | `loadData` 旧 lexical alias |
| 字段修复 | `OwoApp.platform.storage.loadRepair` | 被 dexieReader 调用 |
| Dexie schema/migration | `OwoApp.platform.storage.dexieAdapter` / `dexieMigrations` | `initDatabase` 旧入口 |
| 静态配置 | `js/app/state/staticConfig*.js` | `BLOCKED_API_DOMAINS`、`colorThemes`、`updateLog` 等旧 lexical 常量 |
| 运行时全局状态 | `js/app/state/runtimeGlobals.js` | `db`、`currentChatId`、`dexieDB` 等旧全局变量 |

禁止行为：

1. `js/db.js` 重新出现 `bulkPut()`、`globalSettings.put()`、`toArray()` 等读写实现。
2. `js/db.js` 重新声明 `BLOCKED_API_DOMAINS`、`colorThemes`、`updateLog`、`currentChatId`、`dexieDB` 等静态或运行时 owner。
3. 任何文件第二次调用 `repository.setWriters()` 或 `setLegacyWriters()`。
4. `dexieWriter.js` 直接暴露 `window.saveData`；旧入口只能在 `db.js` compatibility shell 中保留。
5. `dexieReader.js` 直接调用 `window.saveData`；需要保存修复结果时只能通过注入的 `getSaveData()`。

V10 完成后，`db.js` 是 compatibility shell，而不是数据层实现文件。后续新增存储能力必须进入 `js/platform/storage/`。

## V11 补充：utils.js 第二轮拆分

V11 后，`utils.js` 不再拥有以下 UI / platform 实现：

- Toast 队列与展示：`js/shared/ui/toast.js`
- 通用错误弹窗与 API 错误展示：`js/shared/ui/errorModal.js`
- 触感震动适配：`js/platform/browser/hapticAdapter.js`
- Battery Status API 与旧电池 widget 更新：`js/platform/browser/batteryAdapter.js`

旧全局入口继续通过 `OwoApp.compat.expose()` 暴露。新代码不得把这些实现写回 `utils.js`。

## V12 补充：AI provider config/model ownership

V12 后，AI provider 配置读取归：

```text
js/platform/ai/providerConfig.js
```

允许：

- 归一化 `provider / url / key / model`。
- 根据场景选择 main / summary / background / imageRecognition API 配置。
- 读取主 API 的 `temperature / quickReplyEnabled / timePerceptionEnabled / onlineRoleEnabled / streamEnabled` 等配置值。
- 判断当前 base URL 是否命中 `BLOCKED_API_DOMAINS`。

禁止：

- 在 `providerConfig.js` 中调用 `fetch()`。
- 在 `providerConfig.js` 中实现 stream 读取、SSE 解析、endpoint 请求发送。
- 在 `providerConfig.js` 中写 DOM、toast、保存数据或暴露旧 `window` API。
- 在 `chat_ai.js` 中重新写 summary/background/imageRecognition/main 的 provider 选择逻辑。

V12 只迁移“配置读取”。请求体构造、endpoint/header 构造、`fetchAiResponse`、`processStream`、`normalizeMessagesForProvider` 暂不迁移，分别留给 V13～V15 处理。

## V13 AI provider request adapter rule

V13 开始，AI provider 的 endpoint/header/request body/fetch options 组装归：

```text
OwoApp.platform.ai.providerRequestAdapter
js/platform/ai/providerRequestAdapter.js
```

允许：

1. `providerRequestAdapter` 读取 `providerConfig.normalizeProviderSettings()`。
2. `providerRequestAdapter` 组装 endpoint、headers、requestBody、fetchOptions。
3. `chat_ai.js` 发起 `fetch(providerRequest.endpoint, providerRequest.fetchOptions)`。
4. `chat_ai.js` 继续处理 `processStream()` 和非流式响应解析。

禁止：

1. `providerRequestAdapter.js` 内部调用 `fetch()`。
2. `providerRequestAdapter.js` 内部处理 stream reader / `TextDecoder`。
3. `chat_ai.js` 重新内联 `/v1/chat/completions`、Gemini endpoint、Authorization header。
4. V13 同时重写 prompt builder、message normalization、stream parser。

V13 的目标是把请求组装从 `chat_ai.js` 移出，但不改变网络发送和响应解析路径。这样可以为 V14/V15 拆 message semantics、prompt builder、stream parser 预留边界，同时避免 AI 主链路一次性改动过大。

## V14：chat message semantics ownership

V14 新增 `js/core/chat/messageSemantics.js`，用于承接聊天消息的纯语义归一化：

- role 归一化：`char` / `ai` → `assistant`
- content 文本提取：string / array parts / image marker
- provider 兼容：Claude system message 包装、相邻 compat message 合并
- OpenAI message content → Gemini parts / contents 映射

边界要求：

1. `messageSemantics.js` 不允许访问 DOM、storage、fetch、stream、compat facade。
2. `utils.js` 只能保留 legacy alias，不能重新实现 `normalizeMessagesForProvider`。
3. `providerRequestAdapter.js` 只能消费 message semantics，不再自己实现 OpenAI → Gemini message 映射。
4. `chat_ai.js` 只改 provider message 归一化调用点；prompt builder 和 stream 解析留到后续版本。

## V15：chat prompt pieces/context ownership

V15 开始，prompt builder 的可复用片段和上下文组装归：

```text
js/core/chat/promptContext.js
js/core/chat/promptPieces.js
js/core/chat/promptSemantics.js
```

允许：

1. `promptContext.js` 根据传入的内存快照组装世界书、peek、手机操控等上下文片段。
2. `promptPieces.js` 生成线上逻辑规则、输出格式、额外格式、人设文本、token 估算等纯文本片段。
3. `promptSemantics.js` 作为 facade 聚合稳定 API。
4. `chat_ai.js` 继续保留 `generatePrivateSystemPrompt()` 主编排，并通过 `chatAiPromptSemantics` 消费片段。

禁止：

1. `core/chat/prompt*.js` 访问 DOM、storage、fetch、stream、旧 compat facade。
2. `chat_ai.js` 重新内联已迁移的世界书选择、peek 摘要、手机状态摘要、线上规则、输出格式、额外格式实现。
3. V15 同时重写 `fetch()`、`processStream()` 或非流式响应解析。

这一版的目标是降低 prompt builder 的局部复杂度，而不是改变 prompt 输出策略。后续如果继续拆 `generatePrivateSystemPrompt()`，必须再分 offline node、online private、custom template、memory pieces 等更小版本推进。

## V16：chat render/view ownership

V16 开始，聊天消息渲染入口和 view model 归属为：

```text
js/features/chat/messageViewModel.js
js/features/chat/renderMessageBubble.js
```

允许：

1. `messageViewModel.js` 只做消息展示前的 role/content/isThinking/avatar/time/bilingual 等归一化。
2. `renderMessageBubble.js` 只提供稳定渲染入口、legacy renderer 注册和 view model 注入。
3. `chat_render.js` 暂时保留 DOM 细节 renderer，但必须通过 `setLegacyRenderer()` 注册给 canonical facade。
4. 旧 `createMessageBubbleElement()` 只能作为 compatibility wrapper 转发到 `renderMessageBubble()`。

禁止：

1. `features/chat/messageViewModel.js` 或 `renderMessageBubble.js` 调用 `saveData()`、`fetch()`、stream reader、AI provider、Dexie。
2. `chat_render.js` 内部新增渲染调用继续走 `createMessageBubbleElement()`；旧入口只给外部 legacy 模块兼容。
3. V16 同时修改消息保存、AI 请求、`processStream()` 或非流式响应解析。
4. 在 `renderMessageBubble.js` 中复制完整 DOM 卡片实现，导致和 `chat_render.js` 并存两套 renderer。

V16 的目标是先固定 canonical 渲染入口和 view model owner，为后续按卡片类型拆 DOM renderer 做准备。

## V17 settings public facade rule

V17 开始，settings 模块的新入口为：

```text
OwoApp.features.settings.publicApi
```

新增文件角色：

| 文件 | 角色 | 禁止事项 |
|---|---|---|
| `features/settings/public.js` | public facade | 不写业务逻辑、不直接 DOM/db/fetch、不做 compat expose |
| `features/settings/settingsService.js` | service facade | 只转发 setup 入口，不保存设置、不访问平台 API |
| `features/settings/settingsShell.js` | legacy registry | 只注册 legacy 实现，禁止第二套实现 |

`js/settings.js` 在 V17 仍然承载具体设置实现，但必须把 setup 入口注册到 `settingsShell`。`js/main.js` 不再直接调用 legacy settings setup 函数，而是走 `OwoApp.features.settings.publicApi`。

后续拆 `settings.js` 时，每迁移一个子模块都必须完成：

```text
新 owner 实现 + settings.js 旧入口转发 + ledger 更新 + arch-check 通过
```

不允许在 `features/settings` 和 `js/settings.js` 同时保留两套 API 设置 / preset / 外观设置实现。

## V18 API settings ownership rule

V18 开始，API 设置页的 canonical owner 为：

```text
OwoApp.features.settings.apiSettings
```

文件职责：

| 文件 | 角色 | 允许职责 | 禁止职责 |
|---|---|---|---|
| `apiSettingsModel.js` | model/semantics | provider URL、sub API 配置、模型列表请求参数计算 | DOM、fetch、保存数据、聊天 stream |
| `apiPresetService.js` | service/model | API preset 数组 CRUD、导入合并、表单数据映射 | DOM 事件绑定、聊天请求、stream |
| `apiModelListService.js` | service | 设置页“拉取模型列表”请求和模型列表解析 | `fetchAiResponse`、聊天响应解析、stream |
| `mainApiSettingsView.js` | view | 主 API 设置 DOM 绑定和保存 | provider runtime fetch、chat_ai 逻辑 |
| `subApiSettingsView.js` | view | 副 API 设置 DOM 绑定和 preset UI | provider runtime fetch、chat_ai 逻辑 |
| `weatherApiSettingsView.js` | view | 天气 API 设置 DOM 绑定 | 聊天/AI provider 逻辑 |
| `apiSettings/public.js` | public facade | 暴露 API 设置子模块稳定入口 | 业务实现、chat/provider runtime 请求 |

`js/settings.js` 中的 API 设置相关函数只能作为 compatibility wrapper。禁止在 `settings.js` 和 `features/settings/apiSettings` 同时维护两套 API 设置 UI / preset 实现。V18 不改变 `chat_ai.js` 的 provider fetch 和 stream 解析。

## V19 appearance settings ownership

Appearance / theme / wallpaper / font settings now belong to `features/settings/appearance`.

- `appearanceModel.js`: constants only.
- `appearanceRuntime.js`: runtime bridge for save/toast/file/compressImage only.
- `wallpaperSettingsView.js`: wallpaper UI binding.
- `fontPresetView.js`: font preset UI/service.
- `widgetWallpaperPresetView.js`: widget wallpaper scheme UI/service.
- `themeStatusView.js`: night mode and status bar UI binding.
- `appearanceService.js`: service facade only.
- `public.js`: public facade only.

`settings.js` must not regain the migrated appearance implementations. It may only keep compatibility wrappers for old global function names.

## V20 preset engine and auth gate rule

V20 adds a settings-specific preset engine under:

```text
js/features/settings/presetEngine/
```

Ownership:

| File | Role | Rule |
|---|---|---|
| `presetEngineModel.js` | model / semantics | Pure preset array operations only |
| `presetEngineService.js` | service | Binds `state + key` to preset operations; no DOM and no save side effects |
| `public.js` | public facade | Stable exports only |

Only these preset families are unified in V20:

- API presets.
- Font presets.
- Widget wallpaper presets.

TTS and COT presets are explicitly out of scope for V20.

Startup account/password auth is paused by `js/app/authGate.js`:

```js
const AUTH_GATE_ENABLED = false;
```

`main.js` must start through `OwoApp.app.authGate.start(...)`. While paused, the app must not render the login overlay or call the remote verify endpoint. Re-enabling the gate should be a separate version with a clear security and deployment review.

## V21 TTS / voice / CoT settings ownership

V21 moves TTS preset UI, voice preset UI, and character CoT settings UI helpers into:

```text
js/features/settings/voiceCot/
```

Ownership:

| File | Role | Rule |
|---|---|---|
| `voiceCotRuntime.js` | runtime bridge | Provides save/toast/file/presetEngine access only |
| `ttsPresetView.js` | view/service | TTS preset select/save/apply/manage/import/export UI only |
| `voicePresetView.js` | view/service | Voice preset select/save/apply/manage UI only |
| `cotCharacterSettingsView.js` | view helper | Single-character CoT settings load/save DOM helpers only |
| `cotSettingsEntry.js` | compatibility shell | Accepts legacy `cot_settings.js` init implementation and exposes a stable init entry |
| `public.js` | public facade | Stable API only, no business implementation |

V21 explicitly does **not** change TTS synthesis, voice playback, chat prompt generation, `chat_ai.js`, provider fetch, stream parsing, or CoT prompt semantics. The legacy `js/modules/cot_settings.js` still owns the full CoT editor UI implementation; only its `initCotSettings` entry is routed through the settings voiceCot public facade.

`js/settings.js` may keep compatibility wrappers for old function names such as `saveCurrentTTSAsPreset`, `applyVoicePreset`, and `populateTTSPresetSelect`, but must not regain the migrated implementations.

## V22 settings legacy shell close

V22 不新增设置业务模块，只清理阶段 4 已迁移入口的 routing 边界：

- `settingsShell` 只允许注册尚未迁移的 legacy setup。
- 已迁移的 `setupApiSettingsApp / setupWallpaperApp / setupNightModeBindings / setupStatusBarBindings / initCotSettings` 必须走对应子模块 public facade。
- `settingsService` 对已迁移入口不再 fallback 到 legacy shell；缺少 canonical owner 时应尽早报错。
- `settings.js` 末尾的 `legacyApi` 注册块只能包含尚未迁移入口。

验收入口：

```js
window.OwoApp.features.settings.publicApi.getSettingsRoutingReport()
```

## V23 memory table ownership

V23 starts the memory domain stage with a vertical slice of structured memory tables:

```text
js/core/memory/tableSemantics.js          pure template/field/row/value semantics
js/features/memoryTable/model.js          chat.memoryTables state model and mutations
js/features/memoryTable/service.js        runtime state binding helpers
js/features/memoryTable/view.js           view-model helpers and safe text formatting
js/features/memoryTable/public.js         public facade only
js/modules/memory_table.js                legacy DOM renderer / AI update orchestration shell
```

Rules:

- `core/memory/tableSemantics.js` must not access DOM, runtime globals, network, storage, or platform APIs.
- `features/memoryTable/model.js` owns `chat.memoryTables` state shape, field updates, rows, history and auto-update cursor state.
- `features/memoryTable/service.js` may bind runtime `state/currentChatId/currentChatType`, but must not render DOM or call AI providers.
- `features/memoryTable/view.js` may produce view models and safe strings, but must not query or mutate DOM.
- `js/modules/memory_table.js` may keep compatibility wrappers and legacy DOM/event orchestration while the feature is being sliced.
- V23 explicitly does not modify `chat_ai.js` prompt assembly or `vector_memory.js`.

`tableSemantics.js` is 378 lines after the first extraction. This is under the hard 380-line split gate but over the 300-line soft budget because it currently keeps template normalization and field value semantics together to avoid changing behavior mid-stage. A later memory cleanup can split it into template/value semantics if more code is added.

## V24 vector memory ownership

V24 slices vector memory without changing `chat_ai.js` prompt main orchestration:

```text
js/platform/ai/embeddingAdapter.js        embedding endpoint/header/request/fetch owner
js/features/vectorMemory/model.js         vector template, chat.vectorMemory state and cursor model
js/features/vectorMemory/contextService.js query/context retrieval and embedding fill service
js/features/vectorMemory/public.js        public facade only
js/modules/vector_memory.js               legacy DOM renderer / conversion / auto-summary orchestration shell
```

Rules:

- `embeddingAdapter.js` may call `fetch` for embedding endpoints only. It must not call `fetchAiResponse`, stream parsers, prompt builders, DOM, or chat renderers.
- `features/vectorMemory/model.js` owns `chat.vectorMemory` state shape and cursor operations. It must not call DOM, network, storage writers, or old globals such as `window.saveData`.
- `features/vectorMemory/contextService.js` may build query text, select entries, fill vectors through `embeddingAdapter`, and update the vector context cache. It must not touch `chat_ai.js`, prompt main orchestration, stream parsing, or DOM.
- `js/modules/vector_memory.js` may keep UI rendering, modal handlers, conversion flows and manual/auto-summary orchestration while the feature is being sliced, but migrated functions must remain compatibility wrappers only.
- `chat_ai.js` must keep its existing vector-memory integration points (`prepareVectorMemoryContext`, `getVectorMemoryContextBlock`) unchanged in V24.

## V25 journal / archive / favorites memory surrounding ownership

V25 starts the memory-surrounding cleanup, but intentionally only slices journal semantics and journal service:

```text
js/core/memory/journalSemantics.js        pure journal ID/range/import/sort/prompt-piece semantics
js/features/journal/service.js            chat.memoryJournals state service and auto-journal cursor helpers
js/features/journal/public.js             public facade only
js/modules/journal.js                     legacy DOM renderer / AI summary orchestration shell
js/modules/archive.js                     legacy-owner in V25
js/modules/favorites.js                   legacy-owner in V25
```

Rules:

- `core/memory/journalSemantics.js` must not access DOM, runtime globals, network, storage, or platform APIs.
- `features/journal/service.js` may bind runtime `state/currentChatId/currentChatType` and mutate `chat.memoryJournals`, but must not render DOM, call AI providers, call `window.saveData`, or depend on vector memory.
- `js/modules/journal.js` may keep DOM rendering, button handlers, file import/export, and AI summary/merge orchestration while journal is being sliced.
- V25 explicitly does not modify `chat_ai.js` prompt main orchestration, `vector_memory.js`, archive implementation, or favorites implementation.

验收入口：

```js
window.OwoApp.features.journal.publicApi.getRoutingReport()
```

## V26 worldbook context ownership

V26 moves worldbook trigger/injection semantics out of chat prompt helpers while preserving the public prompt integration points:

```text
js/core/memory/worldBookSemantics.js       pure trigger/injection semantics
js/features/worldBook/contextService.js    before/middle/after prompt context builder
js/features/worldBook/public.js            public facade only
js/core/chat/promptContext.js              compatibility bridge for chat prompt semantics
js/modules/worldbook.js                    legacy worldbook management UI shell
```

Rules:

- `core/memory/worldBookSemantics.js` must stay pure: no DOM, runtime globals, storage, network, platform API, or legacy global calls.
- `features/worldBook/contextService.js` may bind a supplied state snapshot and call worldbook semantics. It must not call AI providers, stream parsers, storage writers, or DOM.
- `chat_ai.js` must keep the same `getActiveWorldBooksContents()` call pattern and prompt insertion order in V26.
- `js/modules/worldbook.js` still owns worldbook management UI, import, drag/drop, category editing and persistence in V26. Do not half-migrate those responsibilities in this version.

验收入口：

```js
window.OwoApp.features.worldBook.publicApi.getRoutingReport()
```

## V27 memory regression gate

V27 adds a regression gate for the memory domain instead of slicing new business code.

Canonical gate files:

```text
docs/smoke-memory.md
tools/memory-regression-gate.js
docs/v27-memory-regression-gate-plan.md
```

Rules:

- `docs/smoke-memory.md` must keep stable test IDs for memory table, vector memory, journal, worldbook and cross-domain smoke tests.
- `tools/memory-regression-gate.js` is a static gate only. It must not call `fetch`, `saveData`, `fetchAiResponse`, `processStream`, DOM runtime behavior, or provider APIs.
- `tools/arch-check.js` must fail if the memory smoke checklist or memory regression gate is missing.
- V27 must not modify `js/modules/chat_ai.js`, provider fetch, stream parsing, prompt main orchestration, or Netlify direct-publish configuration.
- V27 must not create new memory business owners. It only protects V23-V26 owners with documentation and static checks.

Required commands before continuing after V27:

```bash
node tools/arch-check.js
node tools/memory-regression-gate.js
node tools/netlify-build.js
```

Browser smoke should use the fixed IDs in `docs/smoke-memory.md`.

## V28 forum vertical slice ownership

V28 starts stage 6 by slicing forum profile/post/dm semantics and service without changing chat prompt, AI provider fetch, stream parsing or message sending flow.

```text
js/core/forum/forumSemantics.js        pure forum profile/post/dm semantics
js/features/forum/profileService.js    forum user profile and alt account state service
js/features/forum/postService.js       forum post/comment state service
js/features/forum/dmService.js         forum DM / stranger profile / friend request state service
js/features/forum/public.js            public facade only
js/modules/forum.js                    legacy DOM renderer / event binding / AI orchestration shell
```

Rules:

- `core/forum/forumSemantics.js` must not access DOM, runtime globals, network, storage, `db`, `saveData`, `chat_ai`, or stream parsing.
- `features/forum/*Service.js` may mutate supplied state snapshots, but must not render DOM, call `fetch`, call `fetchAiResponse`, call `processStream`, or use old `window.saveData`.
- `js/modules/forum.js` may keep DOM rendering, event binding, forum AI generation and DM AI reply orchestration while forum is being sliced.
- V28 must not modify `js/modules/chat_ai.js`, chat prompt output order, provider fetch/stream, or message sending outside forum's existing UI path.

验收入口：

```js
window.OwoApp.features.forum.publicApi.getRoutingReport()
```

### V29 theater ownership

小剧场第一刀只迁移 scene/model/prompt semantics 和 service：

- `core/theater/sceneSemantics.js`：纯 scene 语义。
- `core/theater/promptSemantics.js`：纯 prompt pieces。
- `features/theater/model.js`：小剧场状态模型。
- `features/theater/promptService.js`：运行时上下文绑定，不发请求。
- `features/theater/public.js`：public facade。

`js/modules/theater.js` 仍是 legacy DOM / 事件 / AI 请求编排 shell。V29 不改 `chat_ai.js`、forum、消息发送、provider fetch 和 stream。

## V30 Peek ownership

偷看手机模块开始进入垂直切片阶段：

- XML parse 属于 `core/peek/xmlSemantics.js`。
- conversation 默认字段和展示文本归一化属于 `core/peek/conversationSemantics.js`。
- 手机 app model、默认设置、刷新范围、生成数据校验属于 `features/peek/phoneAppModel.js`。
- `features/peek/public.js` 只做 public facade。
- `js/modules/peek.js` 暂时只保留 legacy DOM renderer、事件绑定、代发消息、NPC 回复和 AI 编排 shell。

V30 不允许改 `chat_ai.js` 主 prompt、`theater.js`、provider fetch、stream 或消息发送路径。

## V31 video call / audio media ownership

视频/语音通话媒体第一刀只迁移浏览器基础能力和通话状态 model：

- `platform/browser/audioAdapter.js`：Audio 元素创建、停止、播放、静音激活、循环铃声。不得实现 TTS provider 请求、聊天逻辑、保存或 stream。
- `platform/browser/mediaAdapter.js`：摄像头流、video 元素挂载、canvas 帧捕获、震动。不得实现通话业务规则、AI 请求或保存。
- `features/videoCall/model.js`：通话 state 初始值、摄像头 state、通话类型和时长格式化。不得触碰 DOM、Audio、MediaDevices、fetch、storage。
- `features/videoCall/public.js`：只做 public facade 和 routing report。
- `js/modules/video_call.js` 暂时保留 DOM、事件绑定、通话 AI 编排、消息保存和历史记录 UI。
- `js/modules/tts_service.js` 暂时保留 TTS provider 合成、队列和配置。V31 只让其复用 `audioAdapter` 的播放基础能力。

V31 不允许修改 `chat_ai.js`、provider fetch、stream parsing、消息发送或通话总结主流程。

## V32 wallet / shop / payment card ownership

钱包、商城、代付、转账和亲属卡第一刀只迁移纯语义和聊天卡片 view model：

- `core/wallet/paymentSemantics.js`：纯解析和格式构建，包括 shop order、pay request、transfer、family card gift、cart total、cart item string、pay response text。不得访问 DOM、`db`、storage、AI 请求或 stream。
- `features/wallet/paymentCardViewModel.js`：聊天内小票、代付、转账、亲属卡卡片的 view model。不得写 DOM、不得保存、不得发请求。
- `features/wallet/public.js`：public facade，只导出 routing report 和稳定 API。
- `js/modules/chat_render.js`：仍保留 legacy DOM renderer 和主 render 入口；V32 不改消息保存、AI 请求和 stream。
- `js/modules/shop.js`：仍保留商城 UI、购物车和下单编排；订单/代付消息格式构建必须复用 `paymentSemantics`。

V32 之后，新增钱包/商城/代付/亲属卡卡片语义必须先放入 `core/wallet/paymentSemantics.js` 或 `features/wallet/paymentCardViewModel.js`，不得直接写回 `chat_render.js` 的正则分支。

## V33 feature integration cleanup

阶段 6 的大 feature 第一刀完成后，跨 feature 调用需要收口到 public facade。

V33 规则：

- `forum / theater / peek / videoCall / wallet` 必须导出 `publicApi.getRoutingReport()` 和 `publicApi.getPublicContract()`。
- 其他 feature 不得直接调用这些 feature 的私有 `model/service/viewModel`，必须走 public facade。
- `chat_render.js` 不得直接读取 `db.theaterScenarios` / `db.theaterHtmlScenarios`；小剧场分享和跳转走 `OwoApp.features.theater.publicApi`。
- `chat_render.js` / `shop.js` 不得直接读取 `OwoApp.core.wallet.paymentSemantics` 或 `OwoApp.features.wallet.paymentCardViewModel`；钱包/商城语义走 `OwoApp.features.wallet.publicApi`。
- `js/app/featureIntegrationRegistry.js` 只汇总 public facade 状态，不写业务逻辑。

触感反馈开关修复：

- `hapticEnabled` 必须在 `globalSettingKeys` 和 `globalSettingsDefaults` 中登记。
- `hapticAdapter.isHapticEnabled(value)` 是触感开关的中心语义，只有显式 `false` 才关闭。

V33 gate：

```bash
node tools/feature-integration-gate.js
node tools/arch-check.js
```

## V34 screen registry ownership

阶段 7 从 screen registry 开始，不直接拆 `index.html` DOM。

规则：

- `js/app/screenManifest.js` 只登记当前 DOM 中存在的 screen id、owner、group 和 legacy lifecycle hook 名称。
- `js/app/screenRegistry.js` 只做 registry / lifecycle routing，不写业务 DOM，不接管 `.screen.active` 切换，不保存数据，不 fetch。
- `switchScreen()` 仍然负责旧 DOM 切换；切换完成后调用 `OwoApp.app.screenRegistry.transitionTo()`。
- 新 screen 要先登记 owner，再补 init/mount/unmount；不得直接把初始化逻辑继续堆进 `main.js`。
- V35 以后拆 screen 模板时，必须先确认 `screenRegistry.assertDomScreens()` 通过。

Gate：

```bash
node tools/screen-registry-gate.js
node tools/arch-check.js
```


## V35：screen template ownership

低风险 screen 模板可以从 `index.html` 拆到对应 owner 文件，但必须遵守：

- `index.html` 保留同名 `.screen` placeholder 和原 DOM id。
- 静态模板通过 `OwoApp.app.screenTemplates.registerTemplate()` 注册。
- template 文件只包含静态 HTML 字符串，不写业务逻辑。
- `screenTemplateRegistry` 只负责 hydrate，不接管 `.screen.active` 切换。
- 拆 screen 前必须补 `tools/screen-template-gate.js` 检查，确保 DOM id 不丢。

## V36 high-risk screen template ownership

V36 可以拆高风险 screen 的静态 HTML，但只能作为 template owner 迁移，不能顺带迁移业务逻辑。

- `chat-room-screen` owner：`js/features/chat/chatRoomScreenTemplate.js`。
- `api-settings-screen` / `chat-settings-screen` owner：`js/features/settings/settingsScreenTemplates.js`。
- forum 相关 screen owner：`js/features/forum/forumScreenTemplates.js`。
- `index.html` 必须保留同名 `.screen` placeholder、原 id、`data-screen-template` 和 `data-template-hydrated="pending"`。
- 模板文件不得出现 `fetch`、`saveData`、`fetchAiResponse`、`processStream`、`addEventListener` 或 `.screen.active` 切换。
- 业务初始化仍由已有模块和 V34 screen registry lifecycle 负责；V36 不拆 chat/settings/forum 业务逻辑。

Gate：

```bash
node tools/screen-template-gate.js
node tools/screen-registry-gate.js
node tools/arch-check.js
```

## V37 CSS ownership

V37 开始，CSS 也要遵守 ownership 规则。

- 公共 CSS 变量唯一 owner：`css/shared/theme-tokens.css`。
- CSS owner 表：`tools/css-ownership-map.json`。
- CSS gate：`node tools/css-ownership-gate.js`。
- 新增 CSS 文件必须先登记 owner、role、status、maxLines。
- `css/shared/theme-tokens.css` 只放公共 `:root` token，不放业务选择器。
- `css/base.css` 不再定义公共 `:root` 初始变量。
- 大型 legacy CSS 可以暂时存在，但必须在 ownership map 中标记 `legacy-heavy`。
- V37 不大改选择器，不迁移业务样式块；后续如需拆 CSS，必须按 feature owner 逐步拆。

Gate：

```bash
node tools/css-ownership-gate.js
node tools/arch-check.js
```

## V38 legacy globals deprecation

V38 是当前主重构计划的收尾版。旧 `window.*` 入口不会被删除，但已迁移到 canonical owner 的旧全局 API 必须视为 deprecated。

规则：

- `OwoApp.app.legacyDeprecation` 是 deprecated legacy global 的 runtime registry。
- `OwoApp.compat.expose()` 默认将旧入口登记为 deprecated。
- 新结构目录 `js/app`、`js/core`、`js/features`、`js/platform` 不允许继续直接引用已迁移旧全局，例如 `window.saveData`、`global.showToast`、`window.normalizeMessagesForProvider`。
- 新代码必须走 canonical owner，例如 `OwoApp.platform.storage.repository.saveData()`、`OwoApp.shared.ui.showToast()`。
- 旧入口只服务历史 onclick、legacy script 和外部用户脚本；不得继续承载新业务。

Gate：

```bash
node tools/legacy-globals-gate.js
node tools/arch-check.js
```

## V38.1 placeholder feature policy

用户可见的占位功能入口不应发布。凡是点击后只提示“开发中 / 敬请期待”的入口，必须从 UI、默认图标、自定义图标列表中移除；如果后续重新实现，应作为真实 feature 走 public facade 接入。

V34～V36 的 screen template placeholder 是模板 hydrate 的技术容器，不属于占位功能，不能误删。

## v0.2.6 quickDock prerequisite ownership

v0.2.6 为后续悬浮球准备能力 facade，先拆 owner，再做 UI。

- 主 API 模型切换 owner：`js/features/settings/apiSettings/apiModelSwitchService.js`。
- 模型切换出口：`OwoApp.features.settings.apiSettings.publicApi.listMainModels()`、`switchMainModel()`。
- GitHub API 适配 owner：`js/platform/storage/githubBackupAdapter.js`，只负责 GitHub API、gzip/base64 文件和备份数据，不读写 DOM。
- 云备份用例 owner：`js/features/cloudBackup/service.js`。
- 云备份出口：`OwoApp.features.cloudBackup.publicApi.backupNow()`、`restoreLatest()`、`checkStatus()`。
- `window.GitHubMgr` 只是 tutorial legacy compatibility shell，不允许再新增上传、分片、恢复业务逻辑。
- v0.2.6 悬浮球必须只调用 public facade，不直接访问 `tutorial.js`、`GitHubMgr` 或设置页 DOM。

## v0.2.7 quickDock closing review

v0.2.7 是 v0.2.4～v0.2.6 的收口审查版，不扩大功能，只补不合理点和 gate。

- 自动“新功能提醒 / 引导”默认关闭：`GuideSystem.check()` 不再弹出功能引导浮层，只记录已读并保留 `cleanup()` 兼容能力。
- quickDock 仍只能调用 public facade：`apiSettings.publicApi`、`cloudBackup.publicApi`、`debugConsole.publicApi`。
- `tools/feature-integration-gate.js` 必须检查 debugConsole/cloudBackup/quickDock public facade、quickDock 加载顺序，以及 quickDock 不得直接引用 `GitHubMgr` 或 API 设置页 DOM。
- GitHub contents API 路径必须逐段编码，禁止对含 `/` 的 repo path 整体 `encodeURIComponent()`。
- 大面板交互原则：提示词面板右上角 `×` 关闭面板；打开请求控制台时自动收起 quickDock，避免两个大面板叠加。


## v0.2.8 request console inside quickDock

v0.2.8 明确用户体验边界：请求控制台不再拥有独立悬浮入口，入口完全归 `features/quickDock`。

- `features/debugConsole` 仍是请求控制台展示 owner，但只能提供嵌入式 panel 渲染和 trace 数据展示，不得在 DOMContentLoaded 自动挂载“请求”按钮。
- `features/quickDock` 是请求功能的唯一用户入口，通过 `requests` activePanel 承载请求列表、详情、复制和清空操作。
- `debugConsole.publicApi.openRequestConsole()` 可作为旧调用兼容，但必须优先路由到 `quickDock.publicApi.openRequestPanel()`。
- `tools/feature-integration-gate.js` 必须检查 `debugConsole/view.js` 不含自动挂载独立入口逻辑。


## v0.2.9 docs version routing

v0.2.9 是文档收口版：把历史架构 gate 文档和当前功能 release 文档分开管理。

- `docs/0.1` 是历史 V2～V38.1 架构 gate 的导航入口，历史拆分文档直接放在该目录。
- `docs/0.2` 是 v0.2.x 功能 release 文档的 canonical owner。
- `docs/VERSIONING.md` 是文档版本线规则 owner。
- 根路径只保留固定入口：`README.md`、`VERSIONING.md`、`release-plan.md`、`css-ownership.md`、`smoke-memory.md`。
- 新增功能文档必须进入 `docs/0.2`，不得再用 V39/V40 作为产品 release 文档。
- `docs/caifen` 已移除；canonical 历史文档必须直接在 `docs/0.1`，不要再创建 `docs/0.1/caifen`。



## v0.2.10 docs routing correction and quick model compact UI

v0.2.10 修正 v0.2.9 对文档结构的理解偏差，并收口悬浮球模型切换显示。

- `docs/0.1` 是原历史文档 canonical owner；根路径不再保留 `docs/caifen`。
- `docs/0.2` 继续作为 v0.2.x release 文档 canonical owner。
- `docs/other` 已移除；确实需要新版本线时先更新 `docs/VERSIONING.md`。
- 悬浮球快速切换模型只展示模型名，禁止在 select 里显示 `(newapi · 当前表单)` 这类调试/来源说明。
- 模型候选的切换字段仍由 `features/settings/apiSettings/apiModelSwitchService.js` 提供，悬浮球只消费 `displayLabel/model/id`，不得直接读取设置页 DOM。

## v0.2.11 docs flattening and request detail fullscreen

- `docs/0.1` is the canonical 0.1 historical architecture document directory. Do not create a nested `docs/0.1/caifen` folder.
- `features/debugConsole` owns request console rendering and readable detail formatting. It may render inside `features/quickDock`, but quickDock only owns the entry and panel container.
- Request detail display must use real line breaks for model content and prompt text. Do not show literal `\n` in the readable detail panel.

## v0.2.12 docs root allowlist

- `docs/` 根路径只允许：`0.1`、`0.2`、`css-ownership.md`、`release-plan.md`、`smoke-memory.md`、`VERSIONING.md`、`README.md`。
- `docs/0.1` 直接承载历史架构文档，不允许再出现 `docs/0.1/caifen`。
- `docs/0.2` 直接承载 v0.2.x release 文档，不再在根路径同步 `release-v0.2.x-plan.md`。
- `docs/caifen`、`docs/other`、`docs/versioning.md` 均不再保留。
- `v0.3.x` 已开启；长期记忆脑文档进入 `docs/0.3`。

## v0.2.13 app structure consolidation

- 首页 App 分组 owner 是 `features/home/homeAppCatalog`，只定义入口元数据，不绑定 DOM。
- `data-management-screen` 是数据管理聚合入口，owner 为 `features/dataManagement`；备份必须走 `cloudBackup.publicApi`，控制台必须走 `debugConsole.publicApi`，不得复制 GitHub 或请求控制台逻辑。
- `magic-room-screen` 保留旧 screen ID 和旧业务绑定，用户可见名称改为“提示词”；新 `features/promptCenter` 只提供兼容 facade，不重写提示词业务。
- `appearance-settings-screen` 聚合壁纸、自定义、白昼模式、夜间模式入口；旧 `wallpaper-screen`、`customize-screen`、`day-mode-btn`、`night-mode-btn` 保留兼容，但不再作为首页独立入口。

## v0.2.14 app merge closure

- Dock 栏第一个入口是 `api-settings-screen`；Dock 只作为图标快捷区，不允许额外白色背景或独立卡片样式。
- `features/dataManagement` 是数据管理 App 的 owner。控制台、存储分析、教程、备份和 GitHub 配置必须直接内嵌在 `data-management-screen`，不得再通过数据管理按钮二次跳转到 `tutorial-screen` 或 `storage-analysis-screen`。
- `renderTutorialContent(container)` 是旧教程内容嵌入式兼容口；新增业务不得继续扩写教程页作为新 owner。
- 壁纸、自定义、白昼 / 夜间模式归 `appearance-settings-screen` 展示；主页和 Dock 不再暴露旧壁纸 / 自定义独立入口。

## v0.2.17 unified console host closure

- 全局只有一套控制台数据源：`platform/observability/operationTraceService` 是主要操作写入口，`platform/observability/traceStore` 是统一 trace facade，`platform/ai/requestTraceStore` 是 request/diagnostic backing store。
- 全局只有一套控制台 renderer：`features/debugConsole/view.js`。它负责列表、分类、详情、复制和真实换行展示。
- `features/quickDock` 可以作为控制台宿主：点击悬浮球“控制台”必须在悬浮球里打开 `console` 面板，不跳转到数据管理页。
- `features/dataManagement` 只保留控制台入口说明和数据管理内容，不再内嵌第二个控制台面板，也不得复制列表/详情逻辑。
- `features/debugConsole` 不得自动挂独立浮动按钮；入口只由宿主模块提供。
- 首页第一屏不放 Data Management / Prompt / Appearance 三个 Dock-only app，Dock 栏保留 API、数据管理、提示词、外观设置。
- 控制台普通详情必须把字面量 `\n` 转成真实换行；原始 JSON 可作为详情末尾保留，但不能替代可读详情。
- 聊天新增消息的兼容接入口暂为 `js/modules/chat_render.js::addMessageBubble`，后续拆聊天 service 时再迁到 canonical message event service。


## v0.2.17 operation trace coverage

- `platform/observability/operationTraceService` is the only preferred cross-feature operation trace writer; it sanitizes token/key fields and forwards to `traceStore`. `traceStore` remains the lower-level facade and exposes `recordOperationStart`, `recordOperationSuccess`, `recordOperationFailure`, and `withOperation`.
- `features/debugConsole` remains the only console renderer.
- `features/quickDock` remains the console host; `features/dataManagement` only opens that host and does not render a second console.
- Main operation coverage added in this release: API model switching, GitHub backup/restore/status/config, data export/import/cleaning, storage analysis/image compression, prompt center, memory table整理, avatar recognition, and sticker recognition.
- Status bar prompt injection and memory redesign remain out of scope for v0.2.17.


## v0.3.0 Memory Brain ownership

- `core/memoryBrain` owns pure Memory Brain semantics: layers, migration stages, event/fact/family/graph/model/injection shapes.
- `platform/memoryBrain` owns `db.memoryBrain`, legacy source scanning and replacement reports.
- `features/memoryBrain` owns the Memory Brain app shell and user-facing migration/status UI.
- Old memory systems (`memory_table`, `vector_memory`, `journal`) remain read-only sources for v0.3.0; they are not dual-written by Memory Brain.
- Formal chat prompt injection still belongs to the existing legacy memory paths until a later shadow-injection gate proves Memory Brain can replace them safely.
- Replacement policy: one official injection owner at a time; v0.3.0 never injects Memory Brain output into chat requests.
