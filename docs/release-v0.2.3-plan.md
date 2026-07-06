# v0.2.3：表格记忆 XML 返回诊断版

## Scope

本版只处理“表格记忆整理/更新时，模型返回格式不对但定位不到”的问题，不改聊天框重排、主页第二页、模型切换或悬浮球。

## Ownership

| 文件 | 层级 | 职责 |
|---|---|---|
| `js/core/memory/tableUpdateXmlSemantics.js` | core / memory | 纯文本清洗、`<memory_updates>` 提取、诊断对象归一化，不访问运行时状态、网络或持久化 |
| `js/features/memoryTable/updateDiagnosticsService.js` | features / memoryTable | 使用当前模板和 chat 状态验证模型返回，生成可复制诊断，并写入 request trace store |
| `js/modules/memory_table.js` | legacy shell | 保留旧入口，只把 XML 解析前置到 diagnostics service |
| `js/platform/ai/requestTraceStore.js` | platform / ai | 新增 `recordDiagnostic()`，允许非网络诊断记录进入请求控制台 |
| `tools/memory-regression-gate.js` | tools | 增加 XML 坏格式样例、文件存在和加载顺序检查 |

## Implemented

- 支持从 Markdown 代码块中提取 XML。
- 支持忽略 `<memory_updates>` 前后的解释文字。
- 支持模型只返回 `<memory_update>` 时临时包裹根节点并给出 `ROOT_REPAIRED` 诊断。
- 对纯文本、JSON、缺闭合标签、缺 `templateId/tableId/fieldId`、未知模板/表格/字段、rows 表误用 field、keyValue 表误用 row 生成诊断。
- 解析失败或诊断警告会写入请求控制台，可复制 `rawContent / cleanedContent / extractedXml / parserError / issues`。
- `docs/smoke-memory.md` 新增 `MEM-TABLE-XML-01`。

## Not included

- 不改主聊天 prompt 编排。
- 不改请求发送逻辑。
- 不改表格记忆 UI 布局。
- 不拆 `js/core/memory/tableSemantics.js` 历史 378 行文件；本版避免继续往其中加代码。

## Acceptance

```bash
node tools/arch-check.js
node tools/css-ownership-gate.js
node tools/screen-registry-gate.js
node tools/screen-template-gate.js
node tools/feature-integration-gate.js
node tools/memory-regression-gate.js
node tools/legacy-globals-gate.js
node tools/netlify-build.js
```

Expected: all gates pass. Legacy large-file warnings remain allowed.

## Conclusion

v0.2.3 可以作为表格记忆格式诊断 MVP 合并。下一版应做 `v0.2.4：聊天框重排 + 设置类 app 第二页`。
