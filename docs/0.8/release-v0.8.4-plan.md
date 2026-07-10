# v0.8.4 未完成线索复盘

## 定位

复盘长期 open thread，给出继续、关闭、保持观察三类候选；不主动催、不通知，只在用户打开 Memory Brain 时展示。

这一版仍属于 Memory Brain self-maintenance shadow 阶段。

```text
formalPromptInjection = false
automaticMemoryWrite = false
writesLegacyMemory = false
proactiveDelivery = false
shouldNotify = false
openThreadCannotNotify = true
cutoverGate = blocked-until-v0.9
blockedUntil = v0.9
```

## 新增 namespace

```text
memoryBrain.openThreadReviewItems
memoryBrain.openThreadReviewCandidates
memoryBrain.openThreadReviewRuns
memoryBrain.batches(kind = open-thread-review)
```

## 新增文件

```text
js/core/memoryBrain/openThreadReviewSemantics.js
js/platform/memoryBrain/openThreadReviewStore.js
js/features/memoryBrain/openThreadReviewService.js
js/features/memoryBrain/openThreadReviewView.js
tools/open-thread-review-gate.js
```

## Gate

```bash
node tools/open-thread-review-gate.js
```

## 用户可见原则

只生成候选、解释和可回滚批次。所有采用、关闭、忽略都需要用户确认；v0.9 之前不接正式 prompt。
