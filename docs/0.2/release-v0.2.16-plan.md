# v0.2.16：统一控制台宿主收口版

## Scope

本版只收口控制台宿主关系和数据管理页重复 UI，不处理状态栏提示词注入，也不设计下一轮记忆功能。

## 改动

1. 悬浮球点击“控制台”后不再跳转数据管理页，直接在悬浮球大面板内查看控制台。
2. 控制台内容仍然只有一套 renderer：`features/debugConsole.view.renderEmbedded()`。
3. 数据管理页直接内嵌同一 renderer，但去掉“打开/收起控制台”的二次按钮；标题外层叫“控制台”，内层列表标题改为“记录列表”，减少重复感。
4. `quickDock` 只做宿主和快捷入口，控制台数据、列表、详情和复制不在 quickDock 内重复实现。
5. 控制台详情和复制继续把字面量 `\n` 转成真实换行。

## Ownership

| 功能 | Owner | 说明 |
|---|---|---|
| 控制台数据写入 | `platform/observability/traceStore` | 唯一观测写入 facade |
| 控制台数据存储 | `platform/ai/requestTraceStore` | 兼容期 backing store |
| 控制台渲染 | `features/debugConsole` | 唯一 renderer，支持 dataManagement / quickDock host |
| 数据管理宿主 | `features/dataManagement` | 直接嵌入同一 renderer，不再按钮套面板 |
| 悬浮球宿主 | `features/quickDock` | 直接嵌入同一 renderer，不跳数据管理页 |

## 验收

- 悬浮球点“控制台”后仍停留在当前页面，只打开悬浮球控制台面板。
- 数据管理页没有“打开控制台 / 收起控制台”二次按钮。
- 数据管理和悬浮球复用 `debugConsole` renderer，不各写一套控制台列表和详情。
- 控制台详情显示真实换行，不显示字面量 `\n`。
- 所有 gate 通过。
