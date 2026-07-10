# v0.9.3 Release Notes

## 新增

- 通用 `core.ai.cutoverSemantics`，私聊与日记共用三态切换语义；
- 版本化 `core.output.outputContracts` 注册表；
- `journal.entry.v1` 与 `journal.merge-result.v1`；
- `features.journalRuntime`，统一执行日记生成、摘要和合并；
- `journalRuntimeMode` 全局设置，默认 `shadow`；
- 结构化输出最多一次修复机制；
- 日记 Runtime 自动 Gate。

## 收敛

- `modules/journal.js` 不再直接读取 API 配置并调用 `fetchAiResponse()`；
- 日记生成和合并共用同一个模型执行与输出校验入口；
- 日记模块仍是唯一 Prompt builder 和业务写入 owner；
- Shadow 只执行统一路由预检，不发第二次正常请求、不写第二份数据。

## 未改变

- 日记 Prompt 内容、世界书选择、收藏日记引用和自动日记游标逻辑；
- 日记数据结构与导入导出格式；
- 私聊、档案、向量的现有业务效果；
- journal/table/vector 旧三选一逻辑仍等待后续版本取消。
