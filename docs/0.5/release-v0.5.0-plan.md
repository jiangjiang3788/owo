# OWO v0.5.0：可信记忆审查收件箱

## 目标

把 Memory Brain 已整理出的低置信、重复、冲突、过时事实，以及待确认长期模型，汇总到一个可查看、可处理、可回滚的审查收件箱。

## 本版写入

```text
memoryBrain.reviewInboxItems
memoryBrain.reviewInboxRuns
memoryBrain.lastReviewInboxRun
memoryBrain.batches(kind = memory-review-inbox)
```

## 审查来源

```text
facts.status = duplicate / obsolete / disputed
facts.confidence 低于阈值
models.confidence 低于阈值
models.reviewStatus = pending / needs-review
cutoverReports.risks / riskFlags
```

## 用户动作

```text
确认先保留
标记待改写
忽略
撤回最近审查批次
```

## 不做

```text
不正式注入 prompt
不改旧 memory_table
不改旧 vector_memory
不改旧 journal
不做事实改写
不做家族合并 / 拆分
不做长期模型人工修正
```

事实改写和纠错传播从 v0.5.1 开始。
