# v0.8.8 Memory Export v2 Core

## 目标

把 v0.3.8 的 manifest-only 导出预览升级为真正可下载的 Memory Export v2，同时保证 App 内仍然只保存 manifest / audit，不保存完整导出副本。

## 新增能力

- safe-summary / readable / portable-json / debug-trace 四档导出。
- 每个导出包生成 manifest、file descriptor、checksum、schemaVersion、release、scope counts。
- 默认剔除 rawOutput、prompt、API 返回原文、trace 文本、evidenceQuote 等高隐私字段。
- 恢复必须 dry-run，禁止直接覆盖当前 Memory Brain。
- 手机端导出动作模型：底部 sheet、44px+ 触控目标、长按更多、双击只收纳不执行危险动作。

## 写入 namespace

```text
memoryBrain.exportProfiles
memoryBrain.exportJobs
memoryBrain.exportManifests
memoryBrain.exportAuditRuns
memoryBrain.batches(kind = memory-export-v2)
```

## 不允许

```text
formalPromptInjection = false
automaticMemoryWrite = false
writesLegacyMemory = false
noLegacyWrite = true
noOldMemoryMigration = true
storedData = manifest-only-in-app
restoreRequiresDryRun = true
```

## 手机端规则

- 主操作使用底部 sticky action / sheet 思路。
- 所有按钮触控高度不低于 44px。
- 长按打开抽屉预备态；桌面右键同义。
- 双击只加入导出选择，不执行下载、删除、恢复等危险操作。
- portable-json / debug-trace 属于高隐私导出，必须确认。

## Gate

```bash
node tools/memory-export-v2-gate.js
```
