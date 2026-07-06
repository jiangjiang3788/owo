# v0.2.9 Release Plan — docs 按 0.1 / 0.2 分卷

## Scope

本版只做文档收口，不改业务功能。

目标是把历史架构整改文档和当前功能迭代文档分开：

- `docs/0.1`：历史 V2～V38.1 架构 gate 档案。
- `docs/0.2`：当前 v0.2.x 功能 release 档案。
- 根路径 `docs/*.md`：继续作为 gate compatibility facade，避免破坏现有工具。

## Ownership

| 模块 | owner | 职责 |
|---|---|---|
| 文档分卷入口 | `docs/README.md` | 说明 `docs/0.1`、`docs/0.2`、root facade 的区别 |
| 历史架构文档导航 | `docs/0.1/README.md`、`docs/0.1/gate-index.md` | 给 V2～V38.1 gate 文档建立 0.1 入口 |
| 当前功能 release 文档 | `docs/0.2/README.md`、`docs/0.2/release-plan.md` | v0.2.x 版本计划和记录的 canonical owner |
| 旧路径兼容 | 根路径 `docs/release-plan.md`、`docs/release-v0.2.9-plan.md` | 只做 compatibility facade，不承载新的长文档逻辑 |

## Changes

1. 新增 `docs/README.md`，说明文档分卷和 compatibility facade 规则。
2. 新增 `docs/0.1/README.md` 和 `docs/0.1/gate-index.md`，把历史 `docs/caifen/v*.md` 收到 0.1 导航下。
3. 新增 `docs/0.2/README.md` 和 `docs/0.2/release-plan.md`，把当前 v0.2.x release 文档作为 canonical owner。
4. 同步 `release-v0.2.1`～`release-v0.2.9` 到 `docs/0.2/`。
5. 根路径 `docs/release-plan.md` 改为 compatibility facade，指向 `docs/0.2/release-plan.md`。
6. `arch-check` 增加 v0.2.9 文档路由检查，避免后续又把新功能文档散回根路径或 V 编号。

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

v0.2.9 是文档收口版，可以作为 v0.2.x 目前功能链路的文档稳定基线。
