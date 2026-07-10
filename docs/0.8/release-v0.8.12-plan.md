# v0.8.12 Export Restore Dry-run + Compatibility Gate

## 定位

v0.8.12 补完 Memory Export v2 的另一半：导出的东西必须能被安全检查、能生成恢复演练差异报告、能告诉用户当前版本能不能读回来。

这不是正式导入功能。

```text
Export Package
  ↓
schema / checksum / release compatibility
  ↓
diff report
  ↓
restoreCandidates
  ↓
人工审查 / 后续恢复流程
```

## 新增文件

```text
js/core/memoryBrain/exportCompatibilitySemantics.js
js/platform/memoryBrain/memoryImportDryRunStore.js
js/features/memoryBrain/memoryImportDryRunService.js
js/features/memoryBrain/memoryImportDryRunView.js
css/modules/memory_brain_import_dryrun.css
tools/memory-import-dryrun-gate.js
```

## 新增 namespace

```text
memoryBrain.importDryRunReports
memoryBrain.exportCompatibilityReports
memoryBrain.restoreCandidates
memoryBrain.importDryRunRuns
memoryBrain.batches(kind = memory-import-dry-run)
```

## 校验内容

- manifest.kind 必须是 `owo-memory-brain-export-v2-manifest`
- featureId 必须是 `memory-export-v2`
- profile 必须优先支持 `portable-json` / `debug-trace`
- manifest checksum 必须匹配
- 导出 schemaVersion 高于当前时只给 warning，不允许直接恢复
- 导出 release 高于当前时只允许 dry-run
- readable Markdown 只允许阅读，不允许恢复演练
- safe-summary 只能校验 manifest，不能生成 restoreCandidates

## 手机端规则

```text
minTouchTargetPx >= 44
bottomSheetRequired = true
hoverRequired = false
pasteImportUsesSheet = true
doubleTapRestoreForbidden = true
longPressExecutesRestore = false
```

手机上粘贴导出包、查看兼容性和确认 dry-run 都走底部 sheet。

## 安全边界

```text
rawExportStored = false
storedData = dry-run-report-and-refs-only
restoreRequiresDryRun = true
directOverwriteForbidden = true
formalPromptInjection = false
automaticMemoryWrite = false
writesLegacyMemory = false
proactiveDelivery = false
shouldNotify = false
cutoverGate = blocked-until-v0.9
```

## 明确禁止

- 不把完整导出包写进 App 状态
- 不直接覆盖当前 Memory Brain
- 不写旧 memory_table / journal / vector_memory
- 不接 sendMessage / getAiReply
- 不正式注入 prompt
- 不用双击、长按或右键直接执行恢复

## 验收

```bash
node tools/memory-import-dryrun-gate.js
node tools/memory-operation-hierarchy-gate.js
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
