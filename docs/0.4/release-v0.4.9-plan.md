# OWO v0.4.9：单一 owner 切换门 / UI 分组折叠

## 目标

建立 Memory Brain 正式接管前的单一 owner 安全门，并把记忆脑 App 按功能分组折叠。

```text
legacy / memoryBrain / off
  ↓
owner switch gate
  ↓
blocked-until-v0.9
  ↓
formal prompt owner 仍保持 legacy
```

## 本版范围

- 新增 `ownerSwitchSemantics`：纯计算 owner 安全门。
- 新增 `memoryOwnerGateStore`：写入 `memoryBrain.ownerState`、`ownerSwitchRuns`、`batches(kind=owner-switch-gate)`。
- 新增 `ownerGateService` / `ownerGateView`：UI 里可请求 legacy / Memory Brain / off 三态，但只记录演练。
- 新增 `uiGroupSemantics`：历史整理室、整理质量、owner 安全门、日常记忆脑、路线结构 5 组折叠设置。
- 记忆脑页面根据功能分组折叠，折叠状态保存到 `memoryBrain.settings.uiGroupsOpen`。

## 边界

- 不接 `chat_ai.js`。
- 不接 `promptSemantics.js`。
- 不修改 sendMessage / getAiReply。
- 不写旧 `memory_table` / `vector_memory` / `journal`。
- 不允许 Memory Brain 正式注入 prompt。

## 状态

到 v0.9 完成前：

```text
Memory Brain = 可读取 / 可整理 / 可预览 / 可演练
正式聊天注入 = 当前旧记忆 owner
```
