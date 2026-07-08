# OWO v0.5.7：可信记忆 gate

## 目标

`v0.5.7` 收口 v0.5 可信记忆阶段：把审查收件箱、事实纠错、冲突处理、家族调整、长期模型修正、纠错影响传播和记忆信任分统一检查成一份可信记忆 gate 报告。

这不是正式接管 prompt 的版本。到 `v0.9` 完成前，Memory Brain 仍然只读、可整理、可预览、可演练、可纠错；正式聊天注入仍由当前旧记忆 owner 执行。

## 新增 owner

```text
js/core/memoryBrain/trustedGateSemantics.js
js/platform/memoryBrain/trustedGateStore.js
js/features/memoryBrain/trustedGateService.js
js/features/memoryBrain/trustedGateView.js
css/modules/memory_brain_trusted_gate.css
tools/trusted-memory-gate.js
```

## Gate 检查范围

```text
审查收件箱是否仍有 open / needs-edit
是否仍有 unresolved conflicts / disputed facts
是否仍有 duplicate / obsolete 噪声事实
是否完成至少一轮人工纠错 / 冲突处理 / 家族调整 / 模型修正
纠错影响是否传播到 family / graph / model
是否已经运行记忆信任分
低可信 / 高风险记忆数量
active facts / families / edges / models 覆盖度
owner 安全门是否仍保持 legacy 正式注入
```

## 写入范围

```text
memoryBrain.trustedMemoryGateReports
memoryBrain.trustedMemoryGateRuns
memoryBrain.batches(kind = trusted-memory-gate)
```

## 边界

```text
不跑 AI
不正式注入 prompt
不接 sendMessage / getAiReply / promptSemantics
不写旧 memory_table / vector_memory / journal
不做外部脑 / MCP
```

## 下一步

`v0.6.0` 可以开始做正式注入 adapter 的准备，但仍需遵守 v0.9 前默认不接管的总门禁。
