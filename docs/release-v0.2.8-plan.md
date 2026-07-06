# v0.2.8 Release Plan — 请求控制台完全放进悬浮球

## Scope

本版只做一个收口：把“请求”功能完全收进 quickDock，不再保留独立右下角“请求”悬浮入口。

## Ownership

| 模块 | owner | 职责 |
|---|---|---|
| 请求 trace 数据 | `platform/ai/requestTraceStore` | 记录请求、响应、诊断数据 |
| 请求控制台展示 | `features/debugConsole/view` | 嵌入式请求面板渲染，不自动创建入口 |
| 请求入口 | `features/quickDock/view` | 悬浮球内 `requests` 面板 |
| public facade | `features/debugConsole/public`、`features/quickDock/public` | 稳定路由，不互塞业务逻辑 |

## Changes

1. `debugConsole.view` 取消 DOMContentLoaded 自动挂载独立按钮。
2. `debugConsole.view` 新增 `renderEmbedded(container, options)`。
3. `debugConsole.publicApi` 新增 `renderEmbeddedRequestConsole()` 和 `destroyEmbeddedRequestConsole()`。
4. `quickDock.view` 新增 `requests` 面板，直接内嵌请求控制台。
5. CSS 将请求大面板绑定到 `.quick-dock-panel--request`，移动端接近全屏。
6. `feature-integration-gate.js` 检查 debugConsole 不再渲染独立 `request-console-entry`。

## Gates

```bash
node tools/arch-check.js
node tools/css-ownership-gate.js
node tools/screen-registry-gate.js
node tools/screen-template-gate.js
node tools/feature-integration-gate.js
node tools/memory-regression-gate.js
node tools/legacy-globals-gate.js
node tools/netlify-build.js
```
