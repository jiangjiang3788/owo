# OWO v0.6.2：实时注入 trace

目标：解释 Memory Brain 影子注入候选为什么命中、为什么未命中、为什么被裁剪，以及为什么仍不允许正式接管 prompt。

## 本版范围

- 生成 `realtimeInjectionTraceReports`
- 生成 `realtimeInjectionTraceRuns`
- 写入 `memoryBrain.batches(kind = realtime-injection-trace)`
- UI 新增“实时注入 trace”区域
- 控制台记录输入、应用结果和回滚
- 继续 `blocked-until-v0.9`

## 不做

- 不接 `sendMessage`
- 不接 `getAiReply`
- 不接 `promptSemantics`
- 不正式注入 prompt
- 不替换旧记忆 owner
- 不写旧 `memory_table` / `vector_memory` / `journal`

## Trace 内容

- 为什么命中：关键词、trust score、weight、activation、confidence、family / graph 连接
- 为什么未命中：关键词不足、生命周期降权、信任分不足、同类候选上限裁剪
- 为什么裁剪：候选 block 接近 `maxBlockChars`
- 为什么不接管：`blocked-until-v0.9`、final owner 仍是 legacy

## 数据写入

```text
memoryBrain.realtimeInjectionTraceReports
memoryBrain.realtimeInjectionTraceRuns
memoryBrain.batches(kind = realtime-injection-trace)
```
