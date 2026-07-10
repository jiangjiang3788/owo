# v0.8.9 Export Center iOS UI

## 定位

v0.8.9 把 v0.8.8 的 Memory Export v2 核心包装成手机端友好的导出中心。

目标不是再加一个导出按钮，而是建立：

```text
Memory Export v2 Core
  ↓
Export Center iOS UI
  ↓
大标题 / 分组列表 / 底部 sheet / 导出历史 / 手机端确认
```

## 新增 namespace

```text
memoryBrain.exportCenterPreferences
memoryBrain.exportCenterSelections
memoryBrain.exportCenterRuns
memoryBrain.batches(kind = memory-export-center-ui)
```

这些只保存 UI 偏好、当前选择和审计运行，不保存完整导出文件正文。

## 新增文件

```text
js/core/memoryBrain/exportCenterSemantics.js
js/platform/memoryBrain/memoryExportCenterStore.js
js/features/memoryBrain/memoryExportCenterService.js
js/features/memoryBrain/memoryExportCenterView.js
css/modules/memory_brain_export_center.css
tools/memory-export-center-gate.js
```

## 手机端设计

- iOS 设置式分组列表。
- 底部 sheet 承载预览结果、历史详情和危险操作确认。
- 所有主要触控目标不低于 44px。
- 不依赖 hover。
- 长按和右键只打开操作 sheet，不触发导出。
- 双击只加入导出收纳选择，不执行危险导出。
- portable-json / debug-trace / trace / rawOutput / sensitive text 均需要确认。

## 操作分级

```text
L1 预览 / 安全摘要
L2 可读导出 / manifest audit
L3 可迁移 JSON / debug trace / 高隐私导出
L4 rawOutput 高危开关，必须显式开启并确认
```

v0.8.9 只做导出中心内的分级提示，完整 Operation Hierarchy 会在 v0.8.11 收束。

## 安全边界

formalPromptInjection = false  
automaticMemoryWrite = false  
writesLegacyMemory = false  
proactiveDelivery = false  
shouldNotify = false  
storedData = preferences-and-audit-only  
fullExportFileStoredInApp = false  
restoreRequiresDryRun = true  
cutoverGate = blocked-until-v0.9

## 验收

```bash
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
