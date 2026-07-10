# v0.9.2 Validation

## 自动验证结果

- 201 个本地 JavaScript 文件通过 `node --check`；
- `script-manifest.json` 与 `index.html` 一致：209 个脚本、40 个样式；
- 无重复脚本和样式，本地引用全部存在；
- `chat-runtime-cutover-gate` 通过：
  - legacy：一次 legacy executor；
  - shadow：一次 dry-run preflight + 一次网络执行；
  - unified：一次 unified executor；
  - 三种模式共用同一 Prepared Request；
- AI Task Runtime、备份恢复、Trace 脱敏、Memory Regression、CSS Ownership、Legacy Globals、Screen Registry 等全部 Gate 通过；
- Netlify 静态构建通过；
- `docs/` 收敛为 35 个文件；
- 项目根目录说明文档数量为 0。

## 已验证的不变量

```text
私聊 Prompt builder 数量不增加
Shadow 不产生第二次模型请求
Unified 不复制响应解析
chatRuntimeMode 可持久化
群聊仍保持旧路径
日记、档案、向量和世界书行为未修改
```

## 人工冒烟建议

1. 默认 shadow 模式发送私聊消息，确认回复与 v0.9.1 一致；
2. 在请求控制台确认 `chatRuntime.cutover` 诊断存在且 `networkCalls = 1`；
3. 切换 unified 后发送一条非流式和一条流式消息；
4. 切回 legacy，刷新页面确认模式持久化；
5. 测试后台自动回复和节点内聊天；
6. 测试群聊仍不经过私聊切换器。

## 已知限制

本版没有创建第二套 Context / Prompt 实现，因此 Shadow 只比较任务契约和请求形状，尚不能提供新旧 Prompt 内容差异。该差异能力将在 Context Provider 逐片迁移时基于同一 Section 模型实现，而不是复制完整 Prompt。
