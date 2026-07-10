# v0.8.7 低成本后台维护

## 定位

把夜间整理、梦境消化、周期重建和自修复排成低成本维护计划；默认手动触发，不后台偷跑。

这一版仍属于 Memory Brain self-maintenance shadow 阶段。

```text
formalPromptInjection = false
automaticMemoryWrite = false
writesLegacyMemory = false
proactiveDelivery = false
shouldNotify = false
lowCostCannotRunUnattended = true
cutoverGate = blocked-until-v0.9
blockedUntil = v0.9
```

## 新增 namespace

```text
memoryBrain.lowCostMaintenancePlans
memoryBrain.lowCostMaintenanceQueue
memoryBrain.lowCostMaintenanceRuns
memoryBrain.batches(kind = low-cost-maintenance)
```

## 新增文件

```text
js/core/memoryBrain/lowCostMaintenanceSemantics.js
js/platform/memoryBrain/lowCostMaintenanceStore.js
js/features/memoryBrain/lowCostMaintenanceService.js
js/features/memoryBrain/lowCostMaintenanceView.js
tools/low-cost-maintenance-gate.js
```

## Gate

```bash
node tools/low-cost-maintenance-gate.js
```

## 用户可见原则

只生成候选、解释和可回滚批次。所有采用、关闭、忽略都需要用户确认；v0.9 之前不接正式 prompt。
