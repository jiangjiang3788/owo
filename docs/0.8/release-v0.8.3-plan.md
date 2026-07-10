# v0.8.3 记忆衰减解释化

## 定位

解释哪些记忆应该降权、保持观察或保留高权重；只写衰减解释和候选，不直接改旧记忆权重。

这一版仍属于 Memory Brain self-maintenance shadow 阶段。

```text
formalPromptInjection = false
automaticMemoryWrite = false
writesLegacyMemory = false
proactiveDelivery = false
shouldNotify = false
decayCannotChangeWeightsDirectly = true
cutoverGate = blocked-until-v0.9
blockedUntil = v0.9
```

## 新增 namespace

```text
memoryBrain.memoryDecayExplanations
memoryBrain.memoryDecayCandidates
memoryBrain.memoryDecayRuns
memoryBrain.batches(kind = memory-decay-explainability)
```

## 新增文件

```text
js/core/memoryBrain/memoryDecaySemantics.js
js/platform/memoryBrain/memoryDecayStore.js
js/features/memoryBrain/memoryDecayService.js
js/features/memoryBrain/memoryDecayView.js
tools/memory-decay-gate.js
```

## Gate

```bash
node tools/memory-decay-gate.js
```

## 用户可见原则

只生成候选、解释和可回滚批次。所有采用、关闭、忽略都需要用户确认；v0.9 之前不接正式 prompt。
