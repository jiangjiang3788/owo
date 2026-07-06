# v0.2.14：App 入口合并收口版

## Scope

本版修正 v0.2.13 的 App 结构重排偏差：旧入口不再作为可见二级跳转，而是把旧页面内容直接承载进新 App。

## 改动

1. Dock 栏第一个入口改为 `api-settings-screen`。
2. Dock 栏取消白色背景，图标尺寸和主屏 app 图标一致。
3. 外观设置直接承载：壁纸与背景、主屏自定义、白昼 / 夜间模式。
4. 数据管理直接承载：请求控制台、备份 / 教程 / 数据清理、存储分析。
5. 首页不再展示壁纸、自定义、白昼模式、夜间模式、存储分析、教程等旧入口。
6. 旧 `wallpaper-screen`、`customize-screen` 保留 DOM 兼容壳，但内容已经迁入 `appearance-settings-screen`。
7. `renderTutorialContent(container)` 支持向数据管理 App 指定容器渲染。
8. `renderCustomizeForm()` 和 `setupCustomizeApp()` 增加空容器保护，避免旧页面空壳初始化报错。

## Ownership

| 功能 | Owner | 说明 |
|---|---|---|
| 首页和 Dock 入口 | `features/home/homeAppCatalog` | 只定义入口元数据 |
| 数据管理聚合页 | `features/dataManagement` | 控制台、教程/备份、存储分析的用例编排和展示 |
| 存储分析内嵌面板 | `features/dataManagement/storagePanel.js` | 复用 `platform/storage.storageAnalysis` 数据语义，不跳转旧页 |
| 外观设置聚合页 | `features/settings/appearance` | 直接承载壁纸、主屏自定义和日夜切换 |
| 旧页面壳 | `index.html` | 只保留 screen registry compatibility shell；首页和 Dock 不再暴露旧入口 |

## 验收

- Dock 第一个图标是 API。
- Dock 没有白色背景，图标尺寸和普通 app 图标一致。
- 数据管理里能直接看到教程/备份设置、请求控制台、存储分析。
- 外观设置里能直接更换壁纸、修改主屏自定义、切换白昼/夜间。
- 主屏不再出现壁纸、自定义、教程、存储分析、白昼、夜间旧入口。
