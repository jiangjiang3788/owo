# OWO v0.6 Memory Brain 正式注入阶段

v0.6 阶段开始建立正式注入相关基础设施，但在当前路线里仍受 `blocked-until-v0.9` 总门禁约束。

原则：

```text
Memory Brain 可以生成候选正式记忆块。
Memory Brain 可以和旧 owner 对照。
Memory Brain 可以记录 adapter 演练。
Memory Brain 不直接接入 sendMessage / getAiReply / promptSemantics。
Memory Brain 到 v0.9 完成前不成为正式 prompt owner。
```

v0.6.0 只建立唯一 memory block adapter：legacy / memoryBrain / off 三态都必须经过同一个 adapter 语义出口，禁止双注入。

## v0.6.1

召回策略调参：影子注入排序加入 trust score、weight / activation、时间新鲜度，并继续排除明显不可用的 duplicate / obsolete / retired 记忆。

稳定修复：GitHub 网络错误友好化、表格记忆 XML 自动更新错误降级、全局消息弹窗 master switch、生效的聊天输入框防自动填充属性。

## v0.6.2

实时注入 trace：解释每次候选注入为什么命中、为什么未命中、为什么裁剪，以及为什么仍由 legacy 正式注入。仍然只写 `memoryBrain.realtimeInjectionTraceReports / Runs` 和批次，不接正式 prompt。

## v0.6.3

旧系统只读降级演练：检查旧档案 / 日记 / 向量记忆未来降级为只读历史来源的准备度，生成 `memoryBrain.legacyReadOnlyReports / Runs` 和批次。

本版不修改旧记忆、不改 `chat.memoryMode`、不禁用当前正式档案记忆、不接正式 prompt；到 v0.9 前正式聊天注入仍由当前旧记忆 owner 负责。

## v0.6.4

一键关闭 / 回退演练：可以关闭 Memory Brain 影子注入候选、恢复影子预览、回退 legacy owner 演练或请求 off 演练。

本版只写 `memoryBrain.settings.shadowInjectionEnabled`、`ownerRecoveryReports / Runs` 和批次，不改正式 prompt，不改旧 `memory_table / vector_memory / journal`。如果当前聊天 `memoryMode = table`，旧表格记忆仍按旧 owner 守门进行总结 / 更新。
