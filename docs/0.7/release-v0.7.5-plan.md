# OWO v0.7.5 · 人格核版本历史

v0.7.5 的目标是把 v0.7.0～v0.7.4 已经沉淀的长期陪伴人格材料收束成一个可查看、可比较、可回滚的人格核版本历史。

输入来源：

```text
AI 自我日记
关系连续性模型
互动偏好模型
情绪节点和纪念日
主动关心候选
已有长期模型 / 事件 / 事实 / 家族
```

输出写入：

```text
memoryBrain.personalityCoreVersions
memoryBrain.personalityCoreRuns
memoryBrain.models(type = personality-core)
memoryBrain.batches(kind = personality-core-version)
```

## 从 jiwen 吸收的方向

参考项目里最值得吸收的是数值化逻辑：把陪伴状态拆成连续轴，再用阈值和版本差异解释“人格核为什么变了”。本版不移植主动开口引擎，也不直接使用 tone-grid 接 prompt。

v0.7.5 采用五轴 shadow metrics：

```text
connection  → 关系牵引
pride       → 边界外壳 / guardedness
valence     → 陪伴底色
arousal     → 关注张力
immersion   → 共同沉浸
```

这些五轴数值只用于：

```text
人格核版本卡片
版本 diff
稳定度 / 可信度说明
后续 v0.8 dream digest 和 v0.9 前 gate 的评估输入
```

明确不用于：

```text
不正式注入 prompt
不触发主动提醒
不接 sendMessage / getAiReply
不替换旧记忆 owner
不写旧 memory_table / journal / vector_memory
```

## 新增模块

```text
js/core/memoryBrain/personalityCoreSemantics.js
js/platform/memoryBrain/personalityCoreStore.js
js/features/memoryBrain/personalityCoreService.js
js/features/memoryBrain/personalityCoreView.js
css/modules/memory_brain_personality_core.css
tools/personality-core-gate.js
```

## 版本字段

每个人格核版本包含：

```text
id
version
status
sourceIds
sourceTypes
sourceCount
numericAxes
axisDiffs
summary
changeSummary
corePrinciples
relationshipPosition
interactionStyle
careBoundaries
memoryPolicy
uiPolicy
confidence
trustScore
stabilityScore
previousVersionId
createdAt
batchId
```

## 安全边界

v0.7.5 继续保持：

```text
formalPromptInjection = false
cutoverGate = blocked-until-v0.9
finalOwner = legacy
proactiveDelivery = false
writesLegacyMemory = false
```

人格核是 shadow 版本历史，不是正式聊天 owner。旧记忆仍然按当前 memoryMode 注入；Memory Brain 只负责整理、解释、trace、回滚和后续接管前评估。

## 验收

```bash
node tools/personality-core-gate.js
node tools/proactive-care-gate.js
node tools/css-ownership-gate.js
node tools/arch-check.js
node tools/feature-integration-gate.js
node tools/netlify-build.js
```
