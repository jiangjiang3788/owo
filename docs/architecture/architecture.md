# OWO 当前架构

## 1. 项目形态

OWO 目前仍是静态网页应用：

```text
index.html
+ 顺序加载的全局 JavaScript
+ OwoApp namespace
+ Dexie / IndexedDB
+ 静态 Gate 与语义 fixture
```

项目暂未引入打包器。`script-manifest.json` 是脚本和样式加载顺序的 canonical 清单，`tools/script-manifest-gate.js` 验证重复加载、顺序和文件存在性。

## 2. 分层

```text
js/app/       启动、注册表、状态默认值和兼容入口
js/core/      纯语义、契约和状态机，不访问 DOM / 网络 / 数据库
js/platform/  Provider、存储、浏览器和可观测性 Adapter
js/features/  用例服务、视图和 public API
js/modules/   尚未完成迁移的 legacy 业务模块
```

迁移原则是“逐片替换后删除旧片段”，而不是复制第二份实现。

## 3. AI 调用所有权

```text
Task Contract
→ AI Config / Route
→ Provider Request Adapter
→ AI Runtime
→ Response Normalizer / Trace
```

Canonical owner：

- Task 定义：`js/core/ai/taskContracts.js`
- 路由语义：`js/core/ai/routingSemantics.js`
- API 与模型快照：`js/platform/ai/aiConfigStore.js`
- Provider 请求组装：`js/platform/ai/providerRequestAdapter.js`
- 统一执行：`js/features/aiRuntime/service.js`
- 请求追踪：`js/platform/ai/requestTraceStore.js`

业务功能不得新增直接 Provider fetch、直接读取 API Key 或自由组合未注册策略。

## 4. 私聊 Runtime v0.9.2

私聊当前采用单一 Prompt Builder 加三态执行切换：

```text
chat_ai 单一 builder
→ PreparedConversationRequest
→ Chat Runtime
   ├── legacy
   ├── shadow
   └── unified
→ AI Runtime
→ 现有 stream / response parser
```

- `legacy`：旧 executor 返回回复；
- `shadow`：统一 Runtime 做 dry-run preflight，旧 executor 只请求一次；
- `unified`：统一 Runtime 执行同一个 Provider Request；
- 三种模式都不构建第二份 Prompt，也不发第二次模型请求。

详细决策见：

- `docs/architecture/decisions/ADR-001-single-chat-builder.md`
- `docs/architecture/decisions/ADR-002-chat-runtime-cutover.md`

## 5. 日记 Runtime v0.9.3

日记生成、摘要和合并采用单一 Prompt Builder、单一写入 owner 和三态执行切换：

```text
modules/journal.js 唯一 Prompt builder
→ Journal Runtime
   ├── legacy
   ├── shadow
   └── unified
→ Output Contract
→ modules/journal.js / journalService 唯一写入
```

- `Journal Runtime` 不写 `memoryJournals`；
- Shadow 只做路由预检，不发第二次正常请求；
- 输出不符合 `journal.entry.v1` 或 `journal.merge-result.v1` 时最多修复一次；
- 修复失败会在业务写入之前终止。

决策见 `docs/architecture/decisions/ADR-003-journal-single-write.md`。

## 6. 存储

- Dexie Writer 是唯一 IndexedDB writer；
- `platform/storage/repository.js` 是公开保存入口；
- 备份导入必须先校验、再事务写入；
- 导入失败不能改变原数据；
- 旧 Memory Brain 数据只可出现在 `legacySnapshots.memoryBrain`。

## 7. 现有记忆资产

Memory Brain 已退休。当前仍保留：

- 日记：时间叙事资料；
- 档案/表格：用户可编辑结构资料；
- 向量：现阶段仍有旧内容能力，后续降级为可重建索引；
- 世界书：虚构设定上下文。

在成长型记忆上线前，正式聊天仍由现有日记/档案/向量 owner 提供内容。后续通过统一 Context Runtime 逐片替换，禁止重新建立万能记忆脑。

## 8. 文档与发布

所有说明文档位于 `docs/`：

- 当前架构：`docs/architecture/`
- 发布与路线：`docs/releases/`
- Gate 和运维：`docs/operations/`
- 已退休设计：`docs/history/`
- 第三方声明：`docs/legal/`

## 9. 强制 Gate

至少执行：

```bash
node tools/arch-check.js
node tools/ai-pipeline-gate.js
node tools/chat-runtime-cutover-gate.js
node tools/journal-runtime-cutover-gate.js
node tools/backup-restore-safety-gate.js
node tools/script-manifest-gate.js
node tools/trace-safety-gate.js
node tools/memory-regression-gate.js
node tools/netlify-build.js
```

Gate 只负责架构和基础 fixture；真实浏览器交互仍需按 `docs/operations/smoke-memory.md` 进行冒烟测试。
