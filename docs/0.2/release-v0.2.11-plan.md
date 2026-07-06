# v0.2.11 Docs 0.1 扁平化 + 请求详情整页版

## Scope

1. `docs/0.1` 内不再保留 `caifen` 子目录，历史拆分文档直接放在 `docs/0.1/`。
2. 请求控制台详情改为接近整页的详情面板，而不是卡片内小 `pre`。
3. 请求详情展示文本使用真实换行，避免把 `\n` 原样显示给用户。

## Ownership

| 模块 | owner | 说明 |
|---|---|---|
| 0.1 文档扁平化 | `docs/0.1` | 历史 V2～V38.1 文档直接作为 0.1 档案 |
| 请求详情展示 | `features/debugConsole/view` | 只负责请求记录展示和详情面板 |
| 请求详情格式化 | `features/debugConsole/service` | 从 trace 生成可读文本，不做请求和持久化 |
| 请求入口 | `features/quickDock` | 仍然只负责入口和承载大面板 |

## Acceptance

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
