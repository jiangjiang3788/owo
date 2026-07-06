# v0.3.0 Memory Brain 架构骨架版

## Scope

本版只开启长期记忆脑主线的骨架，不实现事件自动总结、不生成原子事实、不替换旧记忆注入。

## 新增 owner

| 层 | owner | 职责 |
|---|---|---|
| core | `js/core/memoryBrain/types.js` | 事件、事实、家族、graph、长期模型、注入层的数据形状和迁移阶段 |
| platform | `js/platform/memoryBrain/memoryBrainStore.js` | `db.memoryBrain` 根状态、旧来源扫描、替换路线 |
| feature | `js/features/memoryBrain/*` | 记忆脑 App 壳、扫描按钮、替换计划展示 |
| css | `css/modules/memory_brain.css` | 记忆脑日间模式 UI |
| docs | `docs/0.3/*` | 0.3 主线文档 |

## 替换旧系统回答

新记忆脑不会马上替换旧系统。它需要经历：

1. `v0.3.0` 影子模式：只建结构和扫描来源。
2. `v0.3.1` 事件时间线：旧系统仍正式注入。
3. `v0.3.3` 家族成团：新系统开始形成长期结构，但仍不接管。
4. `v0.3.6` 注入影子对照：新旧注入在控制台比较。
5. `v0.3.7+` 通过 gate 后切换为唯一注入 owner。

## 避免双系统

- 不双写：v0.3.0 不把整理结果写回旧回忆日记、记忆表格或向量记忆。
- 不双注入：v0.3.0 不参与聊天 prompt 注入。
- 不二次来源混淆：旧系统只作为 read-only source，所有新整理批次归 `memoryBrain`。
- 切换时旧系统降级为历史查看和导入来源。

## 历史记录整理

历史不会一次性全吞。本版只提供扫描：

- 聊天原文数量。
- 回忆日记数量。
- 记忆表格项数量。
- 向量记忆条数。
- 消息最多的聊天来源。

后续 `v0.3.1` 才开始按批次生成事件时间线。

## Gate

- `arch-check` 允许 `docs/0.3`，并检查 Memory Brain owner。
- `feature-integration-gate` 检查 `features/memoryBrain/public.js`。
- `css-ownership-gate` 检查 `css/modules/memory_brain.css`。
