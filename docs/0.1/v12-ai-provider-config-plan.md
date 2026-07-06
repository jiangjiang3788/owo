# V12：AI provider config/model 收口版

## 阶段进度

| 阶段 | 版本 | 状态 |
|---|---:|---|
| 阶段 1：架构底座 | V1～V6 | 已完成 |
| 阶段 2：`db.js` 收口 | V7～V10 | 已完成 |
| 阶段 3：`utils` / AI / chat 主线 | V11～V16 | 进行中，V12 完成 |

## 本版目标

V12 只做 AI provider 配置读取收口，不改 fetch 请求、不改 stream 读取、不改 prompt 构建。

## 修改表

| 序号 | 修改性质 | 性价比 | 进度 | 修改原因 | 涉及文件 | 用时 | 危险性 | 验收标准 | 最小 MVP 标准 |
|---:|---|---|---|---|---|---|---|---|---|
| 1 | 新增 AI provider config owner | A+ | V12-1 | `chat_ai.js` 中 summary/background/imageRecognition/main 配置选择重复且散落 | `js/platform/ai/providerConfig.js` | S/M | 中 | 提供 normalize/select/isConfigured 系列函数 | provider 配置归一化不触碰 fetch |
| 2 | 扩展 namespace | A | V12-2 | `platform.ai` 需要稳定 owner 位置 | `js/app/namespace.js` | S | 低 | `OwoApp.platform.ai.providerConfig` 存在 | 新 owner 可挂载 |
| 3 | 主聊天配置选择收口 | A+ | V12-3 | `getAiReply` 不应内联 summary/background/main 选择逻辑 | `js/modules/chat_ai.js` | M | 中 | 私聊/群聊/总结/后台回复仍按旧规则选 API | `selectChatProviderConfig()` 生效 |
| 4 | 图片识别配置选择收口 | A | V12-4 | 图片识别专用 API fallback 规则应有中心 owner | `chat_ai.js`、`providerConfig.js` | S | 中 | 专用 API 配置完整时使用专用，否则回退主 API | 不改图片识别请求体 |
| 5 | 通话 / 通话总结配置选择收口 | A | V12-5 | `getCallReply` / `generateCallSummary` 直接读 db.apiSettings / summaryApiSettings | `chat_ai.js`、`providerConfig.js` | S/M | 中 | 通话用主 API，总结优先 summary API | 不改通话 fetch/stream |
| 6 | 主 API 配置 flag 收口 | B+ | V12-6 | temperature、quickReply、timePerception、onlineRoleEnabled 是 provider config 的读模型 | `chat_ai.js`、`providerConfig.js` | S | 中低 | 行为与旧配置一致 | prompt 和 requestBody 不改变结构 |
| 7 | script 顺序固定 | A | V12-7 | `providerConfig.js` 必须早于 `chat_ai.js` | `index.html` | S | 低 | owner 在 `chat_ai.js` 前加载 | 页面启动无 owner 缺失 |
| 8 | gate 增强 | A+ | V12-8 | 防止后续又把 provider 选择逻辑写回 `chat_ai.js` | `tools/arch-check.js` | S/M | 低 | `node tools/arch-check.js` 通过 | providerConfig 不含 fetch/stream |

## 不做内容

- 不迁移 `fetchAiResponse`。
- 不迁移 `processStream`。
- 不迁移 `normalizeMessagesForProvider`。
- 不改 endpoint/header/requestBody 构造。
- 不拆 prompt builder。
- 不拆 `settings.js` API 设置 UI。

## 验收

控制台检查：

```js
window.OwoApp.platform.ai.providerConfig
window.OwoApp.platform.ai.providerConfig.selectChatProviderConfig(db, { isSummary: false, isBackground: false }).source
```

手工 smoke：

1. 主 API 私聊正常回复。
2. 后台自动回复仍能选择 background API，未配置时回退主 API。
3. 总结场景仍能选择 summary API，未配置时回退主 API。
4. 图片识别未配置专用 API 时回退主 API。
5. 视频/语音通话仍使用主 API。
