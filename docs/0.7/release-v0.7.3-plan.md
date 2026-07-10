# OWO v0.7.3：情绪节点和纪念日

目标：从全历史事件、事实、家族、graph、长期模型和陪伴人格节点中提炼高情绪事件、承诺 / 和解 / 成长转折、纪念日候选、项目节点和照顾仪式。

## 本版范围

- 新增 `emotionAnniversaryNodes`
- 新增 `emotionAnniversaryRuns`
- 新增 `models(type = emotion-anniversary)`
- 新增 `emotion-anniversary-model` batch
- 新增长期陪伴人格分组里的“情绪节点和纪念日”UI
- 继续清爽模式：默认只展示回忆节点、证据数量、可信度和是否周年候选

## 边界

- 不主动提醒用户
- 不正式注入 prompt
- 不写旧 `memory_table` / `vector_memory` / `journal`
- 不接 `sendMessage` / `getAiReply` / `promptSemantics`
- 继续 `blocked-until-v0.9`

