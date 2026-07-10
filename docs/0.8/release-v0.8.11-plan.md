# v0.8.11 Operation Hierarchy + Audit Ledger

## 目标

把 v0.8.10 的点按、双击、右键、长按和收纳抽屉继续收束成统一操作分级体系：

```text
L0 阅读
L1 轻操作
L2 可回滚写入草稿
L3 敏感操作
L4 高危门禁
```

本版新增审计账本、确认记录和撤销栈，让用户在手机和桌面端都能看清楚：哪些操作只是查看，哪些只是草稿，哪些需要确认，哪些在 v0.9 前锁定。

## 新增文件

```text
js/core/memoryBrain/operationHierarchySemantics.js
js/platform/memoryBrain/operationHierarchyStore.js
js/features/memoryBrain/operationHierarchyService.js
js/features/memoryBrain/operationHierarchyView.js
css/modules/memory_brain_operation_hierarchy.css
tools/memory-operation-hierarchy-gate.js
```

## 新增 namespace

```text
memoryBrain.operationLedger
memoryBrain.operationConfirmations
memoryBrain.operationUndoStack
memoryBrain.operationHierarchyRuns
memoryBrain.batches(kind = memory-operation-hierarchy)
```

## 手机端设计

```text
minTouchTargetPx = 44
bottomSheetRequired = true
hoverRequired = false
doubleTapAllowedLevels = L1 only
longPressExecutesCommand = false
rightClickExecutesCommand = false
l3RequiresConfirmSheet = true
l4BlockedUntil = v0.9
```

双击和双点只能做加入/移出收纳一类 L1 轻操作。长按和右键只打开 sheet，不直接执行命令。L3 操作必须进入确认 sheet。L4 高危门禁只显示 locked 状态。

## 安全边界

```text
formalPromptInjection = false
automaticMemoryWrite = false
writesLegacyMemory = false
proactiveDelivery = false
shouldNotify = false
storedData = refs-confirmations-ledger-only
itemRefsOnly = true
cutoverGate = blocked-until-v0.9
```

本版不会接 sendMessage，不会接 getAiReply，不会写旧 memory_table / journal / vector_memory，不会正式注入 prompt，不会自动导出，不会自动恢复，也不会自动接受候选。

## 验收

```bash
node tools/memory-operation-hierarchy-gate.js
node tools/memory-interaction-shell-gate.js
node tools/memory-export-center-gate.js
node tools/memory-export-v2-gate.js
node tools/css-ownership-gate.js
node tools/arch-check.js
node tools/memory-brain-gate.js
node tools/memory-brain-fixture-gate.js
node tools/memory-regression-gate.js
node tools/legacy-globals-gate.js
node tools/netlify-build.js
```
