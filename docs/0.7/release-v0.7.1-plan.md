# OWO v0.7.1：互动偏好模型

## 目标

把长期记忆中关于“用户喜欢怎样被回应、不喜欢怎样被敷衍、哪些安抚方式有效、哪些 UI 不该暴露后厨细节”的线索收束为可读、可回滚的互动偏好模型。

## 写入范围

```text
memoryBrain.interactionPreferenceNodes
memoryBrain.interactionPreferenceRuns
memoryBrain.models(type = interaction-preferences)
memoryBrain.batches(kind = interaction-preference-model)
```

## 不做

```text
不正式注入 prompt
不接 sendMessage / getAiReply / promptSemantics
不替换旧记忆 owner
不写旧 memory_table / vector_memory / journal
不做外部脑 / MCP
```

## UI 原则

清爽模式继续按照“用户点菜，系统负责后厨”收敛，只展示互动偏好、边界和下一步，不要求用户决定内部采购、切法和炒法。

## 验收

- 互动偏好语义保持纯计算。
- 生成 nodes 与 `interaction-preferences` 长期模型。
- 批次可回滚。
- v0.9 前仍 `formalPromptInjection = false`。
