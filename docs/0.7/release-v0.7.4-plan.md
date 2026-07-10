# OWO v0.7.4：主动关心队列

## 目标

把 Memory Brain 已经整理出的未完成线索、高情绪节点、纪念日候选、项目节点和日常照顾仪式收束成一个“主动关心候选队列”。

它只用于可读、可关闭、可回滚的 shadow 队列：

```text
openThreads / 未完成线索 / 高情绪节点 / 纪念日候选 / 项目节点
  ↓
主动关心候选队列
  ↓
只在 Memory Brain 里展示
```

## 关键边界

```text
不主动提醒
不正式注入 prompt
不接 sendMessage / getAiReply / promptSemantics
不写旧 memory_table / vector_memory / journal
不双系统注入
继续 blocked-until-v0.9
```

## 写入范围

```text
memoryBrain.proactiveCareQueue
memoryBrain.proactiveCareRuns
memoryBrain.models(type=proactive-care)
memoryBrain.batches(kind=proactive-care-queue)
```

## UI

放在“长期陪伴人格”分组里。清爽模式下展示：

```text
候选标题
为什么需要关心
建议下次怎么接
优先级
证据数量
关闭按钮
```

后厨证据仍留给专家模式和 trace。
