# v0.9.3 日记生成纵向切片计划

## 目标

在不重写日记 Prompt、不复制日记写入逻辑的前提下，将日记生成、摘要和合并接入统一 AI Task Runtime，并建立第一个版本化业务输出契约。

## 单一实现边界

```text
modules/journal.js
  ├── 唯一 Prompt builder
  └── 唯一业务写入编排
          ↓
Journal Runtime
  ├── legacy / shadow / unified 执行切换
  ├── Task Route
  ├── 输出契约校验
  └── 最多一次格式修复
          ↓
AI Runtime
```

禁止新增第二套日记 Prompt builder、第二套日记数据 writer 或 Shadow 双写。

## 工程计划

| 序号 | 领域 | 难度 | 实现 | 核心函数 | 验收 |
|---:|---|---:|---|---|---|
| 1 | 通用切换语义 | 3 | 抽取 legacy/shadow/unified 公共状态机 | `resolveMode()` | 私聊和日记复用同一语义 owner |
| 2 | 输出契约注册表 | 3 | 建立版本化 parse/repair registry | `register()`、`parse()` | 重复契约被拒绝，未知契约安全失败 |
| 3 | 日记输出契约 | 3 | 支持严格 XML 与兼容 JSON | `journal.entry.v1` | title/content 任一为空即失败 |
| 4 | Journal Runtime | 4 | 收敛日记模型调用，不写业务数据 | `executeJournalTask()` | 返回解析结果，`sideEffectsCommitted=false` |
| 5 | 三态切换 | 3 | legacy、shadow、unified 共用同一 Prompt | `getMode()`、`setMode()` | Shadow 无第二次正常请求、无双写 |
| 6 | 单次格式修复 | 4 | 首次解析失败时调用一次无副作用修复任务 | `repairStructuredOutputOnce()` | 最多修复一次，仍失败即停止 |
| 7 | 日记生成迁移 | 3 | 生成/摘要调用 Journal Runtime | `journal.generate`、`journal.summarize` | 模块内不再出现 `fetchAiResponse()` |
| 8 | 日记合并迁移 | 3 | 合并调用 Journal Runtime | `journal.merge` | 与生成共用执行和输出校验 |
| 9 | Gate | 3 | 模拟三态、格式修复和失败隔离 | `journal-runtime-cutover-gate.js` | 全部 fixture 通过 |

## 回退

- 全局设置 `journalRuntimeMode=legacy` 可回到兼容执行器；
- Prompt 构建与最终写入仍是原有唯一实现，因此切换不涉及数据迁移；
- Runtime 失败发生在写入前，不会产生半篇日记或重复日记。
