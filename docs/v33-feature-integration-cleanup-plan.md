# V33：feature integration cleanup + haptic persistence fix

## 目标

阶段 6 前五个大 feature 已经完成第一刀：forum / theater / peek / videoCall / wallet。V33 不继续拆新业务，只做集成收口：

- 每个大 feature 必须有稳定 `publicApi` 和 `getPublicContract()`。
- 跨 feature 调用不得绕过 public facade 直接读私有 service/model。
- 聊天渲染中的小剧场分享卡片不再直接读取 `db.theaterScenarios / db.theaterHtmlScenarios`。
- 聊天渲染和商城不再直接读取 `OwoApp.core.wallet.paymentSemantics` 或 `OwoApp.features.wallet.paymentCardViewModel`，统一走 wallet public facade。
- 修复触感反馈关闭后刷新又恢复的问题：`hapticEnabled` 加入全局设置持久化列表和默认值。

## 本版不做

- 不拆 forum / theater / peek / videoCall / wallet 新业务。
- 不改 `chat_ai.js`。
- 不改 provider fetch / stream / processStream。
- 不改消息保存路径。
- 不改 Netlify 直发配置。

## 新增文件

- `js/app/featureIntegrationRegistry.js`

它只汇总 public facade 的 readiness / routing / public contract，不写业务逻辑。

## 关键修复：触感反馈关不掉

问题根因：

- `db.hapticEnabled` 默认存在于初始 state。
- 但它没有进入 `globalSettingKeys` 和 `globalSettingsDefaults`。
- 关闭后只在运行时生效，刷新后无法从 IndexedDB globalSettings 恢复 false。

修复：

- `js/app/state/constants.js` 的 `globalSettingKeys` 增加 `hapticEnabled`。
- `js/app/state/globalSettingsDefaults.js` 增加 `hapticEnabled: true`。
- `hapticAdapter` 增加 `isHapticEnabled(value)`，只有显式 `false` 才关闭，兼容旧数据。

## 验收

```bash
node tools/feature-integration-gate.js
node tools/arch-check.js
node tools/memory-regression-gate.js
```

浏览器检查：

```js
window.OwoApp.app.featureIntegration.getIntegrationReport()
window.OwoApp.app.featureIntegration.assertReady()
window.OwoApp.platform.browser.hapticAdapter.isHapticEnabled(false) === false
```

手工检查：关闭触感反馈，刷新页面，开关仍保持关闭，点击按钮不震动。
