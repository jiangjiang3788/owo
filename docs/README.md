# OWO Docs

当前文档只保留 **0.1 / 0.2 / 根路径 gate 入口** 三类路径。

## 根路径结构

```text
docs/
  0.1/
  0.2/
  css-ownership.md
  release-plan.md
  smoke-memory.md
  VERSIONING.md
  README.md
```

## 分卷规则

| 路径 | 含义 | 维护规则 |
|---|---|---|
| `docs/0.1/` | 0.1 历史架构整改档案 | 原 `caifen` 历史文档直接放在这里，不再套 `caifen` 子文件夹。 |
| `docs/0.2/` | 0.2 当前功能迭代档案 | `v0.2.x` release 文档和计划放在这里。 |
| `docs/*.md` | 固定入口 / gate 兼容文档 | 只保留 `css-ownership.md`、`release-plan.md`、`smoke-memory.md`、`VERSIONING.md`、`README.md`。 |

当前产品迭代：`v0.2.17`。

## 后续版本规则

有 `0.3` 版本线时，再新增 `docs/0.3/` 文件夹；现在不要提前创建空的 `0.3` 目录。

`V27`、`V37`、`V38` 这类编号是 0.1 历史 gate 编号，不再作为产品版本号继续追加。产品功能版本统一使用 `v0.2.x`。
