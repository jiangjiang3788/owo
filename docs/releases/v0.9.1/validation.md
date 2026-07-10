# owo v0.9.1 Validation Report

验证日期：2026-07-10

## 自动验证

- 全部 `js/` 与 `tools/` JavaScript 通过 `node --check`。
- 全部 `tools/*-gate.js` 通过。
- `tools/arch-check.js` 通过。
- `tools/netlify-build.js` 静态构建通过。
- `script-manifest.json` 与 `index.html` 中 205 个脚本、40 个样式顺序完全一致。
- 245 个本地脚本/样式引用全部存在。

## 恢复安全测试

- 完整备份生成 checksum。
- checksum 损坏在任何数据库写入之前被阻断。
- 校验失败后运行时状态和 IndexedDB 均保持原样。
- 有效备份通过 Dexie 原子事务恢复。
- 提交后持久化内容 checksum 校验通过。
- 事务写入异常不会留下半恢复状态。
- 提交后校验异常会自动写回导入前快照。
- 分类备份执行相同 checksum 校验。
- 无 checksum 的旧备份可以兼容恢复，并返回未验证警告。

## AI Task 契约测试

- 旧任务别名仍能映射到 canonical task。
- 专用模型路由与主模型 fallback 正常。
- 未注册 `taskType` 在模型请求前被拒绝。
- 未授权 runtime override 被拒绝。
- 任务结果携带 `schemaVersion` 和 `outputContractId`。

## Trace 安全测试

- URL query 中的 key/token 被脱敏。
- Authorization 与 API Key 请求头被脱敏。
- 请求体 secret 字段被脱敏。
- Base64 图片不写入 Trace。
- 超长 Prompt 只保留预览。
- Provider private reasoning 字段被移除。

## 保留的架构 warning

- 若干 legacy 大文件仍超过建议行数，本版不扩大其职责。
- `_searchScrollToMessageId` 仍有两个 legacy 赋值位置，未在本版修改。
- `requestTraceStore.js` 与 `backupAdapter.js` 超过 300 行软限制，但低于 380 行硬限制；后续按领域拆分。

## 版本边界

本版没有修改聊天 Prompt、世界书触发、日记、档案或向量记忆的业务语义。
