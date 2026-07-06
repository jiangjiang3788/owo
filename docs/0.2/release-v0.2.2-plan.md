# v0.2.2：请求追踪底座和控制台 MVP

本版本实现“每次 AI/API 请求完整数据可查看、可复制”的第一版。

## Ownership

| 能力 | owner | 说明 |
|---|---|---|
| 请求追踪底座 | `js/platform/ai/requestTraceStore.js` | 记录 endpoint、headers、requestBody、response、错误、耗时；不渲染 UI |
| 请求控制台 service | `js/features/debugConsole/service.js` | 聚合 trace store 数据，提供复制格式 |
| 请求控制台 view | `js/features/debugConsole/view.js` | 右下角“请求”入口、列表、详情、复制、清空 |
| 稳定出口 | `js/features/debugConsole/public.js` | 供后续 quickDock 调用 |
| 样式 | `css/modules/debug_console.css` | 独立 CSS owner，不污染 chat/settings |

## MVP 范围

| 项目 | 处理方式 |
|---|---|
| 主聊天请求 | 接入 `chat_ai.getAiReply` |
| 自动总结 / 后台回复 | 接入 `chat_ai.getAiReply` 场景标签 |
| 图片自动描述 | 接入 `chat_ai.generateImageDescription` |
| 视频/语音通话 AI 回复 | 接入 `chat_ai.generateVideoCallAiReply` |
| 通话总结 | 接入 `chat_ai.generateCallSummary` |
| 表格记忆 / 论坛 / 日记 / 偷看等旧链路 | 通过 `utils.fetchAiResponse` 统一接入 |
| 向量 embedding | 接入 `platform/ai/embeddingAdapter` |
| GPT / NovelAI 生图 | 接入 `utils.generateGptImage`、`utils.generateNovelAiImage` |
| 头像识别 / 表情包识别 / 低电量关心 / 拉黑关系请求 | 接入对应 legacy 模块 |
| 模型列表 | 接入 API 设置、小剧场和 GPT 生图模型列表 |

## 安全边界

- `requestBody` 和模型返回内容完整记录。
- `Authorization`、`api-key`、`token` 类 header 默认打码。
- URL 中的 `key`、`api_key`、`token` 默认打码。
- 最近最多保留 80 条 trace，避免控制台无限膨胀。
- 单个响应体最多捕获 2,000,000 字符；超出会标记 `responseBodyTruncated`。

## 不在本版做

- 不做悬浮球聚合入口。
- 不修表格记忆 XML 格式诊断。
- 不改聊天框布局。
- 不拆 GitHub 备份恢复。

## 验收命令

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

## 手动 smoke

1. 打开应用后右下角出现“请求”入口。
2. 发送一条聊天消息。
3. 打开请求控制台，能看到“聊天回复请求”。
4. 展开详情，能看到 requestBody、endpoint、responseBodyText、durationMs。
5. 点击“复制”，剪贴板包含结构化 JSON。
6. 点击“复制全部”，能复制最近 trace 数组。
7. 点击“清空”，列表清空。

## 结论

v0.2.2 可以作为请求可观测 MVP 合并。下一版应做 `v0.2.3：表格记忆 XML 返回诊断`。
