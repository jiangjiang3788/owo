# v0.8.2 长期模型周期重建

## 定位

把旧长期模型、Dream Pattern、关系回忆和夜间整理结果重新计算成候选版本；保留旧模型，可比较、可回滚，不自动覆盖。

这一版仍属于 Memory Brain self-maintenance shadow 阶段。

```text
formalPromptInjection = false
automaticMemoryWrite = false
writesLegacyMemory = false
proactiveDelivery = false
shouldNotify = false
cycleModelCannotCommitMemory = true
cutoverGate = blocked-until-v0.9
blockedUntil = v0.9
```

## 新增 namespace

```text
memoryBrain.cycleModelRebuildReports
memoryBrain.cycleModelRebuildCandidates
memoryBrain.cycleModelRebuildRuns
memoryBrain.batches(kind = cycle-model-rebuild)
```

## 新增文件

```text
js/core/memoryBrain/cycleModelRebuildSemantics.js
js/platform/memoryBrain/cycleModelRebuildStore.js
js/features/memoryBrain/cycleModelRebuildService.js
js/features/memoryBrain/cycleModelRebuildView.js
tools/cycle-model-rebuild-gate.js
```

## Gate

```bash
node tools/cycle-model-rebuild-gate.js
```

## 用户可见原则

只生成候选、解释和可回滚批次。所有采用、关闭、忽略都需要用户确认；v0.9 之前不接正式 prompt。
