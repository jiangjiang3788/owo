# OWO v0.6.5：注入质量测试集 / UI 收敛

目标：用测试集检查 Memory Brain shadow 召回质量，同时把记忆脑 UI 从“后厨流水线”逐步收敛为“顾客模式”。

## 本版范围

- 新增 `injection-quality-suite` 报告、运行记录和 batch。
- 自动从 active model / family / fact / event 生成测试用例。
- 支持自定义测试问题。
- 生成通过率、平均分、阻断项和警告项。
- 新增 UI 清爽模式 / 专家模式，默认清爽模式。

## 边界

- 不正式注入 prompt。
- 不接 sendMessage / getAiReply / promptSemantics。
- 不写旧 memory_table / vector_memory / journal。
- 到 v0.9 前继续 blocked-until-v0.9。
