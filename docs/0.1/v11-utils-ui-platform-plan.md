# V11：utils.js 第二轮 UI / platform 拆分

## 目标

V11 是阶段 3 的第一版，只拆 `utils.js` 中低风险的 UI 与浏览器平台能力，不碰 AI 请求、prompt、聊天上下文和生图主链路。

## 迁移 owner

| 符号 | 新 owner | 旧入口 |
|---|---|---|
| `updateBatteryStatus` | `OwoApp.platform.browser.updateBatteryStatus` | `window.updateBatteryStatus` / global lexical |
| `showToast` | `OwoApp.shared.ui.showToast` | `window.showToast` / global lexical |
| `getFriendlyErrorMessage` | `OwoApp.shared.ui.getFriendlyErrorMessage` | `window.getFriendlyErrorMessage` / global lexical |
| `showErrorModal` | `OwoApp.shared.ui.showErrorModal` | `window.showErrorModal` / global lexical |
| `showApiError` | `OwoApp.shared.ui.showApiError` | `window.showApiError` / global lexical |
| `triggerHapticFeedback` | `OwoApp.platform.browser.hapticAdapter.createHapticFeedback` | `window.triggerHapticFeedback` / global lexical |

## 防止两套路径

- `utils.js` 不再保留 Toast 队列、错误弹窗、触感震动、电池状态更新的实现。
- `utils.js` 只保留 compatibility alias 和 `OwoApp.compat.expose()`。
- `hapticAdapter.js` 不直接读取 `db`，旧的 `db.hapticEnabled` 开关通过 `utils.js` 的兼容层注入。
- `showToast` / `showErrorModal` / `showApiError` 的旧全局入口仍然可用，但实现只有 `shared/ui` 一份。

## 不做

- 不迁移 `fetchAiResponse`、`normalizeMessagesForProvider`。
- 不迁移 `filterHistoryForAI`。
- 不迁移 `openImageViewer`。
- 不迁移 GPT / NovelAI 生图逻辑。

## 验收

```js
window.showToast === window.OwoApp.shared.ui.showToast
window.showErrorModal === window.OwoApp.shared.ui.showErrorModal
window.showApiError === window.OwoApp.shared.ui.showApiError
window.updateBatteryStatus === window.OwoApp.platform.browser.updateBatteryStatus
typeof triggerHapticFeedback === 'function'
```

并执行：

```bash
node tools/arch-check.js
```
