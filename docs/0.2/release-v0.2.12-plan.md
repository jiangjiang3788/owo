# v0.2.12 docs 根路径收口

## Scope

本版只做文档路径收口和版本号更新，不改业务功能。

用户要求的根路径结构为：

```text
docs/0.1
docs/0.2
docs/css-ownership.md
docs/release-plan.md
docs/smoke-memory.md
docs/VERSIONING.md
docs/README.md
```

其余根路径兼容副本和多余目录移除。未来真正开启 `0.3` 版本线时，再新增 `docs/0.3/`。

## Changes

| 项目 | 处理 |
|---|---|
| `docs/caifen/` | 移除。历史文档直接在 `docs/0.1/` 下维护。 |
| `docs/other/` | 移除。当前不提前保留其他目录。 |
| 根路径 `release-v0.2.x-plan.md` | 移除。分版本 release 文档统一在 `docs/0.2/`。 |
| 根路径 `v27/v37/v38` 兼容文档 | 移除。对应文档直接在 `docs/0.1/`。 |
| `docs/versioning.md` | 移除。只保留大小写统一的 `docs/VERSIONING.md`。 |
| `docs/README.md` | 改为精简路由说明。 |
| `docs/VERSIONING.md` | 明确 `0.3` 等版本线在真正开启时再建目录。 |

## Ownership

| 路径 | owner |
|---|---|
| `docs/0.1/` | 0.1 historical architecture docs |
| `docs/0.2/` | 0.2 release docs |
| root docs fixed files | gate / index compatibility |
| `tools/arch-check.js` | docs root allowlist gate |

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
