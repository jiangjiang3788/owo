# v0.9.2 私聊 Runtime 纵向切片与文档收敛

## 范围

1. 建立 `legacy / shadow / unified` 私聊运行模式；
2. 三种模式共用同一个已构建 Provider Request；
3. Shadow 只做 dry-run preflight，不发送第二次网络请求；
4. Unified 将执行 owner 交给 Chat Runtime；
5. Prompt 和响应业务逻辑暂不复制、不重写；
6. 所有说明文档迁入 `docs/` 并按 architecture/releases/operations/history/legal 收敛。

## 非目标

- 不重写世界书、日记、档案和向量召回；
- 不改变 Prompt 文本；
- 不新增第二套聊天响应解析；
- 不迁移群聊；
- 不实现成长型记忆。

## Exit Criteria

- legacy、shadow、unified 均只执行一次网络请求；
- Shadow preflight 失败可被明确发现；
- 默认模式为 shadow；
- 可通过 public API 切换并持久化；
- Chat Prompt 仍只有一个业务实现；
- 根目录不再散落 Markdown、release manifest 和历史 summary 文档；
- 全部 Gate、语法和静态构建通过。
