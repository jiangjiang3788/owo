# V23：memory table 垂直切片第一刀

目标：只拆结构化记忆表格的 `model / semantics / service / view` 基础边界，不改 `chat_ai.js` prompt，不改 `vector_memory.js`，不重写结构化记忆 AI 更新流程。

## 新 owner

| 文件 | 角色 | 职责 |
|---|---|---|
| `js/core/memory/tableSemantics.js` | semantics | 模板、字段、行和值的纯归一化 / 显示值 / 条件颜色 |
| `js/features/memoryTable/model.js` | model | `chat.memoryTables` 状态形状、字段/行写入、历史、自动更新游标 |
| `js/features/memoryTable/service.js` | service | 绑定运行时 `state/currentChatId/currentChatType`，获取当前聊天和绑定模板 |
| `js/features/memoryTable/view.js` | view model | 列表过滤/排序 view model、时间/短值/HTML 转义 |
| `js/features/memoryTable/public.js` | public facade | 稳定导出，不写业务逻辑 |

## legacy shell

`js/modules/memory_table.js` 暂时仍负责：

- DOM 渲染。
- 事件绑定。
- 转换弹窗。
- 结构化记忆 AI 更新编排。
- 导入导出 UI。

但已迁移的纯函数、状态模型和列表 view model 只能通过 canonical owner 调用。

## 不做

- 不改 `chat_ai.js`。
- 不改 prompt builder。
- 不改 `vector_memory.js`。
- 不改自动更新调用 AI 的请求路径。
- 不改保存路径。

## Gate

`tools/arch-check.js` 会检查：

- 新 owner 文件存在且先于 `memory_table.js` 加载。
- `memory_table.js` 有 V23 compatibility 标记。
- `memory_table.js` 不再保留 `normalizeTemplate / normalizeFieldValue / ensureMemoryTableState / ensureTemplateDataForChat` 等已迁移实现。
- 新 `model/view` 文件不直接操作 DOM、fetch 或旧保存全局。
