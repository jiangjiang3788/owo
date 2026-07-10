# v0.9.3 Validation

## 自动验证

- JavaScript 语法检查：209 个业务脚本与 19 个工具脚本通过；
- AI Task Runtime Gate：通过；
- Journal Runtime Cutover Gate：通过；
- Private Chat Runtime Gate：通过；
- Backup/Restore Safety Gate：通过；
- Script Manifest Gate：215 个脚本、40 个样式顺序一致，无重复、无缺失；
- Trace Safety Gate：通过；
- Memory Regression Gate：通过；
- Architecture Check：通过；
- Netlify 静态构建：通过；
- 文档收敛：41 个文档全部位于 `docs/`，根目录散落说明文档为 0；
- ZIP 完整性：发布打包后校验。

## Journal Runtime fixture

- legacy：一次兼容请求；
- shadow：一次统一预检加一次兼容请求，无第二次正常模型请求；
- unified：一次统一任务请求；
- Runtime 不提交业务写入；
- 首次格式错误只修复一次；
- 修复仍失败时抛出 `JOURNAL_OUTPUT_VALIDATION_ERROR`；
- `modules/journal.js` 中直接 `fetchAiResponse()` 调用数为 0；
- 日记生成和合并各保留一个 Runtime 调用点。

## 仍需真实浏览器验证

见 `docs/operations/testing/journal-runtime-smoke.md`。重点包括自动日记、节点总结、群聊摘要、流式/非流式 Provider 和刷新后的模式持久化。
