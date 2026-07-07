# OWO v0.3.10：旧记忆 owner 守门 / 档案记忆格式修复

## 目标

修复用户选择“档案/表格记忆”作为正式记忆时，日记记忆仍然偶发进入总结、背景或自动更新链路，导致模型返回格式被带偏的问题。

本版不改变角色 system prompt，不改变用户自定义提示词，不改变 Memory Brain 的影子状态。

## 当前正式记忆边界

在 v0.9 完成前：

```text
Memory Brain 仍只读 / shadow
正式聊天 prompt 注入仍使用旧记忆系统
旧记忆系统必须三选一：journal / table / vector
```

三选一含义：

```text
journal：只允许日记记忆注入和自动日记总结
 table ：只允许档案/表格记忆注入和自动表格更新
vector ：只允许向量记忆注入和自动向量总结
```

表格或向量模式下，如果当前表格/向量内容为空，也不能回退读取收藏日记。

## 修改内容

### 1. 新增旧记忆 owner 语义

新增：

```text
js/core/memory/legacyMemoryOwnerSemantics.js
```

负责判断：

```text
当前正式 owner 是谁
哪些旧记忆可以注入
哪些自动总结/更新可以运行
Memory Brain 是否允许正式注入
```

其中：

```text
memoryBrainFormalInjection: false
```

明确表示 v0.9 前 Memory Brain 不参与正式 prompt 注入。

### 2. 修复聊天 prompt 记忆注入

`chat_ai.js` 新增统一入口：

```text
buildActiveLegacyMemoryContextBlock(chat)
```

正式 prompt、节点 prompt、通话 prompt 和 token 估算都只走当前 owner。

修复前：

```text
memoryMode = table
表格内容为空
↓
回退到日记记忆
```

修复后：

```text
memoryMode = table
表格内容为空
↓
不注入日记
```

### 3. 修复自动日记总结

`journal.js` 加入 owner guard。

当当前聊天不是 journal owner 时：

```text
自动日记总结不运行
pending 清空
running / queued 恢复 idle
返回 wrong-memory-owner
```

### 4. 修复自动表格更新

`memory_table.js` 加入 owner guard。

只有 `memoryMode = table` 时，表格自动更新才允许运行。

### 5. 修复自动向量总结

`vector_memory.js` 加入 owner guard。

只有 `memoryMode = vector` 时，向量自动总结才允许运行。

### 6. 新增 gate

新增：

```text
tools/legacy-memory-owner-gate.js
```

检查：

```text
Memory Brain 仍只读
journal / table / vector 三选一
表格/向量模式不得回退到日记
自动日记/表格/向量整理必须受 owner 管控
```

## 不做什么

```text
不改 system prompt
不压缩用户提示词
不改变角色风格
不让 Memory Brain 正式注入 prompt
不迁移旧记忆
不删除已有日记
不关闭用户手动生成日记功能
```

## 验收

当用户选择：

```text
使用记忆：档案/表格记忆
```

则：

```text
正式 prompt 只读取 memoryTables
日记收藏不进入 <memoir>
日记自动总结不会在聊天回复后触发
群聊收藏日记不会混入私聊 prompt
Memory Brain 仍只读
```
