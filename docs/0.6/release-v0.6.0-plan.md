# OWO v0.6.0：正式注入 adapter

## 目标

建立 Memory Brain 正式注入前的唯一 adapter 层，但不接正式 prompt。

```text
当前用户输入
  ↓
旧正式记忆 owner block
  ↓
Memory Brain candidate block
  ↓
formal injection adapter
  ↓
单一最终 owner 判定
  ↓
演练报告
```

## 写入范围

```text
memoryBrain.formalInjectionAdapterReports
memoryBrain.formalInjectionAdapterRuns
memoryBrain.batches(kind = formal-injection-adapter)
```

## 不做

```text
不接 sendMessage
不接 getAiReply
不接 promptSemantics
不正式注入 prompt
不写旧 memory_table
不写旧 vector_memory
不写旧 journal
不打开 Memory Brain 正式 owner
```

## 安全策略

即使 owner 请求为 `memoryBrain`：

```text
cutoverGate = blocked-until-v0.9
formalPromptInjection = false
promptHooked = false
finalOwner = legacy
```

v0.6.0 的作用是把未来正式接管的入口先做成单一 adapter，避免后面发生双注入、双写入或无回退的换脑。
