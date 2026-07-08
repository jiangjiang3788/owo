# OWO v0.5.3：家族合并 / 拆分

## 目标

让可信记忆阶段能够调整已经生成的记忆家族：

```text
family candidates / existing families
  ↓
合并近似家族
拆分误聚家族
手动改名 / 改摘要
  ↓
保留成员变更和回滚批次
```

## 本版范围

- 新增家族合并 / 拆分 / 改名纯语义。
- 新增 `memoryBrain.familyAdjustments` 与 `memoryBrain.familyAdjustmentRuns`。
- 合并时保留主家族，退休副家族，并把成员 facts 的 `familyIds` 指向主家族。
- 拆分时从源家族拆出指定 facts，创建一个新家族，并更新这些 facts 的 `familyIds`。
- 改名时只更新家族标题、摘要、标签和关键词。
- 每次调整都写入 `family-adjustment` batch，可回滚。

## 明确不做

- 不正式注入 prompt。
- 不接 `sendMessage` / `getAiReply` / `promptSemantics`。
- 不写旧 `memory_table` / `vector_memory` / `journal`。
- 不做长期模型人工修正。
- 不做外部脑 / MCP。

到 v0.9 完成前，Memory Brain 仍然只是可读取、可整理、可预览、可演练、可纠错的新脑；正式聊天注入继续由当前旧记忆 owner 执行。

## 验收

- `family-adjustment-gate.js` 通过。
- `node --check` 通过。
- 既有 Memory Brain gates 通过。
- `netlify-build.js` 通过。
