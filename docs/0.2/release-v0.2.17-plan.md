# v0.2.17：主要操作统一记录版

## Scope

本版只做控制台记录出口补齐和数据管理控制台去重，不做状态栏提示词注入，也不重构记忆系统。

## Ownership

| 能力 | owner |
|---|---|
| 统一操作写入口 | `platform/observability/operationTraceService` |
| 统一 trace facade | `platform/observability/traceStore` |
| 控制台 backing store | `platform/ai/requestTraceStore` |
| 控制台 renderer | `features/debugConsole` |
| 控制台宿主 | `features/quickDock` |
| 数据管理入口 | `features/dataManagement` |
| 云备份业务 | `features/cloudBackup` |
| API 模型切换 | `features/settings/apiSettings` |

## Changes

1. 新增 `operationTraceService`，主要操作统一通过它写入控制台，并清洗 token/key 等敏感字段。
2. `traceStore` 保留统一 facade，并提供 `recordOperationStart`、`recordOperationSuccess`、`recordOperationFailure`、`withOperation`。
3. 主 API 切换模型写入统一控制台。
4. GitHub 备份、恢复、连接检查、配置保存写入统一控制台。
5. 数据管理里的完整导出、分类导出、完整导入、分类导入、冗余清理、高级清理、清除所有数据写入统一控制台。
6. 存储分析、图片压缩、提示词中心、悬浮球提示词保存写入统一控制台。
7. 头像识别、表情包识别和表格记忆整理在请求 trace 之外补可读操作结果。
8. 数据管理页去掉空的控制台内嵌壳，只保留“打开悬浮球控制台”入口。

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
find js tools -name '*.js' -print0 | xargs -0 -n 1 node --check
```

## 下一步

`v0.2.18` 建议只做控制台筛选 / 搜索 / 标签，不碰状态栏提示词和记忆重构。
