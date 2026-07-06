# 文档版本线规则

从 v0.2.12 起，`docs/` 根路径只保留固定入口和当前版本线目录。

## 当前允许的根路径

```text
docs/0.1/
docs/0.2/
docs/0.3/
docs/css-ownership.md
docs/release-plan.md
docs/smoke-memory.md
docs/VERSIONING.md
docs/README.md
```

## 版本线

| 文档线 | 说明 | 文档入口 | 状态 |
|---|---|---|---|
| `0.1` | 历史架构重整线，对应旧 `V1`～`V38.1` gate / slice / ownership 文档 | `docs/0.1/README.md` | 兼容保留 |
| `0.2` | 用户可见功能收口线，对应 `v0.2.1` 起的 release 文档 | `docs/0.2/README.md` | 兼容保留 |
| `0.3` | 长期记忆脑主线，对应 `v0.3.0` 起的 Memory Brain 文档 | `docs/0.3/README.md` | 当前主线 |

## 命名规则

1. 0.2 功能收口继续查阅 `docs/0.2/`；长期记忆脑新版本使用 `v0.3.x`。
2. 新的 0.3 release 计划文档放到 `docs/0.3/release-v0.3.x-plan.md`。
3. 根路径只保留固定入口，不再新增 `docs/release-v0.2.x-plan.md` 这类兼容文件。
4. 原 `docs/caifen` 历史文档直接归入 `docs/0.1/`，不要再创建 `docs/caifen/` 或 `docs/0.1/caifen/`。
5. 不属于当前版本线的说明，优先并入对应版本目录或现有固定入口；确实需要新类别时，先更新本文件再新增目录。
6. 旧 `V27` / `V37` / `V38` 这类编号只作为 0.1 历史 gate 编号，不能再当成产品版本号。

## 新增 v0.3.x 文档 checklist

新增 `v0.3.x` 版本时，至少更新：

```text
js/app/state/staticConfigBase.js
manifest.json
js/app/state/updateLogRecent.js
docs/0.3/release-plan.md
docs/0.3/release-v0.3.x-plan.md
docs/0.3/README.md
```
