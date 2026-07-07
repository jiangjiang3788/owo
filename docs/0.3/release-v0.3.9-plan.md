# OWO v0.3.9：AI Pipeline / API Layer / Console 2.0

## 目标

`v0.3.9` 是 `v0.4` 历史大整理前的稳定层。它不修改用户的 system prompt，不压缩角色设定，也不改变聊天风格。

目标是把 AI 调用从“聊天接口直连 provider”整理成：

```text
任务 task
  ↓
AI Config Store
  ↓
Model Registry
  ↓
AI Router
  ↓
Provider Request Adapter
  ↓
Response Normalizer
  ↓
AI Response Batch
  ↓
Console 2.0
```

## 本版做什么

### 1. AI 配置结构

新增：

```text
js/platform/ai/aiConfigStore.js
js/platform/ai/modelRegistry.js
js/platform/ai/aiRouter.js
```

旧 API 设置继续保留，v0.3.9 只是把旧配置映射成 provider / task route：

```text
conversation           → apiSettings
memory-event           → summaryApiSettings
memory-fact            → summaryApiSettings
memory-family          → summaryApiSettings
memory-graph           → summaryApiSettings
memory-persona         → summaryApiSettings
memory-injection       → summaryApiSettings
embedding              → vectorApiSettings
image                  → imageRecognitionApiSettings
```

后续 `v0.4` 历史整理可以按 task 调用，不需要各功能自己拼 API。

### 2. 请求历史净化

新增：

```text
js/platform/ai/messageSanitizer.js
```

进入 provider 前会过滤：

```text
unknown assistant 消息
模型拒绝模板污染
debug / request / response trace 文本
thinking / contextDisabled 消息
连续重复 assistant 消息
```

这只影响下一轮 AI context，不删除原始聊天记录。

### 3. 响应清洗和多消息批次

新增：

```text
js/platform/ai/responseNormalizer.js
```

处理：

```text
choices[0].message.content → 用户可见内容
reasoning_content          → 只记录 hasReasoning / reasoningLength / redacted，不进入聊天和记忆
多条 [pp的消息：...]       → 合成一个 AI 回复批次 trace
```

一次 AI 返回 3～8 条消息时，聊天界面仍正常显示多条气泡，但控制台只显示一个“AI 回复批次”。

### 4. Console 2.0 分类

控制台分类扩展为：

```text
Chat
AI Request
AI Response
Memory Brain
Scheduler
Error
```

AI Response 详情会显示：

```text
messageCount
requestTraceId
usage
metadata.hasReasoning
metadata.reasoningRedacted
子消息列表
```

### 5. Gate

新增：

```text
tools/ai-pipeline-gate.js
```

检查：

```text
AI 配置层不 fetch
Memory Brain 后续可按 task 调用 Router
unknown 不进上下文
连续重复消息去重
reasoning_content 被隔离
多条回复形成 response batch
子消息不再刷屏控制台
```

## 明确不做

```text
不修改 system prompt
不缩短角色设定
不改 NSFW / 角色规则配置
不正式接管 Memory Brain 注入
不做 v0.4 历史扫描
不做外部脑 / 导出 / MCP
```

## 下一步

下一版进入：

```text
v0.4.0：历史源扫描器
```

目标是盘点几万条历史记录：聊天数量、消息数量、时间范围、可切片状态、已整理状态。
