# v0.2.10 release plan：docs 版本线修正 + 快速切换模型紧凑化

## Scope

本版只做两个低耦合收口：

1. 修正文档理解偏差：文档按 `0.1 / 0.2 / other` 三类阅读，原 `caifen` 历史文档归入 `docs/0.1/`。
2. 修正悬浮球快速切换模型 UI：模型列表字号压缩，选项只展示模型名，不展示 `(newapi · 当前表单)`。

## Ownership

| 功能 | owner | 说明 |
|---|---|---|
| docs 版本线 | `docs/README.md`、`docs/VERSIONING.md` | 说明 0.1 / 0.2 / other 文档归属 |
| 0.1 历史档案 | `docs/0.1/` | 原 历史架构文档 canonical 位置 |
| 0.2 release | `docs/0.2/` | 当前功能版本 release 文档 |
| 模型候选语义 | `features/settings/apiSettings/apiModelSwitchService.js` | 只提供候选、当前模型、切换主模型，不写悬浮球 UI |
| 快速切换展示 | `features/quickDock/view.js`、`css/modules/quick_dock.css` | 只负责悬浮球展示和样式 |

## Changes

- `appVersion` 升级到 `0.2.10`。
- `manifest.json` 版本升级到 `0.2.10`。
- 新增 `docs/other/README.md`。
- 将原 `docs/caifen` 历史文档复制为 canonical `docs/0.1`，根路径 `docs/caifen` 只保留 compatibility README。
- 更新 `docs/0.1/README.md` 和 `docs/0.1/gate-index.md`，链接改指向 `docs/0.1`。
- `apiModelSwitchService` 增加紧凑展示字段，模型列表只显示模型名。
- `quickDock.view` 当前模型标题只显示模型名，不再拼 provider。
- `quick_dock.css` 压缩模型 select 和按钮字号、间距。

## Not included

- 不做 App 合并重排。
- 不做状态栏提示词注入。
- 不做数据管理控制台统一化。
- 不改 AI 请求逻辑。

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
