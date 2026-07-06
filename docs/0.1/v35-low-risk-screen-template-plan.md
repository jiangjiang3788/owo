# V35：低风险 screen 静态模板拆分

## 目标

只拆 `archive-screen`、`favorites-screen`、`storage-analysis-screen` 三个低风险 screen 的静态 HTML 模板。

本版不改业务逻辑、不改 DOM id、不接管 screen 切换，也不拆 `index.html` 中的高风险聊天/设置主屏。

## 新增 owner

| owner | 文件 | 职责 |
|---|---|---|
| `OwoApp.app.screenTemplates` | `js/app/screenTemplateRegistry.js` | 静态 screen 模板注册、hydrate、验收 |
| `archive-screen` template | `js/features/archive/archiveScreenTemplate.js` | 记忆存档 screen 静态 HTML |
| `favorites-screen` template | `js/features/favorites/favoritesScreenTemplate.js` | 收藏列表 screen 静态 HTML |
| `storage-analysis-screen` template | `js/platform/storage/storageAnalysisScreenTemplate.js` | 存储分析 screen 静态 HTML |

## 保持不变

- `.screen` 总数保持 69。
- `archive-screen`、`favorites-screen`、`storage-analysis-screen` 的 DOM id 保持不变。
- 业务模块仍通过原有 DOM id 绑定事件。
- `switchScreen()` 仍负责 `.screen.active` 切换。
- `screenRegistry` 只负责 lifecycle hook。
- 不拆 `index.html` 中的 modal、chat、settings 高风险 DOM。

## 禁止事项

- template 文件不写业务逻辑。
- template registry 不调用 `fetch`、`saveData`、`fetchAiResponse`、`processStream`。
- template registry 不接管 `.screen.active` 切换。
- 不改变 archive / favorites / storage 原有 DOM id。

## 验收

```bash
node tools/screen-template-gate.js
node tools/screen-registry-gate.js
node tools/feature-integration-gate.js
node tools/memory-regression-gate.js
node tools/arch-check.js
```

浏览器控制台：

```js
window.OwoApp.app.screenTemplates.getRoutingReport()
```

应看到：

```js
{
  version: 'V35',
  templateCount: 3,
  templateIds: ['archive-screen', 'favorites-screen', 'storage-analysis-screen'],
  pendingPlaceholders: []
}
```
