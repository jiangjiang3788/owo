# 0.3 Memory Brain 文档线

`docs/0.3/` 是长期记忆脑主线的 canonical 文档目录。

0.3 的目标不是给旧记忆表格加一层 UI，而是建立一套可长期生长的记忆系统：

```text
聊天原文
  → 事件时间线
  → 原子事实
  → 记忆家族
  → graph 关系网
  → 人物画像 / AI 自我 / 世界观 / 项目脑
  → 注入包
  → 调度生命层
  → 记忆小屋 / 导出 / safety gate
  → 控制台追踪和回滚
```

## 关键规则

1. `v0.3.0` 起新记忆脑默认是影子模式，不替换旧记忆系统。
2. 旧的回忆日记、记忆表格、向量记忆只作为 read-only source 被扫描。
3. 不允许双写：同一条整理结果不能同时写入旧系统和新系统。
4. 不允许双注入：正式聊天只能有一个记忆注入 owner。
5. 切换前必须经过注入影子对照，控制台能看到新旧注入差异。
6. 历史整理必须按批次记录，支持回滚和重新整理。

## 当前版本

- `memory-brain-full-plan.md`：v0.3.x 完整路线、运行遍数、成本和边界。
- `release-v0.3.0-plan.md`：Memory Brain 架构骨架、App 入口、旧来源扫描和替换路线。
- `release-v0.3.1-plan.md`：事件时间线，整理最近聊天为事件卡片，继续影子模式。
- `release-v0.3.2-plan.md`：原子事实层，从事件提取 fact candidates，继续影子模式。
- `release-v0.3.3-plan.md`：记忆家族层，让 facts 自动成团、命名、摘要和回滚。

- `release-v0.3.4-plan.md`：Graph 关系层，让 facts / families / person / topic / purpose / emotion / project 形成轻量关系卡片。
- `release-v0.3.5-plan.md`：长期模型层，生成用户画像、AI 自我、世界观、项目脑和版本历史。
- `release-v0.3.6-plan.md`：注入预览层，生成 shadow injection package 和旧记忆只读对照，仍不接正式 prompt。

- `release-v0.3.7-plan.md`：调度 / 成本 / 浮现衰减层，生成 shadow scheduleQueue，运行权重维护和回滚。
- `release-v0.3.8-plan.md`：记忆小屋 / 产品化收口层，新增今日浮现、切换前安全门、导出包和 manifest-only 导出记录。
