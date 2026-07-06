# v0.2.15：统一控制台收口版

## Scope

本版只收口控制台入口和首页 Dock-only 入口，不处理状态栏提示词注入。

## 改动

1. 首页第一屏移除数据管理、提示词、外观设置；这三个入口只保留在 Dock 栏。
2. Dock 栏继续保持 API 第一个，其后是数据管理、提示词、外观设置。
3. 新增 `platform/observability/traceStore` 作为统一控制台写入 facade，实际存储复用 `platform/ai/requestTraceStore`。
4. 控制台唯一用户宿主改为 `data-management-screen`，`quickDock` 只调用 `dataManagement.publicApi.openConsole()`。
5. `debugConsole` 只提供嵌入式控制台列表、详情、复制能力，不再拥有独立入口。
6. `chat_render.js::addMessageBubble` 增加最小兼容 hook，记录用户发送、AI 回复和系统消息事件。
7. 控制台可读详情和复制详情继续把字面量 `\n` 转成真实换行。

## Ownership

| 功能 | Owner | 说明 |
|---|---|---|
| 统一控制台写入 facade | `platform/observability/traceStore` | 非 UI、非业务，只收敛 request / diagnostic / conversation event 写入 |
| 控制台数据存储 | `platform/ai/requestTraceStore` | 兼容期继续作为 backing store |
| 控制台展示 | `features/debugConsole` | 只渲染嵌入式列表和详情 |
| 控制台入口 | `features/dataManagement` | 唯一用户可见控制台入口 |
| 悬浮球控制台按钮 | `features/quickDock` | 只做入口转发，不渲染控制台 |
| 首页 / Dock 入口 | `features/home/homeAppCatalog` | 数据管理、提示词、外观设置仅 Dock-only |

## 后续计划

后续如果要确认“所有功能统一出口”，不要继续在各 feature 里随手写 console。建议新增设计：

1. `platform/observability/traceStore` 保持唯一写入 facade。
2. 每个 feature public facade 增加可选 `recordOperation()` 或通过统一 `operationBus` 写入。
3. 聊天发送、回复从 legacy `addMessageBubble` 迁到 canonical message service 后，再把本版兼容 hook 移过去。
4. 记忆功能另开设计，不和控制台收口混做。

## 验收

- 首页第一屏没有数据管理、提示词、外观设置。
- Dock 第一个是 API，并包含数据管理、提示词、外观设置。
- 悬浮球点击“控制台”后进入数据管理 App 并打开控制台。
- 控制台能看到用户发送、AI 回复、AI/API 请求、诊断和错误。
- 控制台详情显示真实换行，不显示字面量 `\n`。
