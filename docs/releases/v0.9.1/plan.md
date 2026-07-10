# OWO v0.9.1：恢复安全、脚本清单与 Task 契约加固

## 范围

本版是进入 Context Runtime 与 Prompt Compiler 之前的安全基线，不改变 AI 回复语义。

## 恢复管线

```text
读取备份
→ 结构校验
→ checksum 校验
→ 旧版本转换
→ 构建候选运行时状态
→ 引用与重复 ID 检查
→ 生成导入前快照 checksum
→ Dexie 原子事务提交
→ 持久化内容校验
→ 更新内存状态
```

失败策略：

- 校验失败：不触碰 IndexedDB；
- 事务失败：由 IndexedDB 事务自动回滚；
- 提交后校验失败：重新写入导入前快照，并恢复内存状态。

## 加载清单

`script-manifest.json` 记录 `index.html` 中脚本和样式的实际顺序。`tools/script-manifest-gate.js` 负责：

- 顺序一致性；
- 重复加载；
- 本地文件存在性；
- 清单重新生成。

## Task Contract

业务调用方只提交已注册 `taskType`、`subject/input/options`。路由、输出契约和副作用策略归中央定义所有。未知任务和未授权 override 必须在请求模型前失败。

## Exit Criteria

- 损坏 checksum 在写入前阻断；
- 写入异常不改变原数据；
- 提交后持久化校验通过；
- 旧备份兼容并提示未验证；
- script manifest 与 index 完全一致；
- 未注册任务与未授权 override 被拒绝；
- Trace 不包含明文密钥和 Base64 图片。
