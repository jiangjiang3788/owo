# v0.8.5 周年与关系回忆增强

## 定位

把情绪节点、关系回忆和项目里程碑整理成周年/纪念候选；默认只做可读回忆，不自动提醒。

这一版仍属于 Memory Brain self-maintenance shadow 阶段。

```text
formalPromptInjection = false
automaticMemoryWrite = false
writesLegacyMemory = false
proactiveDelivery = false
shouldNotify = false
anniversaryCannotNotify = true
cutoverGate = blocked-until-v0.9
blockedUntil = v0.9
```

## 新增 namespace

```text
memoryBrain.anniversaryRelationshipCards
memoryBrain.anniversaryRelationshipCandidates
memoryBrain.anniversaryRelationshipRuns
memoryBrain.batches(kind = anniversary-relationship)
```

## 新增文件

```text
js/core/memoryBrain/anniversaryRelationshipSemantics.js
js/platform/memoryBrain/anniversaryRelationshipStore.js
js/features/memoryBrain/anniversaryRelationshipService.js
js/features/memoryBrain/anniversaryRelationshipView.js
tools/anniversary-relationship-gate.js
```

## Gate

```bash
node tools/anniversary-relationship-gate.js
```

## 用户可见原则

只生成候选、解释和可回滚批次。所有采用、关闭、忽略都需要用户确认；v0.9 之前不接正式 prompt。
