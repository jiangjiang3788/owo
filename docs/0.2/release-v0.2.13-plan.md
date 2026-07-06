# v0.2.13 release plan：App 结构重排

## 目标

整理首页、Dock 栏和设置类 App，完成第二阶段 App 结构重排 MVP。

## 本版 scope

1. 新增 `data-management-screen`，聚合备份恢复、请求控制台、存储分析和教程入口。
2. `magic-room-screen` 保留旧 DOM/业务兼容，但用户可见名称改为“提示词”。
3. `appearance-settings-screen` 合并壁纸、自定义、白昼模式、夜间模式入口，并以折叠区展示。
4. 首页第一页加入“数据管理 / 提示词 / 外观设置”。
5. 首页 Dock 栏加入“数据管理 / 提示词 / 外观设置”。
6. 旧的壁纸、自定义、存储分析、教程等 screen 不删除，只从新聚合入口进入，保留兼容。

## ownership

| 功能 | owner | 说明 |
|---|---|---|
| 首页 App 分组 | `features/home/homeAppCatalog` | 只定义入口元数据，不绑 DOM。 |
| 数据管理 App | `features/dataManagement` | 聚合备份、控制台、存储、教程入口。 |
| 备份恢复能力 | `features/cloudBackup.publicApi` | 数据管理只调用 facade，不直接碰 GitHub 适配。 |
| 请求控制台展示 | `features/debugConsole.publicApi` | 数据管理嵌入控制台，不复制控制台逻辑。 |
| 提示词入口 | `features/promptCenter` + legacy `magic-room-screen` | 用户可见改名，旧 screen ID 保留兼容。 |
| 外观设置聚合 | `js/modules/appearance_settings.js` legacy shell | 本版只聚合入口，不重写历史外观业务。 |

## 验收

```bash
node tools/arch-check.js
node tools/css-ownership-gate.js
node tools/screen-registry-gate.js
node tools/screen-template-gate.js
node tools/feature-integration-gate.js
node tools/memory-regression-gate.js
node tools/legacy-globals-gate.js
node tools/netlify-build.js
find js tools -name '*.js' -print0 | xargs -0 -n 1 node --check
```

## 结论

可以作为 App 结构重排 MVP 合并；后续状态栏提示词注入和完整数据管理控制台记录所有发送/回复，继续放到后续版本。
