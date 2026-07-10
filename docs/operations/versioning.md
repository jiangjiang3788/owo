# 版本与文档规则

- 产品版本使用 `vMAJOR.MINOR.PATCH`。
- 每个发布版本只保留一个目录：`docs/releases/vX.Y.Z/`。
- 版本目录包含 `plan.md`、`release-notes.md`、`validation.md` 和 `change-manifest.json`。
- 当前架构说明只允许存在于 `docs/architecture/`；旧版本计划不得继续充当当前 owner。
- 重大不可逆决策写入 `docs/architecture/decisions/ADR-xxx-*.md`。
- 历史大量小版本计划合并到 `docs/history/`，不再逐文件保留。
