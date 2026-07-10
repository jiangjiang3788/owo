# OWO v0.7.7 · 关系回忆 UI

## 目标

v0.7.7 是长期陪伴人格阶段的收口版。它不再增加主动行为，而是把 v0.7.0～v0.7.6 已经形成的关系连续性、互动偏好、AI 自我日记、情绪节点、主动关心候选、人格核版本和陪伴边界设置，整理成用户可浏览、可理解、可撤回的关系回忆 UI。

## 用户可见结果

- 关系时间线：把关系节点、高情绪事件、承诺、成长转折和项目节点排成时间线。
- 回忆卡片：把重要温暖记忆、情绪记忆和共同节点做成卡片。
- 未完成线索房间：集中显示 open threads、项目下一步和未完成候选。
- 边界和人格核房间：把人格核版本、五轴变化和陪伴边界转成可读说明。

## 新增文件

```text
js/core/memoryBrain/relationshipMemorySemantics.js
js/platform/memoryBrain/relationshipMemoryStore.js
js/features/memoryBrain/relationshipMemoryService.js
js/features/memoryBrain/relationshipMemoryView.js
css/modules/memory_brain_relationship_memory.css
tools/relationship-memory-gate.js
docs/0.7/release-v0.7.7-plan.md
```

## 写入 namespace

```text
memoryBrain.relationshipMemoryCards
memoryBrain.relationshipMemoryRooms
memoryBrain.relationshipMemoryRuns
memoryBrain.batches(kind = relationship-memory-ui)
```

## 不做的事

```text
formalPromptInjection = false
proactiveDelivery = false
shouldNotify = false
writesLegacyMemory = false
cutoverGate = blocked-until-v0.9
blockedUntil = v0.9
finalOwner = legacy
```

因此 v0.7.7 不会主动提醒，不会发推送，不会接 `sendMessage` 或 `getAiReply`，不会写旧表格记忆、旧日记或旧向量记忆，也不会替换旧正式 owner。

## 验收 gate

```text
node tools/relationship-memory-gate.js
node tools/companionship-boundary-gate.js
node tools/personality-core-gate.js
node tools/proactive-care-gate.js
node tools/relationship-continuity-gate.js
node tools/interaction-preference-gate.js
node tools/ai-self-diary-gate.js
node tools/emotion-anniversary-gate.js
node tools/formal-candidate-gate.js
node tools/injection-quality-gate.js
node tools/formal-injection-adapter-gate.js
node tools/css-ownership-gate.js
node tools/arch-check.js
node tools/feature-integration-gate.js
node tools/screen-registry-gate.js
node tools/screen-template-gate.js
node tools/memory-brain-gate.js
node tools/memory-brain-fixture-gate.js
node tools/memory-regression-gate.js
node tools/legacy-globals-gate.js
node tools/netlify-build.js
```

## 下一阶段

v0.7.7 收口后，v0.8 可以进入“自我维护 / 梦境消化”：夜间整理计划、dream digest、长期模型周期重建、衰减可解释化、未完成线索复盘、周年关系回忆、自我修复 gate 和低成本后台维护。
