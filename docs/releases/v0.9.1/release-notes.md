# owo v0.9.1 · Safe Restore Foundation

本版只加固基础设施，不改变聊天 Prompt、世界书、日记、档案和向量的现有业务行为。

## 完成

- 完整备份与分类备份升级到 `3.1`，新增稳定序列化 checksum。
- 完整恢复改为：结构校验 → checksum 校验 → dry-run → Dexie 原子事务 → 提交后校验。
- 恢复失败时保持原 IndexedDB 与运行时数据；提交后校验失败会自动写回导入前快照。
- 旧版无 checksum 备份继续兼容，但会返回明确警告。
- 新增 `script-manifest.json` 与脚本/样式顺序、重复加载、文件存在性 Gate。
- AI Task Contract 增加 `schemaVersion`、`outputContractId`、`sideEffectPolicy` 和白名单 overrides。
- 未注册 `taskType` 在路由前被拒绝，业务不能自由注入 Prompt/Context 策略。
- Trace 对 API Key、Authorization、URL token、Base64 图片和超长 Prompt 做脱敏或截断。

## 未改动

- 私聊和群聊 Prompt 内容。
- 世界书触发规则。
- 日记、档案、向量三套旧记忆的使用行为。
- 角色数据结构和现有模型设置界面。
