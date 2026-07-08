# OWO v0.5.1：事实纠错 / 改写

## 目标

让 Memory Brain 的原子事实可以被人工纠正，而不是自动生成后只能确认或忽略。

链路：

```text
审查收件箱 needs-edit 项 / 手动 Fact ID
  ↓
人工改写 fact 内容和语义字段
  ↓
保留来源、证据、familyIds、edgeIds
  ↓
factCorrections / factCorrectionRuns / fact-correction batch
  ↓
可回滚
```

## 写入范围

```text
memoryBrain.facts corrected fields
memoryBrain.factCorrections
memoryBrain.factCorrectionRuns
memoryBrain.lastFactCorrectionRun
memoryBrain.batches(kind = fact-correction)
memoryBrain.reviewInboxItems status = corrected
```

## 不做

```text
不正式注入 prompt
不接 sendMessage / getAiReply / promptSemantics
不写旧 memory_table
不写旧 vector_memory
不写旧 journal
不做家族合并 / 拆分
不做长期模型人工修正
不做外部脑 / MCP
```

到 v0.9 完成前，Memory Brain 仍然只是可读取、可整理、可预览、可演练的新脑；正式聊天注入继续由当前旧记忆 owner 执行。

## 验收

```text
fact-correction-gate
memory-brain gate
netlify build
```
