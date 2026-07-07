# OWO v0.3.4 Memory Brain Graph 关系层

## 版本目标

`v0.3.4` 在事件、事实和记忆家族之上建立第一层轻量 graph。它不是重 canvas 大图，也不是正式召回注入，而是把长期记忆中的事实、家族、人物、主题、目的、情绪和项目先连成可查看、可撤回、可追踪的关系边。

```text
memoryBrain.events
  ↓
memoryBrain.facts
  ↓
memoryBrain.families
  ↓
memoryBrain.edges
```

## 本版新增

- `core/memoryBrain/graphSemantics.js`
  - 从 active facts / families 构建 graph edge drafts。
  - 建立 fact → family、fact → person、fact → topic、fact → purpose、fact → emotion、fact → project、family → topic、family → emotion、family ↔ family 等轻量边。
  - 输出纯语义结果，不访问 DOM、网络、db、features 或 platform。
- `platform/memoryBrain/memoryGraphStore.js`
  - 写入 `memoryBrain.edges` 和 `graph-linking` batch。
  - 给相关 fact / family 维护 `edgeIds` 索引。
  - 保存 `beforeFactEdgeIds` / `beforeFamilyEdgeIds` / `beforeEdges`，支持批次回滚。
- `features/memoryBrain/graphService.js`
  - 编排 graph 建立流程。
  - 写控制台 trace：输入、应用结果、撤回、回滚。
- `features/memoryBrain/graphView.js`
  - 手机端轻量关系卡片。
  - 展示高频节点、关系类型、来源事实、关联家族、连接原因。
- `css/modules/memory_brain_graph.css`
  - graph 卡片样式，避免企业后台表格感。

## 影子模式边界

本版继续：

```text
不替换旧记忆系统
不写旧 memory_table
不写旧 vector_memory
不写旧 journal
不做长期模型
不做 AI 自我
不做世界观
不做 prompt 注入
不做真正 MCP server
不做重 canvas graph
```

只允许写入：

```text
memoryBrain.edges
fact.edgeIds
family.edgeIds
memoryBrain.batches
```

旧系统仍是正式注入 owner；Memory Brain 仍是 shadow brain。

## 控制台 trace

新增 trace 标签：

```text
记忆脑 graph 整理输入
记忆脑 graph 整理应用结果
记忆脑 graph 关系撤回
记忆脑 graph 批次回滚
```

## 验收点

- 点击“建立关系图谱”后，能从 facts / families 生成 edges。
- Graph 关系网显示关系卡片，不使用重 canvas。
- 每条边可看到来源事实、关联家族、关键词和连接原因。
- 可以撤回单条 edge。
- 可以撤回最近 graph-linking batch。
- 回滚后 fact.edgeIds / family.edgeIds 恢复到批次前。
- 旧 `memory_table.js`、`vector_memory.js`、`journal.js` 不被改动。
- `memory-brain-gate.js` 和 `memory-brain-fixture-gate.js` 通过。

## 下一版

`v0.3.5` 才开始长期模型：

```text
用户画像
AI 自我
世界观
项目脑
模型版本历史
回滚
```

长期模型要读取 events / facts / families / edges，但仍先保持影子模式，不直接替换正式 prompt 注入。
