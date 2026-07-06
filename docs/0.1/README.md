# docs/0.1：历史架构重整线

`0.1` 是历史架构重整线。旧文档里出现的 `V1`～`V38.1` 是内部 gate / slice 编号，不是产品版本号。

## 主要入口

| 文档 | 说明 |
|---|---|
| `ARCHITECTURE.md` | 架构分层、ownership、legacy compatibility 总规则 |
| `docs/0.1/refactor-ledger.md` | 历史迁移 ledger，记录每一刀的 owner 和兼容状态 |
| `docs/0.1/v2-boundary-plan.md` | shared / platform 边界试点 |
| `docs/0.1/v3-storage-single-writer-plan.md` | 存储单写路径 |
| `docs/0.1/v12-ai-provider-config-plan.md` | AI provider 配置 ownership |
| `docs/0.1/v23-memory-table-slice-plan.md`～`docs/0.1/v27-memory-regression-gate-plan.md` | memory 相关垂直切片和 regression gate |
| `docs/0.1/v34-screen-registry-plan.md`～`docs/0.1/v36-high-risk-screen-template-plan.md` | screen registry / template owner |
| `docs/0.1/v37-css-ownership-plan.md` | CSS ownership |
| `docs/0.1/v38-legacy-globals-deprecation-plan.md` | legacy globals deprecation |
| `docs/0.1/v38-1-remove-placeholder-features.md` | 用户可见占位功能清理 |

## compatibility facade

以下根路径文档是 gate 需要读取的兼容入口，暂时不能删除：

```text
docs/smoke-memory.md
docs/v27-memory-regression-gate-plan.md
docs/css-ownership.md
docs/v37-css-ownership-plan.md
docs/v38-legacy-globals-deprecation-plan.md
docs/v38-1-remove-placeholder-features.md
```

## 后续规则

- 0.1 历史架构文档 canonical owner 是 `docs/0.1/`，不要再套 `caifen` 子目录。
- 不再新增 `V39`、`V40` 产品文档。
- 如果需要新增内部 gate，必须说明属于 `0.1` 历史架构兼容线，不能和 `v0.2.x` release 混用。
- 新功能开发应进入 `0.2` 文档线。
