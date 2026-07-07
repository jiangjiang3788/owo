# OWO v0.3.5 · Memory Brain 长期模型层

## 目标

把已经整理好的事件、原子事实、记忆家族和 graph 关系，进一步压缩成 4 个可查看、可解释、可回滚的长期模型：

```text
用户画像
AI 自我
世界观
项目脑
```

这一版仍然是影子模式。长期模型只展示在记忆脑 App 里，不进入正式 prompt，不替换旧记忆系统。

## 本版链路

```text
memoryBrain.events
  ↓
memoryBrain.facts
  ↓
memoryBrain.families
  ↓
memoryBrain.edges
  ↓
long-term model prompt / fallback
  ↓
memoryBrain.models
  ↓
long-term-model batch
```

## 新增 owner

```text
js/core/memoryBrain/modelSemantics.js
js/platform/memoryBrain/memoryModelStore.js
js/features/memoryBrain/longTermModelService.js
js/features/memoryBrain/modelView.js
css/modules/memory_brain_models.css
```

## 模型类型

| type | 中文 | 作用 |
|---|---|---|
| `user-profile` | 用户画像 | 长期理解用户偏好、边界、关系模式和需求 |
| `ai-self` | AI 自我 | 记录 AI 在关系里的稳定角色、表达方式和成长痕迹 |
| `world-model` | 世界观 | 沉淀双方共享的价值判断、关系观和长期原则 |
| `project-brain` | 项目脑 | 记住 OWO 项目版本、架构决策、下一步和边界 |

## 数据写入

只允许写：

```text
memoryBrain.models
memoryBrain.batches
```

不允许写：

```text
memory_table.js / memoryTables
vector_memory.js / vectorMemory
journal.js / memoryJournals
promptSemantics / injectionSemantics
```

## 版本历史和回滚

每次生成长期模型都会创建 `long-term-model` batch。

新模型写入时：

```text
同 type 的旧 active 模型 → superseded
新模型 → active, version + 1
batch.beforeModels 保存旧模型快照
```

回滚时：

```text
本批新模型 → retired
beforeModels → restored active
batch.status → rolled-back
```

## 控制台 trace

必须记录：

```text
记忆脑长期模型整理输入
记忆脑长期模型 AI 请求
记忆脑长期模型输出
记忆脑长期模型解析结果
记忆脑长期模型应用结果
记忆脑长期模型错误
记忆脑长期模型撤回
记忆脑长期模型批次回滚
```

## API 不可用时

如果总结 API / 主 API 没配置，或模型输出解析失败：

```text
使用本地 fallback 生成粗略 4 模型
写入 parserDiagnostics
控制台标记 fallback
仍保留 batch，可撤回
```

fallback 不是最终质量，只是让 UI 和版本链路可跑通。

## 验收

- 能基于已存在 facts / families / edges 生成 4 个长期模型。
- 记忆脑 App 能展示用户画像、AI 自我、世界观、项目脑卡片。
- 模型卡片显示版本号、置信度、证据数量、关键词、稳定理解、偏好、边界、项目决策、待确认。
- 可以撤回单个模型。
- 可以撤回最近长期模型批次，并恢复旧版本。
- gate 覆盖 `event → facts → family → graph → models → rollback` smoke。
- 仍然不做 prompt 注入，不替换旧记忆系统。
