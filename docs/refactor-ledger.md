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
| Netlify 静态构建 | `tools/netlify-build.js` / `netlify.toml` | 无 | `superseded by V5 direct deploy` | V4 曾准备 dist 构建；V5 已改为默认直接发布，dist 脚本仅作为可选路径 |

V4 之后，`db.js` 仍是 Dexie 初始化、migration、load repair 和 private writer 的 legacy owner。下一版如果继续拆 `db.js`，优先拆 `initDatabase` 周边的 Dexie adapter，但仍不能复制 writer。

## V5 已登记

| 状态块 | canonical owner | legacy / 兼容点 | 状态 | 说明 |
|---|---|---|---|---|
| Netlify 直接发布路径 | `netlify.toml publish = "."` | Netlify UI 构建命令留空 | `canonical deploy path` | V5 修正 V4 的 dist 构建默认值，避免 `netlify.toml` 覆盖 UI 后继续执行构建脚本 |
| 可选 dist 发布脚本 | `tools/netlify-build.js` | 无 | `optional` | 只在未来显式切换到 `publish = "dist"` 时使用；直接发布模式不运行 |
| `initDatabase` | `OwoApp.platform.storage.dexieAdapter.initDatabase` | `window.initDatabase` / 旧全局 `initDatabase` | `canonical facade` | `db.js` 只负责把返回的 Dexie 实例回填到 legacy `dexieDB` 变量 |
| Dexie schema 注册 | `OwoApp.platform.storage.dexieAdapter.createDatabase` | `js/db.js::initDatabase` | `canonical` | `version(1/2/3).stores(...)` 不再由 `db.js` 拥有 |
| Dexie v2 旧数据迁移 | `OwoApp.platform.storage.dexieMigrations.migrateLegacyStorageRecordToVersion2` | 原 `db.js` upgrade callback | `canonical` | 只处理旧 `storage` 表迁移，不读写运行时 `db` |
| 保存 writer | `js/db.js` private writer + `OwoApp.platform.storage.repository` public facade | `window.saveData` 等旧入口 | `unchanged` | V5 不复制 writer，继续保持 V3 单写路径 |

V5 之后，部署默认只有一条路径：Netlify 直接发布项目根目录。不要同时保留 UI 空构建命令和 `netlify.toml build.command`。

V5 的 Dexie 拆分只移动 schema/migration ownership，不移动保存 writer。`legacySaveDataImpl` 等 private writer 仍在 `js/db.js`，并且仍只能注册到 repository 一次。下一刀应拆 `loadData` 后的字段修复逻辑到 `platform/storage/loadRepair.js` 或 `app/state/repair.js`，但仍不能改公开保存入口。

## V6：loadData repair shell

| 符号 / 职责 | canonical owner | legacy 入口 / 调用方 | 状态 | 说明 |
|---|---|---|---|---|
| `applyLoadedTables` | `OwoApp.platform.storage.loadRepair.applyLoadedTables` | `js/db.js::loadData` | canonical | IndexedDB 读表结果写回内存 db，只保留一份实现 |
| `hydrateGlobalSettings` | `OwoApp.platform.storage.loadRepair.hydrateGlobalSettings` | `js/db.js::loadData` | canonical | 合并 globalSettings 与默认值 |
| `repairLoadedData` | `OwoApp.platform.storage.loadRepair.repairLoadedData` | `js/db.js::loadData` | canonical | 角色、群组、根状态字段补齐和旧头像库迁移 |
| `migrateLegacyLocalStorage` | `OwoApp.platform.storage.loadRepair.migrateLegacyLocalStorage` | `js/db.js::loadData` | canonical | 旧 `gemini-chat-app-db` localStorage 迁移 |

V6 只移动 load repair ownership；保存 writer 仍由 V3 单写路径管理。

## V7：storage analysis owner

| 符号 / 职责 | canonical owner | legacy 入口 / 调用方 | 状态 | 说明 |
|---|---|---|---|---|
| `dataStorage.getStorageInfo` | `OwoApp.platform.storage.storageAnalysis.dataStorage.getStorageInfo` | 旧脚本全局 lexical `dataStorage`，例如 `js/modules/storage.js` | canonical | V7 把存储占用估算从 `db.js` 移到 `platform/storage/storageAnalysis.js` |
| `computeStorageInfo` | `OwoApp.platform.storage.storageAnalysis.computeStorageInfo` | 无 | canonical | 纯计算当前 db 快照的分类占用，不读写持久化 |
| `createDataStorage` / `bindDataStorage` | `OwoApp.platform.storage.storageAnalysis` | `js/db.js` 绑定 legacy `db` / `loadData` | canonical | `db.js` 只注入旧运行时依赖，不保留分析实现 |

V7 没有迁移保存 writer，也没有改变 `saveData` 路径。存储分析只能读内存快照，不能写 Dexie，不能调用保存函数。

## V8：backup / file adapter owner

| 符号 / 职责 | canonical owner | legacy 入口 / 调用方 | 状态 | 说明 |
|---|---|---|---|---|
| `createFullBackupData` | `OwoApp.platform.storage.backupAdapter.legacyBackupApi.createFullBackupData` | `window.createFullBackupData` / 旧脚本全局 `createFullBackupData` | canonical | 完整备份数据结构归 backupAdapter，教程页只转发 |
| `createPartialBackupData` | `OwoApp.platform.storage.backupAdapter.legacyBackupApi.createPartialBackupData` | `window.createPartialBackupData` / 分类导出按钮 | canonical | 分类导出格式归 backupAdapter |
| `importPartialBackupData` | `OwoApp.platform.storage.backupAdapter.legacyBackupApi.importPartialBackupData` | `window.importPartialBackupData` / 分类导入按钮 | canonical | 分类导入只通过注入的 repository saveData 保存 |
| `importBackupData` | `OwoApp.platform.storage.backupAdapter.legacyBackupApi.importBackupData` | `window.importBackupData` / 本地导入和 GitHub 恢复 | canonical | 完整恢复编排归 backupAdapter |
| gzip / 文件下载 / 文件读取 | `OwoApp.platform.browser.fileAdapter` | `js/modules/tutorial.js` | canonical | 浏览器文件能力归 platform/browser，不承载业务语义 |

V8 没有迁移保存 writer。恢复数据时最终仍通过：

```text
backupAdapter.importBackupData()
  -> saveData(db)
  -> OwoApp.platform.storage.repository.saveData()
  -> js/db.js::legacySaveDataImpl()
```

## V9 / V10：storage writer owner flip + db.js shell

| 符号 / 职责 | canonical owner | legacy 入口 / 调用方 | 状态 | 说明 |
|---|---|---|---|---|
| `saveData` 实际写入 | `OwoApp.platform.storage.dexieWriter.createWriters().saveData` | `saveData` / `window.saveData` → repository | canonical writer | V9 起不再由 `js/db.js::legacySaveDataImpl` 写入 IndexedDB |
| `saveCharacter` 实际写入 | `OwoApp.platform.storage.dexieWriter.createWriters().saveCharacter` | `saveCharacter` / `window.saveCharacter` → repository | canonical writer | 单角色写入归 dexieWriter |
| `saveGroup` 实际写入 | `OwoApp.platform.storage.dexieWriter.createWriters().saveGroup` | `saveGroup` / `window.saveGroup` → repository | canonical writer | 单群组写入归 dexieWriter |
| `saveGlobalSettings` 实际写入 | `OwoApp.platform.storage.dexieWriter.createWriters().saveGlobalSettings` | `saveGlobalSettings` / `window.saveGlobalSettings` → repository | canonical writer | 全局设置写入归 dexieWriter |
| `loadData` 读取编排 | `OwoApp.platform.storage.dexieReader.createLoadData` | 旧全局 lexical `loadData` | canonical reader | V10 起 `db.js` 只创建 alias，不再读 Dexie 表 |
| `BLOCKED_API_DOMAINS` / `colorThemes` / `defaultIcons` / `peekScreenApps` / `appVersion` | `js/app/state/staticConfigBase.js` | 旧脚本全局 lexical 常量 | canonical static config | 从 `db.js` 移出，仍保持旧名字可直接访问 |
| `updateLog` | `updateLogRecent.js` + `updateLogArchive.js` + `staticConfig.js` | 旧脚本全局 lexical `updateLog` | canonical static config | 为遵守单文件行数预算拆为两个数据分片和一个聚合文件 |
| `db` / `currentChatId` / `dexieDB` 等 runtime globals | `js/app/state/runtimeGlobals.js` | 旧脚本全局变量 | canonical runtime globals | 旧代码继续读写同名全局变量，`db.js` 不再拥有这些声明 |

阶段 2 完成后，`js/db.js` 的职责只剩 compatibility shell：注册一次 writer、暴露旧保存入口、绑定旧 `dataStorage` alias。后续不得把新的存储逻辑写回 `db.js`。

## V11：utils.js UI / platform 第二轮拆分

| 符号 | canonical owner | legacy alias | 状态 | 说明 |
|---|---|---|---|---|
| `updateBatteryStatus` | `OwoApp.platform.browser.updateBatteryStatus` | `window.updateBatteryStatus` | canonical | Battery Status API 和旧电池 widget DOM 更新迁出 `utils.js` |
| `showToast` | `OwoApp.shared.ui.showToast` | `window.showToast` | canonical | Toast 队列和展示迁出 `utils.js` |
| `getFriendlyErrorMessage` | `OwoApp.shared.ui.getFriendlyErrorMessage` | `window.getFriendlyErrorMessage` | canonical | 通用错误文案映射迁出 `utils.js` |
| `showErrorModal` | `OwoApp.shared.ui.showErrorModal` | `window.showErrorModal` | canonical | 错误弹窗 DOM 迁出 `utils.js` |
| `showApiError` | `OwoApp.shared.ui.showApiError` | `window.showApiError` | canonical | API 错误展示入口迁出 `utils.js` |
| `triggerHapticFeedback` | `OwoApp.platform.browser.hapticAdapter.createHapticFeedback` | `window.triggerHapticFeedback` | canonical | navigator.vibrate 封装迁出 `utils.js`，业务开关通过注入保留 |

## V12：AI provider config/model 收口

| 符号 / 职责 | canonical owner | legacy 使用点 | 状态 | 说明 |
|---|---|---|---|---|
| `normalizeProviderSettings` | `OwoApp.platform.ai.providerConfig.normalizeProviderSettings` | `chat_ai.js` | canonical | 归一化 provider/url/key/model，不发请求，不处理 stream |
| `selectChatProviderConfig` | `OwoApp.platform.ai.providerConfig.selectChatProviderConfig` | `getAiReply` | canonical | 主聊天按 summary/background/main 场景选择配置，streamEnabled 仍读取主 API 设置 |
| `selectImageRecognitionProviderConfig` | `OwoApp.platform.ai.providerConfig.selectImageRecognitionProviderConfig` | `generateImageDescription` | canonical | 图片识别专用 API 已配置时使用专用配置，否则回退主 API |
| `selectSummaryProviderConfig` | `OwoApp.platform.ai.providerConfig.selectSummaryProviderConfig` | `generateCallSummary` | canonical | 通话总结优先使用 summary API，否则回退主 API |
| `selectMainProviderConfig` | `OwoApp.platform.ai.providerConfig.selectMainProviderConfig` | `getCallReply` | canonical | 视频/语音通话继续使用主 API 配置 |
| `getMainTemperature` / `isMainQuickReplyEnabled` / `isMainTimePerceptionEnabled` / `isOnlineRoleEnabled` | `OwoApp.platform.ai.providerConfig` | `chat_ai.js` prompt/request 构建处 | canonical | 只收口配置读取，不移动 prompt builder，不移动请求发送 |

V12 只移动 provider 配置读取 ownership。`fetchAiResponse`、`normalizeMessagesForProvider`、`processStream`、endpoint/header/requestBody 构造仍保留原 owner，留到 V13/V14/V15 分别处理，避免一次性改动 fetch 和 stream 主链路。

## V13：AI provider request adapter 收口

| 符号 / 职责 | canonical owner | legacy 使用点 | 状态 | 说明 |
|---|---|---|---|---|
| `buildEndpoint` | `OwoApp.platform.ai.providerRequestAdapter.buildEndpoint` | `chat_ai.js` 发起 fetch 前读取 endpoint | canonical | OpenAI-like `/v1/chat/completions` 与 Gemini `generateContent/streamGenerateContent` endpoint 统一组装 |
| `buildHeaders` | `OwoApp.platform.ai.providerRequestAdapter.buildHeaders` | `chat_ai.js` 发起 fetch 前读取 headers | canonical | Content-Type 与 Bearer token 统一组装；Gemini key 仍走 endpoint query |
| `buildOpenAiChatRequest` | `OwoApp.platform.ai.providerRequestAdapter.buildOpenAiChatRequest` | 主聊天非 Gemini 请求 | canonical | 只组装 requestBody/fetchOptions，不发起 fetch |
| `buildGeminiContentRequest` | `OwoApp.platform.ai.providerRequestAdapter.buildGeminiContentRequest` | 主聊天 Gemini 请求 | canonical | 复用原有 contents/system_instruction 结构，不改 stream 解析 |
| `buildMessageCompletionRequest` | `OwoApp.platform.ai.providerRequestAdapter.buildMessageCompletionRequest` | 通话回复请求 | canonical | 保留旧通话 requestBody 形状，OpenAI/Gemini 差异集中到 adapter |
| `buildPromptCompletionRequest` | `OwoApp.platform.ai.providerRequestAdapter.buildPromptCompletionRequest` | 通话总结请求 | canonical | prompt-only completion 统一组装 |
| `buildImageDescriptionRequest` | `OwoApp.platform.ai.providerRequestAdapter.buildImageDescriptionRequest` | 图片描述请求 | canonical | 图片识别 requestBody 统一组装；图片压缩/转 base64 仍在旧函数内 |
| `applyWebSearchPayload` | `OwoApp.platform.ai.providerRequestAdapter.applyWebSearchPayload` | 主聊天联网搜索请求 | canonical | 自定义联网 payload 或 provider 默认 tools 统一处理 |

V13 只移动 endpoint/header/request body/fetch option 组装 ownership。`fetch()` 调用、`processStream()`、非流式响应解析、prompt builder、`normalizeMessagesForProvider()` 仍保留在旧 owner，留到 V14/V15 分步处理，避免一次性重写 AI 主链路。

## V14：chat message semantics/model 收口

| 符号 / 职责 | canonical owner | legacy 入口 / 调用方 | 状态 | 说明 |
|---|---|---|---|---|
| `aiMessageContentToText` | `OwoApp.core.chat.messageSemantics.aiMessageContentToText` | `window.aiMessageContentToText` / 旧 `utils.js` 调用 | canonical | 把 string / array parts / image marker 转成文本，纯语义，不接触 DOM / storage |
| `wrapSystemMessageForCompat` | `OwoApp.core.chat.messageSemantics.wrapSystemMessageForCompat` | `window.wrapSystemMessageForCompat` | canonical | Claude 兼容路径里把 system 内容包成 user message 文本 |
| `mergeAdjacentCompatMessages` | `OwoApp.core.chat.messageSemantics.mergeAdjacentCompatMessages` | `window.mergeAdjacentCompatMessages` | canonical | provider 兼容时合并相邻同角色纯文本消息 |
| `normalizeMessagesForProvider` | `OwoApp.core.chat.messageSemantics.normalizeMessagesForProvider` | `window.normalizeMessagesForProvider` / `block_system.js` / `theater.js` 等旧调用 | canonical | provider message role/content 归一化；`chat_ai.js` 改走 `chatAiMessageSemantics` |
| OpenAI message → Gemini contents 映射 | `OwoApp.core.chat.messageSemantics.openAiMessagesToGeminiContents` | `providerRequestAdapter.js` | canonical | V13 adapter 不再保留 message 映射实现，只消费 core 语义 |

V14 只移动 message role/content/parts 归一化。没有迁移 prompt builder、fetch、stream 解析、响应解析，也没有改变主聊天构造 `contents/messages` 的业务编排。

## V15：prompt builder pieces / context 收口

| 符号 / 职责 | canonical owner | legacy 使用点 | 状态 | 说明 |
|---|---|---|---|---|
| `getActiveWorldBooksContents` | `OwoApp.core.chat.promptSemantics.getActiveWorldBooksContents` | `chat_ai.js` wrapper / token breakdown | canonical | 世界书 before/middle/after 选择逻辑迁入 core，运行时状态通过 `{ state }` 注入 |
| `getEffectivePersona` | `OwoApp.core.chat.promptSemantics.getEffectivePersona` | `chat_ai.js` wrapper | canonical | 论坛 / peek 补齐人设拼接逻辑迁入 prompt pieces |
| `formatPeekContentForPrompt` | `OwoApp.core.chat.promptSemantics.formatPeekContentForPrompt` | `chat_ai.js` wrapper | canonical | 偷看记录摘要归 prompt context |
| `formatUserPhoneStateForPrompt` | `OwoApp.core.chat.promptSemantics.buildUserPhoneStatePrompt` | `chat_ai.js` wrapper | canonical | core 只返回文本和消费字段；删除瞬时字段仍由 wrapper 执行 |
| `getOnlineLogicRules` | `OwoApp.core.chat.promptSemantics.getOnlineLogicRules` | `chat_ai.js` wrapper | canonical | 线上逻辑规则归 prompt pieces，贴纸列表通过 `{ state }` 注入 |
| `getOnlineOutputFormats` / `getOfflineOutputFormats` | `OwoApp.core.chat.promptSemantics` | `chat_ai.js` wrapper | canonical | 输出格式片段归 prompt pieces，不改变原输出格式 |
| `getInjectedFormatsPrompt` | `OwoApp.core.chat.promptSemantics.getInjectedFormatsPrompt` | `chat_ai.js` wrapper | canonical | 节点注入格式归 prompt pieces |
| `HUMAN_RUN_PROMPT` / `estimateTokenFromText` | `OwoApp.core.chat.promptSemantics` | `chat_ai.js` wrapper / token breakdown | canonical | 活人运转提示词常量和 token 估算归 prompt pieces |

V15 没有整体迁移 `generatePrivateSystemPrompt()`，也没有移动 `fetch()`、`processStream()`、非流式响应解析。主 builder 仍留在 `chat_ai.js`，只消费新的 prompt pieces/context owner。

## V16：chat render/view 拆分

| 符号 / 职责 | canonical owner | legacy 入口 / 调用方 | 状态 | 说明 |
|---|---|---|---|---|
| `createMessageViewModel` | `OwoApp.features.chat.messageViewModel.createMessageViewModel` | `chat_render.js` | canonical | 消息渲染前的 role/content/isThinking/avatar/time/bilingual view model 归一化 |
| `formatTimestampByFormat` | `OwoApp.features.chat.messageViewModel.formatTimestampByFormat` | `chat_render.js::formatTimestampByFormat` wrapper | canonical | 时间格式 view model 归一化从 legacy renderer 中移出 |
| `renderMessageBubble` | `OwoApp.features.chat.renderMessageBubble.renderMessageBubble` | `chat_render.js::createMessageBubbleElement` wrapper | canonical entry | 新渲染入口统一到 features/chat；旧 `createMessageBubbleElement` 只转发 |
| legacy DOM renderer | `js/modules/chat_render.js::legacyCreateMessageBubbleElement` | `renderMessageBubble.setLegacyRenderer()` | legacy-dom-renderer | V16 不一次性迁移全部 DOM 卡片细节，避免消息保存/AI 请求/stream 变化 |

V16 只移动渲染入口和 view model ownership。`chat_render.js` 内部 DOM 细节仍作为 legacy renderer 注册给 canonical facade；消息保存、AI 请求、stream 解析均不改变。后续如果继续拆 render DOM，应按卡片类型分批迁移，不允许重新让 `createMessageBubbleElement` 承担新逻辑。

## V17：settings shell + public facade

| 符号 / 职责 | canonical entry | legacy 实现 | 状态 | 说明 |
|---|---|---|---|---|
| `setupChatSettings` | `OwoApp.features.settings.publicApi.setupChatSettings` | `js/settings.js::setupChatSettings` | canonical-entry | 聊天设置 setup 入口先进入 settings public facade，具体实现暂留 legacy |
| `setupApiSettingsApp` | `OwoApp.features.settings.publicApi.setupApiSettingsApp` | `js/settings.js::setupApiSettingsApp` | canonical-entry | API 设置 UI/预设细节暂不拆，V18 再迁移 |
| `setupWallpaperApp` | `OwoApp.features.settings.publicApi.setupWallpaperApp` | `js/settings.js::setupWallpaperApp` | canonical-entry | 壁纸设置入口先收口，内部逻辑暂留 legacy |
| `setupPresetFeatures` | `OwoApp.features.settings.publicApi.setupPresetFeatures` | `js/settings.js::setupPresetFeatures` | canonical-entry | preset 体系入口先收口，V20 再做 preset engine |
| `setupCustomizeApp` | `OwoApp.features.settings.publicApi.setupCustomizeApp` | `js/settings.js::setupCustomizeApp` | canonical-entry | 自定义设置入口先收口，内部功能后续分模块迁移 |
| settings legacy registry | `OwoApp.features.settings.settingsShell` | `js/settings.js` 末尾注册 legacy 函数 | shell | 第二次注册不同实现会报错，防止 settings setup 出现两套实现 |

V17 只建立 settings feature 出口，不拆 `settings.js` 内部业务逻辑。后续新增设置子模块必须放到 `features/settings/<submodule>`，通过 `features/settings/public.js` 暴露稳定 API；旧 `settings.js` 只能逐步变成 compatibility shell。

## V18：API 设置模块拆分

| 符号 / 职责 | canonical owner | legacy 入口 / 调用方 | 状态 | 说明 |
|---|---|---|---|---|
| `setupApiSettingsApp` | `OwoApp.features.settings.apiSettings.publicApi.setupApiSettingsApp` | `window.setupApiSettingsApp` / settings public facade | canonical-entry | API 设置 setup 入口迁入 `features/settings/apiSettings`；`settings.js` 只保留 wrapper |
| 主 API 设置 UI | `OwoApp.features.settings.apiSettings.mainApiSettingsView.bindMainApiSettings` | `js/settings.js::setupApiSettingsApp` wrapper | canonical | 主 API provider/url/key/model、开关、temperature 保存逻辑从 `settings.js` 迁出 |
| 主 API preset CRUD | `OwoApp.features.settings.apiSettings.apiPresetService` + `mainApiSettingsView` | `_getApiPresets` / `populateApiSelect` 等 wrapper | canonical | 预设数组 CRUD 归 service，DOM 绑定归 view |
| 副 API 设置 UI | `OwoApp.features.settings.apiSettings.subApiSettingsView` | `setupSubApiSettings` / `setupSubApiPresets` wrapper | canonical | summary/background/vector/supplementPersona/peek/imageRecognition/stickerRecognition 设置 UI 迁出 |
| 设置页模型列表拉取 | `OwoApp.features.settings.apiSettings.apiModelListService` | `window.fetchAndPopulateModels` | canonical | 仅用于设置页拉取模型列表，不处理聊天 `fetchAiResponse` / stream |
| 天气 API 设置 UI | `OwoApp.features.settings.apiSettings.weatherApiSettingsView` | `setupApiSettingsApp` 内部调用 | canonical | 全局天气 provider/key 设置归 API settings 子模块 |

V18 只迁移 API 设置 UI / preset service / 设置页模型列表拉取。没有修改 `chat_ai.js`、没有迁移聊天 provider `fetch()`、没有重写 stream 解析。NovelAI / GPT 生图设置仍暂留 `settings.js`，由新 `setupApiSettingsApp()` 在运行时调用旧 `setupNovelAiSettings()` / `setupGptImageSettings()`。

## V18.1 API Settings Review Fix

- `features/settings/apiSettings/*` 保存入口：修正为 `OwoApp.platform.storage.repository.saveData()`，旧 `saveData()` 不再被新 API settings 文件直接调用。
- `features/settings/apiSettings/*` UI 提示：优先使用 `OwoApp.shared.ui`，旧 `showToast/showApiError` 只作为 fallback。
- `mainApiSettingsView.renderMainPresetRow`：修复 preset 名称 / provider 文本的动态 `innerHTML` 拼接。
- `apiPresetService.applyPresetToForm`、主/副 API 表单初始化：使用 DOM `option` 创建，避免模型名拼接 HTML。
- `tools/arch-check.js`：增加 V18.1 API settings gate。

## V19 appearance / theme / wallpaper / font split

- `setupWallpaperApp` canonical owner: `OwoApp.features.settings.appearance.publicApi.setupWallpaperApp`.
- `populateFontPresetSelect / saveCurrentFontAsPreset / applyFontPreset / openFontManageModal` canonical owner: `OwoApp.features.settings.appearance.publicApi`.
- `populateWidgetWallpaperPresetSelect / saveCurrentWidgetWallpaperAsPreset / applyWidgetWallpaperPreset / openWidgetWallpaperManageModal / exportWidgetWallpaperScheme / importWidgetWallpaperScheme / resetWidgetWallpaperToDefault` canonical owner: `OwoApp.features.settings.appearance.publicApi`.
- `setupNightModeBindings / applyNightMode / setupStatusBarBindings / applyHomeStatusBar` canonical owner: `OwoApp.features.settings.appearance.publicApi`.
- `js/settings.js` now keeps compatibility wrappers only for the migrated appearance APIs.
- V19 intentionally does not touch API settings, `chat_ai.js`, provider fetch, or stream parsing.

## V20：preset engine 统一 + 账号密码解锁暂停

| 符号 / 职责 | canonical owner | 使用点 | 状态 | 说明 |
|---|---|---|---|---|
| 通用预设数组语义 | `OwoApp.features.settings.presetEngine.model` | API/font/widget-wallpaper preset service/view | canonical | 统一名称归一化、upsert、rename、remove、merge，不绑定 DOM |
| 预设 state/key store | `OwoApp.features.settings.presetEngine.presetEngineService` | `apiPresetService` / `fontPresetView` / `widgetWallpaperPresetView` | canonical | 统一 `state[key]` 读写和导入合并，不调用保存 |
| API preset CRUD | `OwoApp.features.settings.presetEngine.publicApi` + `apiPresetService` | API 设置页 | canonical | `apiPresetService` 只保留 API 表单数据映射 |
| Font preset CRUD | `OwoApp.features.settings.presetEngine.publicApi` + `fontPresetView` | 外观设置页 | canonical | `fontPresetView` 不再直接维护 `db.fontPresets` 数组 CRUD |
| Widget wallpaper preset CRUD | `OwoApp.features.settings.presetEngine.publicApi` + `widgetWallpaperPresetView` | 外观设置页 | canonical | `widgetWallpaperPresetView` 不再直接维护 `db.widgetWallpaperPresets` 数组 CRUD |
| 账号密码启动门禁 | `OwoApp.app.authGate` | `main.js` DOMContentLoaded | paused | `AUTH_GATE_ENABLED = false`，启动时直接进入应用，不请求远端验证 API |

V20 不迁移 TTS / COT 预设，不修改 `chat_ai.js`、provider fetch、stream、prompt builder。

## V21：TTS / voice / CoT 设置拆分

| 符号 / 职责 | canonical owner | legacy 入口 / 调用方 | 状态 | 说明 |
|---|---|---|---|---|
| TTS 预设 UI | `OwoApp.features.settings.voiceCot.ttsPresetView` | `settings.js` wrappers / TTS preset buttons | canonical | 保存、应用、管理、导入、导出 TTS preset；不改 TTS 合成和播放 |
| `saveCurrentTTSAsPreset / applyTTSPreset / populateTTSPresetSelect / openTTSManageModal / importTTSPresets / exportTTSPresets` | `OwoApp.features.settings.voiceCot.publicApi` | global lexical wrappers in `settings.js` | compat-wrapper | 旧函数名仍可调用，但实现只在 voiceCot 子模块 |
| 音色预设 UI | `OwoApp.features.settings.voiceCot.voicePresetView` | voice preset buttons / `settings.js` wrappers | canonical | 角色/用户音色 preset 保存、应用、管理；不改 `VoiceSelector` 音色选择器逻辑 |
| `populateVoicePresetSelect / saveCurrentVoiceAsPreset / applyVoicePreset / openVoicePresetManageModal` | `OwoApp.features.settings.voiceCot.publicApi` | global lexical wrappers in `settings.js` | compat-wrapper | 旧函数名仍可调用，但实现只在 voiceCot 子模块 |
| 单角色 CoT 设置读写 | `OwoApp.features.settings.voiceCot.cotCharacterSettingsView` | `setupChatSettings` load/save 调用 | canonical | 只迁移聊天设置页中的 CoT 开关和预设下拉读写 |
| `initCotSettings` | `OwoApp.features.settings.voiceCot.publicApi.initCotSettings` | `js/modules/cot_settings.js` registers legacy implementation | canonical-entry | CoT 设置页完整编辑器仍在 legacy `cot_settings.js`，入口由 voiceCot public facade 收口 |

V21 不改 `chat_ai.js`、provider fetch、stream、prompt builder、TTS 合成播放服务、CoT prompt 语义。后续若拆 `cot_settings.js` 本体，应单独做 CoT editor 模块切片。

## V22：settings legacy shell 收口

| 符号 / 职责 | canonical owner | legacy 入口 / 调用方 | 状态 | 说明 |
|---|---|---|---|---|
| `setupApiSettingsApp` | `OwoApp.features.settings.apiSettings.publicApi.setupApiSettingsApp` | `window.setupApiSettingsApp` | canonical-entry | V22 后不允许注册到 `settingsShell`；settings public facade 强制走 API settings 子模块 |
| `setupWallpaperApp` | `OwoApp.features.settings.appearance.publicApi.setupWallpaperApp` | `window.setupWallpaperApp` | canonical-entry | V22 后不允许注册到 `settingsShell`；旧入口只转发 appearance public facade |
| `setupNightModeBindings` | `OwoApp.features.settings.appearance.publicApi.setupNightModeBindings` | `window.setupNightModeBindings` | canonical-entry | V22 后不允许注册到 `settingsShell`；旧入口只转发 appearance public facade |
| `setupStatusBarBindings` | `OwoApp.features.settings.appearance.publicApi.setupStatusBarBindings` | `window.setupStatusBarBindings` | canonical-entry | V22 后不允许注册到 `settingsShell`；旧入口只转发 appearance public facade |
| `initCotSettings` | `OwoApp.features.settings.voiceCot.publicApi.initCotSettings` | `window.initCotSettings` / `main.js` | canonical-entry | CoT 设置页完整实现仍由 `cot_settings.js` 注册到 voiceCot entry；settingsShell 不参与 |
| settings legacy shell 剩余入口 | `OwoApp.features.settings.settingsShell` | `setupChatSettings / loadSettingsToSidebar / setupMagicRoomApp / setupPresetFeatures / setupCustomizeApp` | legacy-shell | 只保留尚未拆分的设置入口；后续阶段不能把已迁移入口写回 legacy shell |

## V23：memory table 垂直切片第一刀

| 符号 / 职责 | canonical owner | legacy 入口 / 调用方 | 状态 | 说明 |
|---|---|---|---|---|
| 模板 / 字段 / 行纯语义 | `OwoApp.core.memory.tableSemantics` | `js/modules/memory_table.js` aliases | canonical | `normalizeTemplate / normalizeFieldValue / createStarterTemplate / getFieldDisplayValue` 等纯函数迁出 legacy 大文件 |
| `chat.memoryTables` 状态模型 | `OwoApp.features.memoryTable.model` | `js/modules/memory_table.js` aliases | canonical | `ensureMemoryTableState / ensureTemplateDataForChat / setFieldValue / addRow / autoUpdate cursor` 等状态模型迁出 |
| 运行时 state 绑定 | `OwoApp.features.memoryTable.service` | `getCurrentMemoryTableChat / getBoundTemplates` wrappers | canonical | 只绑定 `db/currentChatId/currentChatType`，不写 prompt 和 vector memory |
| 列表 view model / 安全文本格式化 | `OwoApp.features.memoryTable.view` | `getVisibleFieldItems / escapeHtml / formatDateTime` wrappers | canonical | 只做展示数据整理，不直接操作 DOM |
| public facade | `OwoApp.features.memoryTable.publicApi` | 后续 memory table 子模块入口 | canonical-entry | 只导出 `semantics/model/service/view` 和 routing report，不写业务逻辑 |

V23 不改 `chat_ai.js` prompt builder、不改 `vector_memory.js`、不改结构化记忆自动更新请求流程。`js/modules/memory_table.js` 仍保留 DOM 渲染、转换弹窗和 AI 更新编排，后续阶段再按 view/service 继续拆。

## V24：vector memory 垂直切片第一刀

| 符号 / 职责 | canonical owner | legacy 入口 / 调用方 | 状态 | 说明 |
|---|---|---|---|---|
| embedding provider 配置 / 请求 | `OwoApp.platform.ai.embeddingAdapter` | `js/modules/vector_memory.js` runtime wrapper | canonical | `selectEmbeddingProviderConfig / fetchEmbeddingBatch / fetchEmbeddings / cosineSimilarity` 迁出 legacy 向量记忆大文件 |
| 向量模板和 `chat.vectorMemory` 状态模型 | `OwoApp.features.vectorMemory.model` | `window.ensureVectorMemoryState` / `vector_memory.js` wrappers | canonical | 模板 store、状态补齐、entry normalization、历史、自动总结游标归 model |
| 向量记忆上下文检索 | `OwoApp.features.vectorMemory.contextService` | `window.getVectorMemoryContextBlock` / `window.prepareVectorMemoryContext` | canonical | query 构造、fallback 词法召回、embedding 检索、context block 缓存归 context service |
| 向量 entry embedding 补齐 | `OwoApp.features.vectorMemory.contextService` + `OwoApp.platform.ai.embeddingAdapter` | `vector_memory.js` wrappers | canonical | entry 新增 / 导入时补 embedding 由 context service 调 platform adapter |
| public facade | `OwoApp.features.vectorMemory.publicApi` | 后续 vector memory 子模块入口 | canonical-entry | 只导出 model/context routing report，不写业务逻辑 |

V24 不改 `chat_ai.js` prompt 主编排，不改 `getVectorMemoryContextBlock` 在 `chat_ai.js` 中的调用方式，不改 vector memory UI DOM 渲染和转换弹窗流程。`js/modules/vector_memory.js` 继续作为 legacy DOM renderer / 自动总结编排 shell，但不再拥有 embedding 请求、状态模型和 context retrieval 实现。

## V25：journal/archive/favorites 记忆周边归属第一刀

| 符号 / 职责 | canonical owner | legacy 入口 / 调用方 | 状态 | 说明 |
|---|---|---|---|---|
| Journal 纯语义 | `OwoApp.core.memory.journalSemantics` | `js/modules/journal.js` aliases | canonical | `normalizeJournal / normalizeImportedJournals / getJournalsForDisplay / buildFavoritedJournalsPrompt / buildMergeJournalPrompt / parseJournalXml` 迁出 legacy 大文件 |
| Journal 状态服务 | `OwoApp.features.journal.service` | `js/modules/journal.js` wrappers | canonical | `addManualJournal / importJournals / deleteJournal / toggleJournalFavorite / autoJournal cursor` 等状态服务迁出 |
| Journal public facade | `OwoApp.features.journal.publicApi` | 后续 journal 子模块入口 | canonical-entry | 只导出 routing report 和 `semantics/service`，不写业务逻辑 |
| Archive | `js/modules/archive.js` | archive screen | legacy-owner | V25 只登记为 memory 周边 legacy-owner，后续如需拆应单独做 archive slice |
| Favorites | `js/modules/favorites.js` | favorites screen | legacy-owner | V25 只登记为 memory 周边 legacy-owner，后续如需拆应单独做 favorites slice |

V25 不改 `chat_ai.js` prompt 主编排，不改 `vector_memory.js`，不迁移日记生成 / 合并的 AI 请求和 stream。

## V26：worldbook context builder 拆分

| 符号 / 职责 | canonical owner | legacy 入口 / 调用方 | 状态 | 说明 |
|---|---|---|---|---|
| 世界书触发 / 注入纯语义 | `OwoApp.core.memory.worldBookSemantics` | `OwoApp.core.chat.promptContext` wrappers | canonical | `resolveLinkedCharacter / isOfflineNode / getAssociatedWorldBookIds / shouldActivateWorldBook / splitWorldBookContentsByPosition` 迁出 promptContext |
| 世界书 prompt context service | `OwoApp.features.worldBook.contextService` | `promptContext.getActiveWorldBooksContents` wrapper | canonical | 生成 `before / middle / after` 世界书片段，保持 `chat_ai.js` 的主 prompt 输出顺序不变 |
| World book public facade | `OwoApp.features.worldBook.publicApi` | 后续 worldbook 子模块入口 | canonical-entry | 只导出 routing report、context service 和 semantics，不写 DOM / 存储 / AI 请求 |
| `js/modules/worldbook.js` | `js/modules/worldbook.js` | worldbook screen / import / DOM | legacy-owner | V26 不拆世界书管理 UI、导入、拖拽、分类和保存流程 |

V26 只迁移世界书触发/注入语义和 context builder，不修改 `chat_ai.js` 主 prompt 编排、不改变世界书注入顺序、不迁移世界书管理 UI。`promptContext.getActiveWorldBooksContents()` 仍保留旧 API，但实现只转发到 `features/worldBook/contextService`。

## V27：memory regression gate

| 符号 / 职责 | canonical owner | legacy 入口 / 调用方 | 状态 | 说明 |
|---|---|---|---|---|
| Memory smoke checklist | `docs/smoke-memory.md` | 手工回归 / reviewer | canonical-gate | 固定 memory table / vector memory / journal / worldbook / cross-domain smoke ID，作为 V23-V26 后续改动的回归基线 |
| Memory static regression gate | `tools/memory-regression-gate.js` | `node tools/memory-regression-gate.js` | canonical-gate | 检查 smoke 文档、V23-V26 owner 文件、脚本顺序和禁止依赖，不替代浏览器手工 smoke |
| V27 arch gate | `tools/arch-check.js` | `node tools/arch-check.js` | canonical-gate | 防止 memory smoke 文档和 gate 丢失，防止 owner 文件回退到旧依赖方向 |

V27 不拆新业务，不修改 `chat_ai.js`、`vector_memory.js`、provider fetch、stream、prompt 主编排或 Netlify 直发配置。V27 只让 memory 体系从“已拆 owner”进入“有固定回归门禁”的状态。

## V28：forum 垂直切片第一刀

| 符号 / 职责 | canonical owner | legacy 入口 / 调用方 | 状态 | 说明 |
|---|---|---|---|---|
| Forum 纯语义 | `OwoApp.core.forum.forumSemantics` | `js/modules/forum.js` aliases | canonical | `normalizeUserProfile / createUserPost / createUserComment / filterPosts / getDmUserList / getConversationMessages` 等 profile/post/dm 纯语义迁出 legacy 大文件 |
| Forum profile service | `OwoApp.features.forum.profileService` | `forumGetActiveAccount / forumCreateAltAccount / forumInitUserProfile` wrappers | canonical | 大号、小号、active account 状态服务迁出 |
| Forum post service | `OwoApp.features.forum.postService` | `forumPublishPost / forumPublishComment / forumTogglePostLike` wrappers | canonical | 帖子、评论、点赞、收藏、删除和统计状态服务迁出 |
| Forum DM service | `OwoApp.features.forum.dmService` | `forumGetDMUserList / forumSendDM / forumMarkDMRead` wrappers | canonical | 私信用户列表、会话、未读、评论上下文、好友申请状态服务迁出 |
| Forum public facade | `OwoApp.features.forum.publicApi` | 后续 forum 子模块入口 | canonical-entry | 只导出 routing report 和 semantics/services，不写业务逻辑 |

V28 不改 `chat_ai.js`、不改 chat prompt 主编排、不改 provider fetch、stream、AI 回复生成和跨聊天消息发送。`js/modules/forum.js` 仍保留 DOM 渲染、事件绑定、论坛生成、陌生人私信 AI 和评论 AI 编排。

## V29：theater 垂直切片第一刀

- `OwoApp.core.theater.sceneSemantics`：小剧场模式、列表 key、场景归一化、排序、占位符替换、生成内容清理。
- `OwoApp.core.theater.promptSemantics`：手动生成 / 角色主动生成的小剧场 prompt pieces。
- `OwoApp.features.theater.model`：场景列表、提示词预设列表、增删改查。
- `OwoApp.features.theater.promptService`：绑定运行时 state，组装 prompt request；不 fetch、不 stream、不保存。
- `js/modules/theater.js`：保留 legacy DOM renderer、事件绑定、分享 UI 和请求编排 shell。
- 未修改 `chat_ai.js`、forum 和消息发送路径。

## V30：peek 垂直切片第一刀

- `OwoApp.core.peek.xmlSemantics` 成为偷看 XML parse canonical owner。
- `OwoApp.core.peek.conversationSemantics` 成为偷看消息 conversation normalize canonical owner。
- `OwoApp.features.peek.phoneAppModel` 成为偷看手机 app model / 设置默认值 / 生成结果校验 canonical owner。
- `js/modules/peek.js` 继续保留 DOM 渲染、事件绑定、代发消息、NPC 回复和 AI 编排 shell。
- V30 未修改 `chat_ai.js`、`theater.js`、消息发送、provider fetch、stream。

## V31：video call / audio / TTS media 垂直切片第一刀

| 符号 / 职责 | canonical owner | legacy 入口 / 调用方 | 状态 | 说明 |
|---|---|---|---|---|
| 浏览器音频基础能力 | `OwoApp.platform.browser.audioAdapter` | `tts_service.js` / `video_call.js` wrappers | canonical | `createAudioElement / stopAudio / playAudio / activateSilentAudio / createLoopingAudio` 迁出 legacy TTS / video call 文件 |
| 浏览器媒体基础能力 | `OwoApp.platform.browser.mediaAdapter` | `VideoCallModule.startRealCamera / stopRealCamera / captureFrame` wrappers | canonical | 摄像头流、视频帧捕获、震动包装归 platform/browser |
| 通话状态模型 | `OwoApp.features.videoCall.model` | `VideoCallModule.state / formatDuration` wrappers | canonical | 初始状态、摄像头状态、通话类型和时长格式化归 feature model |
| Video call public facade | `OwoApp.features.videoCall.publicApi` | 后续 video call 子模块入口 | canonical-entry | 只导出 routing report 和 model，不写 DOM / 保存 / AI 请求 |
| `js/modules/video_call.js` | `js/modules/video_call.js` | 通话 DOM / 事件 / AI 编排 shell | legacy-shell | V31 不改 `getCallReply`、`generateCallSummary`、消息保存、provider fetch 或 stream |
| `js/modules/tts_service.js` | `js/modules/tts_service.js` | TTS 合成 provider / 队列 | legacy-shell | V31 只让播放基础能力复用 audioAdapter，不改 Minimax / Volcengine 合成请求 |

V31 不修改 `chat_ai.js`、provider fetch、stream、消息发送和通话总结流程。V31 只把浏览器 Audio / Media 基础能力和通话状态模型从 legacy 大文件中拆出，避免后续媒体拆分时出现两套摄像头或音频播放路径。

## V32：wallet / shop / payment card 归属第一刀

| 符号 / 职责 | canonical owner | legacy 入口 / 调用方 | 状态 | 说明 |
|---|---|---|---|---|
| 钱包 / 商城支付纯语义 | `OwoApp.core.wallet.paymentSemantics` | `chat_render.js` / `shop.js` aliases | canonical | 订单、代付、转账、亲属卡解析，购物车总价/商品清单，订单/代付消息格式构建迁出 legacy 文件 |
| 支付卡片 view model | `OwoApp.features.wallet.paymentCardViewModel` | `chat_render.js` legacy DOM renderer | canonical-entry | 小票、代付、转账、亲属卡卡片渲染前数据归一化；不写 DOM、不保存、不发请求 |
| Wallet public facade | `OwoApp.features.wallet.publicApi` | 后续 wallet/shop 子模块入口 | canonical-entry | 只导出 routing report 和 view model，不写业务逻辑 |
| `js/modules/chat_render.js` | `js/modules/chat_render.js` | 支付卡片 DOM renderer | legacy-shell | V32 不改 chat render 主入口，只让卡片解析和 view model 走 wallet owner |
| `js/modules/shop.js` | `js/modules/shop.js` | 商城 UI / 购物车 / 下单编排 | legacy-shell | V32 只复用 wallet payment semantics 构建总价、商品清单和消息格式，不改消息保存 |

V32 不修改 `chat_ai.js`、provider fetch、stream、消息保存和 `chat_render` 主入口。`chat_render.js` 仍负责 DOM 渲染，`shop.js` 仍负责商城 UI 和下单编排，钱包/商城/代付/亲属卡的格式解析和 view model 已有明确 owner。

## V33：feature integration cleanup + haptic 持久化修复

| 符号 / 职责 | canonical owner | legacy 入口 / 调用方 | 状态 | 说明 |
|---|---|---|---|---|
| 大 feature integration registry | `OwoApp.app.featureIntegration` | `node tools/feature-integration-gate.js` / 浏览器验收 | canonical-gate | 汇总 forum/theater/peek/videoCall/wallet 的 public facade 状态和 public contract，不写业务逻辑 |
| Forum public contract | `OwoApp.features.forum.publicApi.getPublicContract` | 其他 feature | canonical-entry | 明确 forum 跨 feature 只能走 public facade |
| Theater public cross-feature API | `OwoApp.features.theater.publicApi` | `chat_render.js` 小剧场通知 / 分享卡片 | canonical-entry | `findScenarioById / createScenarioShareViewModel / openScenarioFromChat` 替代 chat_render 直接读取 theater 私有 db 列表 |
| Peek public contract | `OwoApp.features.peek.publicApi.getPublicContract` | 其他 feature | canonical-entry | 明确 peek 跨 feature 只能走 public facade |
| VideoCall public contract | `OwoApp.features.videoCall.publicApi.getPublicContract` | 其他 feature | canonical-entry | 明确 videoCall 跨 feature 只能走 public facade |
| Wallet public cross-feature API | `OwoApp.features.wallet.publicApi` | `chat_render.js` / `shop.js` | canonical-entry | chat_render/shop 不再直接读取 wallet core/private owner，统一通过 public facade 获取 payment semantics 和 card view model |
| Haptic enabled setting | `globalSettingKeys` + `globalSettingsDefaults` | `tutorial.js` 触感反馈开关 | canonical-fix | `hapticEnabled` 加入持久化列表，修复关闭后刷新又恢复的问题 |

V33 不拆新业务，不改 `chat_ai.js`、provider fetch、stream、消息保存或 Netlify 直发配置。

## V34：screen registry 强化

| 符号 / 职责 | canonical owner | legacy 入口 / 调用方 | 状态 | 说明 |
|---|---|---|---|---|
| Screen manifest | `OwoApp.app.screenManifest` | `index.html` 现有 69 个 `.screen` | canonical-registry | 只登记 screen id、owner、group 和 legacy lifecycle hook 名称，不拆 DOM |
| Screen registry | `OwoApp.app.screenRegistry` | `switchScreen()` / `main.js` | canonical-registry | 提供 `registerScreen / initScreen / mountScreen / unmountScreen / transitionTo / getRoutingReport / assertDomScreens` |
| Screen registry static gate | `tools/screen-registry-gate.js` | reviewer / CI | canonical-gate | 检查 manifest 与 DOM screen id 一致，防止 registry 接管 DOM 切换或写业务逻辑 |

V34 不拆 `index.html`，不替换全部 legacy `setupXxx()` 初始化，不改聊天、AI、存储和大 feature 业务。`switchScreen()` 仍负责旧 DOM active 切换，registry 只承接 lifecycle routing metadata 和少量已存在 mount hook。


## V35：低风险 screen 静态模板拆分

- `OwoApp.app.screenTemplates` 成为低风险 screen 静态模板的 canonical owner。
- `archive-screen` 静态 HTML 迁到 `js/features/archive/archiveScreenTemplate.js`。
- `favorites-screen` 静态 HTML 迁到 `js/features/favorites/favoritesScreenTemplate.js`。
- `storage-analysis-screen` 静态 HTML 迁到 `js/platform/storage/storageAnalysisScreenTemplate.js`。
- `index.html` 仍保留同名 `.screen` placeholder，DOM id 不变，业务逻辑不变。
- 新增 `tools/screen-template-gate.js`，阻断模板 owner 缺失、脚本顺序错误和低风险 screen DOM id 丢失。

## V36：高风险 screen 静态模板拆分第一刀

- `chat-room-screen` 静态 HTML 迁到 `js/features/chat/chatRoomScreenTemplate.js`。
- `api-settings-screen` / `chat-settings-screen` 静态 HTML 迁到 `js/features/settings/settingsScreenTemplates.js`。
- `forum-screen`、`forum-post-detail-screen`、`forum-profile-screen`、`forum-alt-accounts-screen`、`forum-settings-screen`、`forum-dm-list-screen`、`forum-dm-conversation-screen` 静态 HTML 迁到 `js/features/forum/forumScreenTemplates.js`。
- `index.html` 仍保留同名 `.screen` placeholder，DOM id 不变，业务逻辑不变。
- `screenTemplateRegistry` 仍只做 hydrate，不接管 `.screen.active` 切换，不保存、不 fetch、不绑定事件。
- V36 不改 `chat_ai.js`、provider fetch、stream、消息保存、设置业务或论坛业务。

## V37：CSS ownership 收口

- `css/shared/theme-tokens.css` 成为公共 CSS token 唯一 owner。
- `css/base.css` 不再拥有公共 `:root` 初始变量，只保留全局基础样式和通用组件。
- `tools/css-ownership-map.json` 登记所有 CSS 文件的 owner、角色、状态和行数预算。
- `tools/css-ownership-gate.js` 检查 CSS owner、公共 token、加载顺序和预算。
- `index.html` 在 `css/base.css` 前加载 `css/shared/theme-tokens.css`，不改业务 DOM。
- V37 不大改选择器、不拆业务 CSS、不改 JS 业务逻辑、不改 Netlify 直发配置。

## V38：legacy globals deprecation 收口

| 符号 / 职责 | canonical owner | legacy 入口 | 状态 | 说明 |
|---|---|---|---|---|
| Deprecated legacy registry | `OwoApp.app.legacyDeprecation` | `window.*` 旧入口查询 | canonical-registry | 记录所有 ownership-map 中已有 canonical owner 的旧全局入口，旧入口保留但 deprecated |
| Compat expose deprecation | `OwoApp.compat.expose()` | `window.<symbol>` | deprecated-compat | `compat.expose` 默认把 legacy entry 标记为 `deprecated: true`，不删除旧入口 |
| Legacy globals gate | `tools/legacy-globals-gate.js` | reviewer / CI | canonical-gate | 阻断新结构文件直接引用 `window.saveData`、`global.showToast` 等已迁移旧全局 |

V38 不删除兼容入口，不引入构建工具，不改业务逻辑，只完成当前主重构计划的 deprecation 收口。

## V38.1：移除用户可见占位功能入口

- 移除了更多菜单中的日历、小号、动态、联机占位入口。
- 移除了主屏中的音乐、别看、小屋占位入口。
- 移除了外观教程页的“壁纸方案 / 敬请期待”预留卡片。
- 移除了未加载的音乐占位文件 `js/modules/music_player.js` 和 `css/modules/music_player.css`。
- 自定义图标列表不再出现 `music-screen / diary-screen / biekan-app / xiaowu-app`。
- 新增 `tools/placeholder-feature-gate.js`，防止后续重新引入用户可见占位功能入口。

注意：V34～V36 的 screen template placeholder 容器属于技术 hydrate 容器，不是用户可见占位功能，继续保留。
