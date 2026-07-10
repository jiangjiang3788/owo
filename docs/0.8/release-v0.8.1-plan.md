# v0.8.1：Dream Digest

## 目标

Dream Digest 不只是整理近期信息，而是模拟“睡眠重放”：把近期事件、旧记忆、夜间整理候选、关系回忆和情绪节点重新组合，发现长期模式候选。

## 新增 namespace

- memoryBrain.dreamDigestRuns
- memoryBrain.dreamPatterns
- memoryBrain.dreamCandidates
- memoryBrain.dreamHistory
- memoryBrain.batches(kind = dream-digest)

## 五层结构

Recent Memory → Replay Layer → Pattern Extraction → Meaning Compression → Long-term Candidate

## 数值化逻辑

继续只吸收 jiwen 的状态轨迹、差分、阈值解释方向，不复制 runtime：

- dreamCoherence：事件是否属于同一主题
- patternStrength：模式强度，来自频率、跨度、可信度
- noveltyScore：新发现程度，避免重复生成旧理解

## 安全策略

formalPromptInjection = false  
automaticMemoryWrite = false  
dreamAutonomy = false  
dreamCannotCommitMemory = true  
requiresApproval = true  
proactiveDelivery = false  
shouldNotify = false  
writesLegacyMemory = false  
cutoverGate = blocked-until-v0.9

Dream Digest 只能生成模式和长期理解候选，不能自动改变人格、事实、长期模型、旧 memory_table、journal、vector memory 或正式 prompt。
