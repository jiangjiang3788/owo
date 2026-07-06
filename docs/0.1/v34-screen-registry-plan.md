# V34：screen registry 强化

V34 是阶段 7 的第一刀，只建立 screen id / init / mount / unmount 注册表，不拆 `index.html` DOM，不迁移 screen 模板。

## 新增 owner

| 文件 | 职责 |
|---|---|
| `js/app/screenManifest.js` | 登记当前 `index.html` 中 69 个 `.screen` 的 id、owner、group 和 legacy lifecycle hook 名称 |
| `js/app/screenRegistry.js` | 提供 `registerScreen / initScreen / mountScreen / unmountScreen / transitionTo / getRoutingReport / assertDomScreens` |
| `tools/screen-registry-gate.js` | 静态检查 manifest 与 DOM screen id 是否一致，并检查 registry 没有接管 DOM 切换 |

## 边界

V34 不做：

- 不拆 `index.html`。
- 不把 HTML 模板搬到 JS。
- 不替换全部 legacy `setupXxx()` 初始化调用。
- 不改消息保存、AI 请求、provider fetch、stream。
- 不引入路由库或构建工具。

V34 只做：

- 把现有 screen id 变成可检查的 manifest。
- 让 `switchScreen()` 在完成旧 DOM 切换后触发 registry 的 mount/unmount hook。
- 让 `main.js` 启动时检查 DOM screen 与 manifest 是否一致。
- 为 V35 低风险 screen 模板拆分准备稳定入口。

## 验收

```bash
node tools/screen-registry-gate.js
node tools/feature-integration-gate.js
node tools/memory-regression-gate.js
node tools/arch-check.js
```

浏览器控制台：

```js
window.OwoApp.app.screenRegistry.getRoutingReport()
window.OwoApp.app.screenRegistry.assertDomScreens({ warnOnly: true })
```

预期：

- `registeredCount` 等于 69。
- `domScreenCount` 等于 69。
- `missingInRegistry` 为空数组。
- `missingInDom` 为空数组。
