# Release Plan

当前功能迭代版本：`v0.2.8`。

后续版本建议：

| 版本 | 目标 |
|---|---|
| v0.2.1 | 基线 gate 修复、根路径文档补齐、版本命名切换 |
| v0.2.2 | 请求追踪底座、debug console MVP（已完成） |
| v0.2.3 | 表格记忆 XML 返回诊断和 regression 样例（已完成） |
| v0.2.4 | 聊天框重排、紧凑微信风格、设置类 app 第二页（已完成） |
| v0.2.5 | 模型切换 facade、GitHub 备份恢复 facade（已完成） |
| v0.2.6 | 悬浮球 MVP：加入提示词入口、大尺寸可关闭控制台/提示词面板、提示词真实换行展示、不用反斜杠 n（已完成） |
| v0.2.7 | 收口审查：修正自动新功能引导、GitHub path 编码、悬浮球关闭细节，并补 quickDock/cloudBackup facade gate（已完成） |
| v0.2.8 | 请求控制台完全收进悬浮球：取消独立“请求”浮窗入口，改为 quickDock 内嵌大面板（当前已完成） |

内部历史 gate 编号仍可保留，例如 V27/V37/V38；它们不是产品版本号。

## v0.2.6 — Quick dock MVP and edit-message polish

- 新增 `js/features/quickDock/model.js`、`service.js`、`view.js`、`public.js`，作为悬浮球 canonical owner。
- 悬浮球可展开/关闭/拖动，提供快速切换模型、打开请求控制台、立即 GitHub 备份、恢复最新 GitHub 备份入口。
- 提示词入口放入悬浮球，面板接近全屏且可关闭；提示词内容使用 textarea 真实换行展示，读取时兼容历史 `\n` 字符串。
- 请求控制台面板尺寸放大到更接近全屏，方便复制完整请求和诊断内容。
- 编辑消息弹窗里“新增消息”按钮移动到“插入动作”后面，底部只保留删除/保存/取消。
- `checkForUpdates()` 改为记录当前版本，不再启动时自动弹出新功能提醒；更新日志仍可从教程手动查看。

## v0.2.7 — Closing review and guard rails

- 收口审查 v0.2.4～v0.2.6 的 ownership、加载顺序和体验细节。
- `GuideSystem.check()` 默认关闭自动新功能引导，避免关闭更新弹窗后仍出现功能提示浮层。
- GitHub contents API 路径改为逐段编码，修复 `backup_chunks/...` 分片路径被整体编码的风险。
- 提示词面板右上角 `×` 直接关闭；打开请求控制台时自动收起悬浮球，避免大面板重叠。
- `feature-integration-gate.js` 增加 debugConsole、cloudBackup、quickDock public facade 和加载顺序检查。


## v0.2.8 — Request console fully inside quickDock

- 用户反馈“请求”功能应完全放在悬浮窗中，因此本版取消独立右下角“请求”悬浮按钮。
- `features/debugConsole/view.js` 不再在 DOMContentLoaded 自动挂载独立入口，只保留嵌入式渲染能力和极端 fallback。
- `features/debugConsole/public.js` 新增 `renderEmbeddedRequestConsole()` / `destroyEmbeddedRequestConsole()`，`openRequestConsole()` 会优先路由到 `quickDock.publicApi.openRequestPanel()`。
- `features/quickDock/view.js` 新增 `requests` panel，请求列表、详情、复制单条、复制全部、清空都在悬浮球大面板内部完成。
- `feature-integration-gate.js` 增加检查：debugConsole/view 不得再自动挂载独立请求按钮。
