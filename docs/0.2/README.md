# docs/0.2：当前功能迭代档案

`docs/0.2` 是 v0.2.x 产品功能版本的文档 owner。

## 入口

| 文档 | 说明 |
|---|---|
| `release-plan.md` | v0.2.x 总计划和分卷原则 |
| `release-v0.2.1-plan.md` ～ `release-v0.2.17-plan.md` | 每个小版本的 scope、owner、gate 和收口记录 |

## 与 docs/0.1 的区别

- `docs/0.1`：历史架构 gate 档案，原 `caifen` 文档直接放在 `docs/0.1/`。
- `docs/0.2`：当前产品功能迭代，使用 v0.2.x 语义化版本。

## 维护规则

1. 新功能先写 release plan，再写代码。
2. 每个 release plan 必须说明 scope、ownership、changes、gates。
3. 不再新增 `V39 / V40` 作为产品版本。
4. 根路径只保留固定入口，release 分版本文档长期阅读以 `docs/0.2` 为准。

- `release-v0.2.11-plan.md`：0.1 文档扁平化 + 请求详情整页展示。
- `release-v0.2.12-plan.md`：docs 根路径收口，只保留 0.1 / 0.2 / 固定入口。
- `release-v0.2.17-plan.md`：主要操作统一记录；数据管理只保留悬浮球控制台入口。
