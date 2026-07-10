# ADR-001：私聊只保留一个 Prompt Builder

## 状态

Accepted，v0.9.2。

## 决策

在旧聊天 Prompt 尚未分段迁移完成前，`js/modules/chat_ai.js` 仍是唯一私聊 Prompt 和 Provider Request 构建者。

新 Chat Runtime 不创建：

- `buildUnifiedPrivatePrompt()`；
- `buildShadowPrivatePrompt()`；
- 第二份世界书、记忆或历史拼接逻辑。

它只接收已经构建完成的 `PreparedConversationRequest`，负责校验、切换执行 owner 和记录 Trace。

## 原因

如果新旧路径各自构建 Prompt，任何世界书、日记、档案、节点、CoT 或图片规则都需要改两次，并且 Shadow 差异无法判断是架构差异还是复制遗漏。

## 后续迁移

未来每个上下文来源逐个抽成 Context Provider，并替换旧 builder 内对应片段；旧代码片段被替换后立即删除，而不是保留两套实现。
