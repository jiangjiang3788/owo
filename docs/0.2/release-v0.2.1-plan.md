# v0.2.1：新功能开发第一版基线

本版本开始弃用“继续追加 V39/V40 作为产品版本”的说法。

- 产品/功能迭代版本：`v0.2.1`。
- 旧架构 gate 名称：`V27`、`V37`、`V38`、`V38.1` 继续保留，仅作为历史迁移检查编号。
- 本版本目标：先修复基线 gate、补齐根路径文档、建立后续请求控制台和悬浮球开发的可信起点。

## 范围

| 项目 | 处理方式 | 说明 |
|---|---|---|
| 版本命名 | 改为 `v0.2.1` | 后续计划使用语义化版本，不再把 V39 当作产品版本 |
| 根路径 gate 文档 | 补齐 | `docs/caifen/*` 保留，`docs/*` 提供 gate 读取入口 |
| memory smoke | 补齐 | 保证 `memory-regression-gate` 能读取到必需 smoke token |
| CSS ownership 文档 | 补齐 | 保证 `css-ownership-gate` 能通过根路径文档检查 |
| legacy deprecation 文档 | 补齐 | 保证 `legacy-globals-gate` 能通过根路径文档检查 |

## 不在本版做

- 不实现悬浮球。
- 不改聊天框布局。
- 不拆 GitHub 备份恢复。
- 不新增请求控制台 UI。
- 不改表格记忆解析逻辑。

这些功能从 `v0.2.2` 开始逐步实现。

## 验收命令

```bash
node tools/arch-check.js
node tools/css-ownership-gate.js
node tools/screen-registry-gate.js
node tools/screen-template-gate.js
node tools/feature-integration-gate.js
node tools/memory-regression-gate.js
node tools/legacy-globals-gate.js
```

## 结论

可以开始实现下一版功能，但下一版必须先做“请求追踪底座”，再做“表格记忆诊断”。
