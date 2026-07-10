# OWO v0.9.1 Safe Restore 所有权地图

| 责任 | Canonical owner | 禁止事项 |
|---|---|---|
| 备份稳定序列化与 checksum | `platform/storage/backupIntegrity.js` | UI 或业务模块自行计算备份签名 |
| 恢复事务、持久化校验与回滚 | `platform/storage/restoreTransaction.js` | 导入流程先清表再校验 |
| 完整/分类导入导出用例编排 | `platform/storage/backupAdapter.js` | `tutorial.js` 或云备份复制恢复实现 |
| IndexedDB 常规写入 | `platform/storage/dexieWriter.js` | 出现第二个通用 `saveData` writer |
| 脚本/样式加载顺序快照 | `script-manifest.json` | 只改 `index.html` 不更新清单 |
| 加载清单检查与生成 | `tools/script-manifest-gate.js` | 手工维护第二份加载列表 |
| AI Task schema 与策略元数据 | `core/ai/taskContracts.js` | 功能自由指定 Prompt/Context/Action 策略 |
| 请求 Trace 脱敏 | `platform/ai/requestTraceStore.js` | Trace 保存明文密钥或 Base64 图片 |

## 恢复不变量

1. 数据结构和 checksum 未通过时，IndexedDB 不得发生写入。
2. 完整与分类恢复都走同一个事务 owner。
3. 事务失败时原持久化数据保持不变。
4. 提交后内容校验失败时，必须写回导入前快照。
5. 运行时 `db` 只在持久化校验成功后替换。
6. 旧版无 checksum 备份允许兼容导入，但结果必须包含 warning。
