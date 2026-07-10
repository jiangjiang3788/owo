# v0.8.0：夜间整理计划

## 目标

建立 Nightly Digest 管线，把近期事件、事实、家族、长期模型、关系回忆、人格核、陪伴边界和未完成线索整理为待确认变化。

## 数据流

Memory Brain sources → Nightly Digest Plan → nightlyDigestCandidates → 用户确认 / 继续观察 / 忽略。

## 新增 namespace

- memoryBrain.nightlyDigestRuns
- memoryBrain.nightlyDigestCandidates
- memoryBrain.nightlyDigestHistory
- memoryBrain.batches(kind = nightly-digest)

## 数值化逻辑

吸收 jiwen 的“连续状态、差分、阈值解释”方向，但不复制 runtime：

- memoryStabilityScore：重复、时间跨度、来源可信度、关系强度
- memoryDriftScore：旧长期模型与近期来源之间的漂移
- digestPriority：importance × recency × relationshipWeight × confidence 的 OWO 化表达

## 安全策略

formalPromptInjection = false  
automaticMemoryWrite = false  
nightlyDigestCannotCommitMemory = true  
requiresApproval = true  
proactiveDelivery = false  
shouldNotify = false  
writesLegacyMemory = false  
cutoverGate = blocked-until-v0.9

夜间整理只能提出候选，不能偷偷改变人格、事实、长期模型、旧 memory_table、journal 或 vector memory。
