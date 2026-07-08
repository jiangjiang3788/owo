# OWO v0.5.4：长期模型人工修正

## 目标

让用户可以人工修正 Memory Brain 生成的长期模型：

```text
用户画像
AI 自我
世界观
项目脑
互动偏好
关系连续性
  ↓
人工修正
  ↓
新版本 active
旧版本 superseded
  ↓
可回滚
```

## 写入范围

只写：

```text
memoryBrain.models
memoryBrain.modelCorrections
memoryBrain.modelCorrectionRuns
memoryBrain.batches(kind = model-correction)
memoryBrain.reviewInboxItems status
```

## 不做

```text
不正式注入 prompt
不接 sendMessage / getAiReply / promptSemantics
不写旧 memory_table / vector_memory / journal
不做纠错影响传播
不做外部脑 / MCP
```

到 v0.9 完成前，Memory Brain 仍然是可读取、可整理、可预览、可演练、可纠错的新脑；正式聊天注入仍由当前旧记忆 owner 执行。
