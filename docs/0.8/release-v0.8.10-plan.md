# v0.8.10 Memory Interaction Shell

## 定位

v0.8.10 把 Memory Brain 的操作方式统一成手机端也好用的 Interaction Shell。

目标不是把所有模块再加按钮，而是建立一套公共操作壳：

```text
点按 / 单击       → 查看详情
双击 / 双点       → 加入或移出收纳抽屉
右键 / 长按       → 打开同一个底部 sheet
收纳抽屉          → 临时集合，可批量导出 / 加入审查 / 生成草稿
危险操作          → 只进确认 sheet，不被手势直接执行
```

## 新增 namespace

```text
memoryBrain.operationDrawerState
memoryBrain.operationSelections
memoryBrain.operationDrafts
memoryBrain.operationDrawerRuns
memoryBrain.batches(kind = memory-interaction-shell)
```

这些只保存 UI 状态、item refs、命令草稿和审计运行，不直接修改事实、长期模型、旧记忆或正式 prompt。

## 新增文件

```text
js/core/memoryBrain/interactionCommandSemantics.js
js/platform/memoryBrain/operationDrawerStore.js
js/features/memoryBrain/operationDrawerService.js
js/features/memoryBrain/operationDrawerView.js
css/modules/memory_brain_operation_drawer.css
tools/memory-interaction-shell-gate.js
```

## 手机端设计

- 所有主要触控目标不低于 44px。
- 不依赖 hover。
- 底部 sheet 使用 safe-area-inset-bottom。
- 长按和右键只打开操作 sheet，不执行导出、恢复、接受候选或正式接管。
- 双击只做收纳 / 移出，不触发下载、删除、恢复、写入、prompt 接管。
- 键盘 Enter / Space 可打开详情，避免只靠鼠标。

## 操作显示分级

```text
L0 阅读：查看详情、查看证据、查看关联项。
L1 轻操作：加入收纳、移出收纳、复制摘要。
L2 可回滚草稿：加入审查、接受候选草稿、忽略候选草稿。
L3 敏感操作：导出这组、恢复演练，只生成意图或 dry-run 草稿，必须确认。
L4 高危门禁：正式 prompt 接管、覆盖恢复等，v0.9 前锁定。
```

## 安全边界

formalPromptInjection = false  
automaticMemoryWrite = false  
writesLegacyMemory = false  
proactiveDelivery = false  
shouldNotify = false  
doubleTapDangerousAction = false  
longPressExecutesCommand = false  
storedData = ui-state-and-command-drafts-only  
cutoverGate = blocked-until-v0.9

## 验收

```bash
node tools/memory-interaction-shell-gate.js
node tools/memory-export-center-gate.js
node tools/memory-export-v2-gate.js
node tools/css-ownership-gate.js
node tools/arch-check.js
node tools/memory-brain-gate.js
node tools/memory-brain-fixture-gate.js
node tools/memory-regression-gate.js
node tools/legacy-globals-gate.js
node tools/feature-integration-gate.js
node tools/screen-registry-gate.js
node tools/screen-template-gate.js
node tools/netlify-build.js
```
