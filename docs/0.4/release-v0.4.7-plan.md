# OWO v0.4.7：Memory Brain 全历史长期模型重建

## 目标

基于 v0.4.5 清理后的 active facts，以及 v0.4.6 重建后的 families / graph，生成全历史长期模型。

## 模型类型

- user-profile：用户画像
- ai-self：AI 自我
- world-model：世界观
- project-brain：项目脑
- interaction-preferences：互动偏好
- relationship-continuity：关系连续性

## 边界

继续保持 shadow：不接正式 prompt，不写旧 memory_table / vector_memory / journal，不替换当前旧记忆 owner。
