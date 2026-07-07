# OWO v0.4.6：Memory Brain 全量家族 / Graph 重建

## 目标

基于 v0.4.5 清理后的事实池，重新生成新记忆脑的记忆家族和 graph 关系。

流程：

```text
active facts
  ↓
排除 duplicate / obsolete / disputed / merged
  ↓
reset 现有 memoryBrain.families / memoryBrain.edges
  ↓
重新聚类 families
  ↓
重新生成 graph edges
  ↓
family-graph-rebuild batch
```

## 范围

新增：

```text
js/platform/memoryBrain/familyGraphRebuildStore.js
js/features/memoryBrain/familyGraphRebuildService.js
js/features/memoryBrain/familyGraphRebuildView.js
css/modules/memory_brain_rebuild.css
tools/family-graph-rebuild-gate.js
tools/quick-dock-sync-feedback-gate.js
```

同时修复悬浮球同步反馈：点击“立即同步”后立即显示“正在同步到 GitHub...”，并在 onProgress 期间更新状态，不再只在成功后提示。

## 边界

本版仍然保持：

```text
Memory Brain 只读 / 可整理 / 可预览
不正式接管 prompt
不写旧 memory_table
不写旧 vector_memory
不写旧 journal
不迁移旧记忆
不做长期模型重建
```

## 回滚

全量重建由三层 batch 组成：

```text
family-graph-rebuild-reset
family-clustering
graph-linking
family-graph-rebuild
```

撤回时按相反顺序恢复：graph → family → reset snapshot → meta batch。
