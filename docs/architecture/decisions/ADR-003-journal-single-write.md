# ADR-003：日记 Runtime 不拥有业务写入

## 决策

日记生成、摘要与合并统一通过 `Journal Runtime` 请求模型和校验输出，但 Runtime 不得修改 `memoryJournals`、节点摘要或自动日记游标。

唯一数据写入编排继续位于现有日记模块和 `journalService`。输出未通过契约校验时，写入代码不会运行。

## 原因

若 Runtime 同时负责模型请求和业务写入，过渡期容易形成：

- legacy 与 unified 双写；
- 模型重试产生重复日记；
- 输出格式错误后写入半成品；
- 自动游标与实际写入不一致。

## 三态行为

- `legacy`：兼容执行器请求一次；
- `shadow`：统一任务只预检，兼容执行器请求一次；
- `unified`：统一任务请求一次；
- 只有调用方在取得合法结果后才能执行一次正式写入。

## 删除期限

`journal-legacy-adapter` 目标在 Context/Prompt 契约稳定并完成真实浏览器验证后删除。删除时不需要迁移日记数据。
