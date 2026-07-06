# v0.2.5 Release Plan — 模型切换 facade + GitHub 备份恢复 facade

## Scope

本版为后续悬浮球做能力拆分，不直接实现悬浮球 UI。

1. 新增主 API 模型快速切换 service，并通过 `apiSettings.publicApi` 暴露。
2. 新增 GitHub 备份平台 adapter，把 GitHub API 上传、分片、下载恢复从 `tutorial.js` 中迁出。
3. 新增 `features/cloudBackup` public facade，让教程页和后续悬浮球共享同一套备份/恢复入口。
4. `tutorial.js` 只保留 `window.GitHubMgr` compatibility shell，不再拥有 GitHub 上传/恢复核心逻辑。

## Ownership

| 功能 | Owner | 说明 |
|---|---|---|
| 主 API 模型候选收集和切换 | `js/features/settings/apiSettings/apiModelSwitchService.js` | 使用 `db.apiSettings` 和 `db.apiPresets`，不处理聊天请求，不写悬浮球 UI |
| 模型切换稳定出口 | `js/features/settings/apiSettings/public.js` | 暴露 `getCurrentMainModel`、`listMainModels`、`switchMainModel` |
| GitHub API 上传/下载适配 | `js/platform/storage/githubBackupAdapter.js` | 只连接 GitHub API、gzip/base64 文件和备份数据，不读写 DOM |
| 云备份用例编排 | `js/features/cloudBackup/service.js` | 管理本地 GitHub 配置、自动备份判断、备份恢复流程 |
| 云备份稳定出口 | `js/features/cloudBackup/public.js` | 教程页和后续悬浮球只调用 public facade |
| 旧教程页兼容 | `js/modules/tutorial.js` | `window.GitHubMgr` 只转发到 `cloudBackup.publicApi` |

## Public API for quickDock

后续悬浮球可直接使用：

```js
OwoApp.features.settings.apiSettings.publicApi.listMainModels()
OwoApp.features.settings.apiSettings.publicApi.switchMainModel(modelOrCandidateId)
OwoApp.features.cloudBackup.publicApi.backupNow()
OwoApp.features.cloudBackup.publicApi.restoreLatest()
OwoApp.features.cloudBackup.publicApi.checkStatus()
```

## Deferred quickDock requirements

仍然留到 v0.2.6 实现：

1. 提示词入口放进悬浮球。
2. 控制台 / 提示词面板可以做大，必要时接近全屏。
3. 面板必须有明显关闭按钮。
4. 提示词正文必须真实换行显示，不能渲染成反斜杠 n。

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
