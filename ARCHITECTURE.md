# OWO 架构重整 V1：单一路径守则

第一版目标不是大拆业务，而是防止重构时出现“两套实现”。

## 分层 ownership

| 层 | 放什么 | 禁止什么 |
|---|---|---|
| `js/core` | 领域语义、归一化、解析、映射、纯计算 | `window`、`document`、`fetch`、Dexie、DOM、UI |
| `js/app` | 启动、screen registry、全局 wiring | 具体业务规则、平台请求细节 |
| `js/features` | 功能用例、service、controller、view | 跨 feature 的中心语义 |
| `js/platform` | Dexie、localStorage、fetch、文件、音频、第三方 API | 领域 UI、角色/聊天业务规则 |
| `js/shared` | 通用 UI、通用 hook、通用 utils、样式桥 | chat/character/memory/forum/worldbook 等业务语义 |
| `js/compat` | 旧路径兼容转发 | 新业务逻辑 |

## 单一路径规则

1. 每个语义只能有一个 canonical owner。
2. 迁移时必须在同一次改动中完成：新 owner 实现 + 旧路径转发 + ledger 更新 + gate 通过。
3. 旧 `window.xxx` 可以存在，但只能是兼容 facade。
4. 新目录禁止依赖旧全局路径，例如 `js/features/**` 不应直接调用 `window.showToast`。
5. 未迁移的旧函数保持 `legacy-owner`，不要提前创建同义新实现。
6. facade 文件只允许转发，不允许写业务判断。

## V1 pilot

`pad` 已迁移为：

- canonical owner：`OwoApp.shared.utils.pad`
- legacy alias：`window.pad`
- 验收：`window.pad === window.OwoApp.shared.utils.pad`

这个 pilot 用来验证“两个入口，一个实现”的方式。
