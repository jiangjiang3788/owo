# OWO v0.6.1：召回策略调参 + 稳定修复

本版目标：在不正式接管 prompt 的前提下，增强 Memory Brain 影子注入候选的排序质量，并修复当前聊天/备份/输入体验中的几个稳定性问题。

## 做什么

- Memory Brain 影子注入召回加入 `trustScore / trustLevel`。
- 召回排序加入 `weight / activation` 和时间新鲜度。
- 召回过滤 duplicate / obsolete / merged / retired，降低 disputed / needs-edit 权重。
- 继续只生成 shadow preview 和 adapter report，不写正式 prompt。
- GitHub 备份 fetch 失败时给出可理解错误，不再只显示 `Load failed`。
- 表格记忆自动更新遇到 XML 格式错误时只写诊断和简短 toast，不弹出长错误模态，不影响聊天主流程。
- 全局消息弹窗通知开关真正作为 master switch 保存并生效。
- 聊天输入框补充防自动填充属性，降低 Edge / 微信输入法 / 系统密码管理误判为密码或银行卡输入的概率。

## 不做什么

- 不正式注入 Memory Brain。
- 不接 `sendMessage / getAiReply / promptSemantics`。
- 不写旧 `memory_table / vector_memory / journal`。
- 不做外部脑 / MCP。

## 验收

- `retrieval-and-stability-gate.js`
- 既有 v0.3～v0.6 memory / history / trust / owner gates
- `netlify-build`
