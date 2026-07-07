# OWO Memory Brain v0.3.8：记忆小屋 / 产品化收口

## 目标

`v0.3.8` 的目标不是正式换脑，而是把 `v0.3.0` 到 `v0.3.7` 的长期记忆链路收成一个可以长期打开、查看、备份和验收的“小屋式”产品形态。

这一版继续保持：

```text
影子模式
不正式注入 prompt
不写旧 memory_table / vector_memory / journal
不做双系统注入
不做真正 MCP server
```

## 新增范围

```text
聊天原文
  ↓
事件时间线
  ↓
原子事实
  ↓
记忆家族
  ↓
graph 关系网
  ↓
长期模型
  ↓
影子注入预览
  ↓
调度 / 成本 / 浮现衰减
  ↓
记忆小屋 / 导出 / safety gate
```

## 新增文件

```text
js/core/memoryBrain/productSemantics.js
js/platform/memoryBrain/memoryExportAdapter.js
js/features/memoryBrain/productizationService.js
js/features/memoryBrain/memoryPalaceView.js
css/modules/memory_brain_palace.css
docs/0.3/release-v0.3.8-plan.md
```

## 记忆小屋 UI

记忆脑首页新增“记忆小屋 / 产品化收口”区域：

```text
今日浮现
时间线书桌
事实抽屉
家族花园
关系走廊
长期模型房间
注入观测窗
维护钟楼
导出 / 备份路线
切换前安全门
```

UI 只负责展示和触发 service，不直接读取 store。

## 今日浮现

`productSemantics` 会从以下对象里选出高权重记忆：

```text
memoryBrain.events
memoryBrain.facts
memoryBrain.families
memoryBrain.edges
memoryBrain.models
memoryBrain.injectionPreviews
```

排序参考：

```text
weight
activation
confidence / importance
连接数量
更新时间
类型权重
```

## 切换前安全门

新增 safety gate 报告，但 `readyForFormalCutover` 在本版固定为 `false`。

本版只检查并展示：

```text
仍处于 shadow mode
旧系统 read-only
已有事件
已有事实
已有家族
已有 graph
已有长期模型
已有注入预览
已有批次和回滚记录
未接正式聊天注入
```

这不是正式切换许可，只是 v0.4 前的可视化检查。

## 导出 / 备份路线

新增 `memoryBrain` 导出包生成能力。

导出包包含：

```text
manifest
memoryBrain snapshot
readme
policy
```

App 内只记录 manifest：

```text
memoryBrain.exports
memoryBrain.batches(kind = memory-export-preview)
```

不会把完整导出副本反复塞回 App 状态，避免自我膨胀。

## 写入边界

本版新增写入只限：

```text
memoryBrain.exports
memoryBrain.batches
```

导出包自身来自当前 `memoryBrain` snapshot，不迁移旧聊天原文，不改写旧记忆三件套。

## 控制台 trace

新增：

```text
记忆脑导出包生成
记忆脑导出包复制
记忆脑导出预览批次回滚
```

## 验收

必须通过：

```bash
find js tools -name '*.js' -print0 | xargs -0 -n 1 node --check
node tools/arch-check.js
node tools/css-ownership-gate.js
node tools/screen-registry-gate.js
node tools/screen-template-gate.js
node tools/feature-integration-gate.js
node tools/memory-regression-gate.js
node tools/legacy-globals-gate.js
node tools/memory-brain-gate.js
node tools/memory-brain-fixture-gate.js
node tools/netlify-build.js
```

## 下一步

`v0.3.8` 完成后，不建议继续往 `v0.3.x` 里塞正式注入。

下一条线应该是：

```text
v0.4.0：正式接管审查 / 单一注入 owner 切换前 gate
```

只有 shadow injection 多轮稳定、控制台能解释、回滚和导出都稳定后，才考虑让 Memory Brain 成为正式 prompt 的唯一记忆 owner。
