# V18.1 API Settings Review Fix

本修复基于 V18，不新增功能，只修正 V18 API settings 模块中的架构细节。

## 修复内容

1. `features/settings/apiSettings` 新文件不再直接调用 legacy `saveData()`，改走 `OwoApp.platform.storage.repository.saveData()`。
2. UI 提示不再直接依赖旧全局入口，优先走 `OwoApp.shared.ui.showToast/showApiError`，旧全局只作为 fallback。
3. API preset 管理列表不再用用户可控的 preset name/provider 拼接 `innerHTML`，改用 `textContent`。
4. model select 单一 option 设置改为 DOM API 创建 `option`，避免把模型名直接拼进 HTML 模板。
5. `getBlockedApiDomains()` 使用 optional chaining，避免静态配置缺失时抛错。
6. `arch-check` 增加 V18.1 gate：阻断 apiSettings 新文件重新直接调用 legacy `saveData()` 或用模板字符串拼接 option HTML。

## 未修改内容

- 不改 `chat_ai.js`。
- 不改 provider fetch / stream。
- 不改 API preset JSON 格式。
- 不改 Netlify 直发配置。
