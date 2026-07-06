# V18：API 设置模块拆分

## 目标

把 `settings.js` 中的主 API 设置、副 API 设置、API preset CRUD、设置页模型列表拉取、天气 API 设置迁移到 `features/settings/apiSettings`，但不改聊天 provider 请求，不改 `chat_ai.js`，不改 stream 解析。

## 新增文件职责

| 文件 | 职责 |
|---|---|
| `js/features/settings/apiSettings/apiSettingsModel.js` | provider URL、sub API 配置、请求参数纯计算 |
| `js/features/settings/apiSettings/apiPresetService.js` | 主/副 API preset CRUD 和导入合并 |
| `js/features/settings/apiSettings/apiModelListService.js` | 设置页拉取模型列表，不处理聊天回复 |
| `js/features/settings/apiSettings/mainApiSettingsView.js` | 主 API 设置 UI 绑定、保存、主 preset 管理 |
| `js/features/settings/apiSettings/subApiSettingsView.js` | 副 API 设置 UI 绑定、副 preset 管理 |
| `js/features/settings/apiSettings/weatherApiSettingsView.js` | 天气 API 设置 UI 绑定 |
| `js/features/settings/apiSettings/public.js` | API 设置子模块 public facade |

## 保持不变

- `chat_ai.js` 不改。
- `fetchAiResponse` 不改。
- `processStream` 不改。
- OpenAI/Gemini 聊天请求发送不改。
- NovelAI / GPT 生图设置暂留 `settings.js`。
- Netlify 继续直接发布：构建命令空，发布目录 `.`。

## 防两套路径

- `setupApiSettingsApp` 的 canonical owner 是 `OwoApp.features.settings.apiSettings.publicApi.setupApiSettingsApp`。
- `settings.js` 只保留 API 设置相关 wrapper。
- `settingsService.setupApiSettingsApp()` 优先调用 API settings 子模块。
- `arch-check` 检查 apiSettings 文件加载顺序，并阻断 `settings.js` 重新写回 API 设置实现。
