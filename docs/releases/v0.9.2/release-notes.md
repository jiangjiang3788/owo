# OWO v0.9.2 Release Notes

## 私聊 Runtime 切片

- 新增 `PreparedConversationRequest` 契约；
- 新增 `legacy / shadow / unified` 模式；
- 默认使用 `shadow`；
- Shadow 只校验同一份请求，不再次构建 Prompt 或调用模型；
- Unified 通过 `executePreparedTask()` 交由统一 Runtime 执行；
- 原聊天 Prompt、Stream 和响应解析保持单一实现。

## 文档收敛

- 根目录说明文档全部迁入 `docs/`；
- 旧 0.1～0.8 大量逐版本计划合并为历史摘要；
- Gate 所需历史文档集中到 `docs/operations/gates/`；
- Release artifacts 统一放在 `docs/releases/vX.Y.Z/`；
- 新增两份 ADR，固定“单一 Prompt Builder”和“三态无双请求切换”原则。

## 切换方式

当前暂不增加面向普通用户的设置页，开发调试可使用：

```javascript
OwoApp.features.chatRuntime.publicApi.getStatus();
await OwoApp.features.chatRuntime.publicApi.setMode('legacy');
await OwoApp.features.chatRuntime.publicApi.setMode('shadow');
await OwoApp.features.chatRuntime.publicApi.setMode('unified');
```

模式会保存到全局设置 `chatRuntimeMode`。角色对象也可以设置同名字段，实现单角色灰度，角色设置优先于全局设置。

## 当前边界

`unified` 在本版接管的是任务校验、执行所有权和 Trace，不重建 Provider-neutral Prompt，也不改变原有 API 选择。这样可以先证明切换机制而不复制聊天业务。完整模型 fallback 将在后续把请求构建迁入统一 Task Input 后启用。
