# v0.2.6 Release Plan — Quick Dock MVP

## Scope

- 新增悬浮球 MVP，统一承载快速模型切换、GitHub 备份恢复、请求控制台和提示词入口。
- 提示词面板必须可关闭、尺寸足够大，并使用 textarea 真实换行展示，不把换行显示成 `\n`。
- 请求控制台面板放大，方便复制完整请求/响应/诊断。
- 编辑消息弹窗中，“新增消息”移动到“插入动作”后面。
- 关闭启动时的新功能提醒弹窗，保留教程内手动查看更新日志。

## Ownership

| 文件 | owner | 职责 |
|---|---|---|
| `js/features/quickDock/model.js` | `features/quickDock` | 悬浮球状态、面板状态、提示词换行归一化 |
| `js/features/quickDock/service.js` | `features/quickDock` | 调用 apiSettings/cloudBackup/debugConsole public facade，保存提示词设置 |
| `js/features/quickDock/view.js` | `features/quickDock` | 悬浮球 UI、拖动、面板展示、提示词大面板 |
| `js/features/quickDock/public.js` | `features/quickDock` | 稳定 public facade |
| `css/modules/quick_dock.css` | `features/quickDock` | 悬浮球样式 |
| `css/modules/debug_console.css` | `features/debugConsole` | 放大请求控制台面板 |
| `js/modules/tutorial.js` | `features/tutorial legacy shell` | 关闭自动更新提醒 |
| `index.html` | legacy shell | 编辑消息按钮位置、quickDock 加载顺序 |

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

## Notes

悬浮球只调用：

- `OwoApp.features.settings.apiSettings.publicApi`
- `OwoApp.features.cloudBackup.publicApi`
- `OwoApp.features.debugConsole.publicApi`

不直接调用教程页 `GitHubMgr`，不直接复制 API 设置页 DOM 业务逻辑。
