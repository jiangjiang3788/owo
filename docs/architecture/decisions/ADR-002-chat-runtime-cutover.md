# ADR-002：私聊 Runtime 采用三态切换但不双请求

## 状态

Accepted，v0.9.2。

## 模式

| 模式 | Prompt owner | 网络执行 owner | 用途 |
|---|---|---|---|
| `legacy` | 旧单一 builder | legacy executor | 紧急回退 |
| `shadow` | 旧单一 builder | legacy executor | 新 Runtime 只做 dry-run preflight 和 Trace |
| `unified` | 旧 builder adapter | Chat Runtime | 正式切换执行 owner |

## 关键约束

- 三种模式共用同一个 `providerRequest` 对象；
- Shadow 不再次构建 Prompt，不再次请求模型；
- 每轮聊天网络请求数仍为 1；
- 响应解析仍复用 `chat_ai.js` 当前逻辑；
- 切换失败时只修改 `chatRuntimeMode`，不迁移或复制聊天数据。

## 默认值

v0.9.2 默认 `shadow`，便于积累 preflight Trace，同时保持现有回复路径。
