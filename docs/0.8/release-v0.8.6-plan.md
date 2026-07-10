# v0.8.6 自我修复 Gate

## 定位

检测 Memory Brain 的结构异常、候选堆积、双写风险和不安全主动性；只生成修复建议，不自动修复。

这一版仍属于 Memory Brain self-maintenance shadow 阶段。

```text
formalPromptInjection = false
automaticMemoryWrite = false
writesLegacyMemory = false
proactiveDelivery = false
shouldNotify = false
repairCannotAutoFix = true
cutoverGate = blocked-until-v0.9
blockedUntil = v0.9
```

## 新增 namespace

```text
memoryBrain.selfRepairGateReports
memoryBrain.selfRepairCandidates
memoryBrain.selfRepairGateRuns
memoryBrain.batches(kind = self-repair-gate)
```

## 新增文件

```text
js/core/memoryBrain/selfRepairGateSemantics.js
js/platform/memoryBrain/selfRepairGateStore.js
js/features/memoryBrain/selfRepairGateService.js
js/features/memoryBrain/selfRepairGateView.js
tools/self-repair-gate-gate.js
```

## Gate

```bash
node tools/self-repair-gate-gate.js
```

## 用户可见原则

只生成候选、解释和可回滚批次。所有采用、关闭、忽略都需要用户确认；v0.9 之前不接正式 prompt。
