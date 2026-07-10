# OWO v0.7.2：AI 自我日记

目标：让 Memory Brain 从长期关系、互动偏好、可信纠错和质量测试中形成显式可读、可回滚的 AI 自我日记。

## 本版范围

- 生成 AI 自我日记条目。
- 生成 `ai-self-diary` 长期模型版本。
- UI 在“长期陪伴人格”分组展示结果。
- 继续保持 shadow，不进入正式 prompt。

## 数据写入

```text
memoryBrain.aiSelfDiaryEntries
memoryBrain.aiSelfDiaryRuns
memoryBrain.models(type = ai-self-diary)
memoryBrain.batches(kind = ai-self-diary)
```

## 边界

```text
不正式注入 prompt
不接 sendMessage / getAiReply / promptSemantics
不写旧 memory_table / vector_memory / journal
不双系统注入
AI 自我日记不是隐藏推理，不把它当隐藏推理
```

## 验收

```bash
node tools/ai-self-diary-gate.js
node tools/netlify-build.js
```
