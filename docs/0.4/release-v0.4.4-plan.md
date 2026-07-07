# OWO v0.4.4 · Memory Brain 历史事实回填

## 版本目标

把 v0.4.3 回填出的历史事件继续拆成原子事实：

```text
history events
  ↓
fact-backfill jobs
  ↓
aiRouter.chat(task = memory-fact)
  ↓
atomic facts
  ↓
memoryBrain.facts
```

## 做什么

- 新增历史事实回填 prompt。
- 支持 `{ "facts": [] }`，没有长期价值事实的历史事件可直接完成。
- `fact-backfill` 任务来源改为历史事件，而不是 archiveChunk。
- 每条历史事实保留 eventId、archiveSourceId、archiveChunkId、消息范围和 backfillJobId。
- 写入 `history-fact-backfill` batch，可回滚。
- 回填成功后推进 `backfillJobs` 和历史事件 `factBackfillStatus`。
- 记忆脑 App 新增“回填历史事实”和“撤回最近历史事实”。
- 控制台记录输入、模型输出、解析结果、应用结果和错误。

## 不做什么

- 不做去重 / 冲突 / 过时事实生命周期。
- 不重建 family。
- 不重建 graph。
- 不重建长期模型。
- 不写旧 `memory_table` / `vector_memory` / `journal`。
- 不接正式 prompt 注入。

## API 设置安排

v0.3.9 已经建立底层 `task → provider/model` 路由，v0.4.4 直接使用 `memory-fact` task。可视化 API 配置中心不放在本版，安排到 v0.4.5 前置小步或 v0.4.5 同版入口：展示 conversation / memory-event / memory-fact / memory-family / memory-persona / embedding 的实际 route、测试按钮和缺配置提示。

本版不正式注入 prompt。
