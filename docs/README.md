# OWO Docs

当前文档只保留 **0.1 / 0.2 / 0.3 / 0.4 / 根路径 gate 入口** 四类路径。

## 根路径结构

```text
docs/
  0.1/
  0.2/
  0.3/
  0.4/
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
| `docs/0.2/` | 0.2 功能收口档案 | `v0.2.x` release 文档和计划放在这里。 |
| `docs/0.3/` | 0.3 长期记忆脑主线 | `v0.3.x` Memory Brain release 文档和计划放在这里。 |
| `docs/0.4/` | 0.4 历史大整理主线 | `v0.4.x` 历史源扫描、切片、回填、去重和接管演练文档放在这里。 |
| `docs/*.md` | 固定入口 / gate 兼容文档 | 只保留 `css-ownership.md`、`release-plan.md`、`smoke-memory.md`、`VERSIONING.md`、`README.md`。 |

当前产品迭代：`v0.4.1`。

## 后续版本规则

`0.3` 版本线已在 `v0.3.0` 正式开启。0.3 记忆脑文档写入 `docs/0.3/`。

`0.4` 版本线已在 `v0.4.0` 正式开启。后续 0.4 历史大整理文档写入 `docs/0.4/`。

`V27`、`V37`、`V38` 这类编号是 0.1 历史 gate 编号，不再作为产品版本号继续追加。产品功能版本统一使用 `v0.2.x` / `v0.3.x` / `v0.4.x`。
