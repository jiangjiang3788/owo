# OWO v0.8.13 第一版：Memory Brain 退休基线

## 本版范围

1. 删除未正式接管聊天的 Memory Brain 影子运行时。
2. 删除对应页面、首页入口、样式、脚本加载、调度和专项 Gate。
3. 保留日记、档案/表格、向量三套现有能力，行为暂不改变。
4. 旧浏览器数据中的 `memoryBrain` payload 在加载修复时转存到 `legacySnapshots.memoryBrain`。
5. 增加退休 Gate，禁止后续代码重新引入旧运行时。
6. 输出当前 AI / Prompt / 世界书 / 记忆所有权地图，作为下一版统一 Runtime 的输入。

## 明确不做

- 不取消 `journal / table / vector` 三选一。
- 不修改正式聊天 Prompt。
- 不重写日记、档案和向量数据。
- 不引入新的成长型记忆。
- 不增加服务器、MCP 或网关。

## 升级安全

- 完整备份仍会包含 `legacySnapshots`。
- Memory Brain 的旧数据不再执行、调度或进入 Prompt。
- 日记、档案和向量的现有入口保持可用。

## 验收命令

```bash
node tools/memory-brain-retirement-gate.js
node tools/legacy-memory-owner-gate.js
node tools/ai-pipeline-gate.js
node tools/feature-integration-gate.js
node tools/css-ownership-gate.js
node tools/screen-registry-gate.js
node tools/arch-check.js
node tools/netlify-build.js
```
