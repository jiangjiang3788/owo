# v0.2.7 Release Plan — Closing Review and Guard Rails

## Scope

- 收口审查 v0.2.4～v0.2.6 中由不同模型生成的改动，重点检查 ownership、public facade、加载顺序和用户体验细节。
- 不新增大功能，只修正不合理点和补 gate。
- 彻底关闭自动“新功能提醒/引导”浮层；保留教程内手动查看更新日志。
- 修复 GitHub contents API 路径整体编码的问题，避免 `backup_chunks/...` 分片路径恢复/上传风险。
- 修正悬浮球提示词面板右上角关闭行为，并在打开请求控制台时自动收起悬浮球，避免两个大面板重叠。

## Findings

| 问题 | 风险 | 处理 |
|---|---|---|
| `checkForUpdates()` 已关闭，但 `GuideSystem.check()` 仍可能自动弹出新功能引导 | 中 | 新增 `ENABLE_NEW_FEATURE_GUIDES = false`，默认 no-op 并写入已读状态 |
| GitHub contents path 使用 `encodeURIComponent(repoPath)` 整体编码 | 高 | 改为逐段编码：`backup_chunks/a.ee.chunk` → `backup_chunks/a.ee.chunk`，只编码每段特殊字符 |
| quickDock 提示词面板右上角 `×` 实际返回主面板 | 中 | 改为直接关闭面板，底部“返回”仍保留返回主面板 |
| 打开请求控制台时 quickDock 不收起 | 中 | `open-console` 后自动关闭 quickDock，避免大面板叠加 |
| CSS panel 依赖浏览器 hidden 默认样式 | 低 | 显式添加 `[hidden] { display: none !important; }` |
| quickDock / cloudBackup 缺少足够 gate 约束 | 中 | 扩展 `feature-integration-gate.js` 检查 public facade 和加载顺序 |
| cloudBackup 上下文里存在未声明全局 fallback | 中 | 改为显式检查 `global.db` / `global.dexieDB`，失败给出清晰错误 |

## Ownership

| 文件 | owner | 职责 |
|---|---|---|
| `js/modules/tutorial.js` | tutorial legacy shell | 关闭自动新功能引导，保留兼容 `GuideSystem` |
| `js/platform/storage/githubBackupAdapter.js` | platform/storage | GitHub API path 编码和请求适配 |
| `js/features/cloudBackup/service.js` | features/cloudBackup | 云备份用例上下文校验 |
| `js/features/cloudBackup/public.js` | features/cloudBackup | 补 public contract / routing report |
| `js/features/quickDock/service.js` | features/quickDock | 安全读取 facade、提示词状态校验 |
| `js/features/quickDock/view.js` | features/quickDock | 关闭行为和面板叠加修正 |
| `css/modules/quick_dock.css` | features/quickDock | hidden 显式样式 |
| `css/modules/debug_console.css` | features/debugConsole | hidden 显式样式 |
| `tools/feature-integration-gate.js` | tools | quickDock/cloudBackup/debugConsole facade 和加载顺序 gate |

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

## Conclusion

v0.2.7 是收口版，不继续扩大功能范围。完成后可以作为 v0.2.x 功能链路的稳定基线。
