# V20：preset engine 统一 + 账号密码解锁暂停

## 范围

V20 只做两件事：

1. 统一 `API / font / widget-wallpaper` 三类预设的通用 model/service。
2. 暂停启动时的账号密码登录门禁，直接进入应用。

V20 不改：

- TTS / COT 预设。
- `chat_ai.js`。
- provider fetch / stream。
- prompt builder。
- API 设置 UI 主流程。

## 新 owner

| 职责 | canonical owner |
|---|---|
| 通用预设数组语义 | `OwoApp.features.settings.presetEngine.model` |
| state/key 绑定的预设 store | `OwoApp.features.settings.presetEngine.presetEngineService` |
| 预设引擎稳定出口 | `OwoApp.features.settings.presetEngine.publicApi` |
| 账号密码登录门禁开关 | `OwoApp.app.authGate` |

## 预设 engine 规则

`presetEngineModel.js` 只允许处理纯数组语义：

- `normalizeName`
- `normalizeCollection`
- `upsertByName`
- `renameAt`
- `removeAt`
- `mergeByName`
- `createPreset`

`presetEngineService.js` 只允许绑定 `state + key`：

- `getPresets`
- `savePresets`
- `upsertPreset`
- `renamePreset`
- `removePresetAt`
- `mergeImportedPresets`
- `createStateStore`

不允许在 preset engine 中出现：

- DOM UI 绑定。
- TTS / COT 业务。
- 聊天逻辑。
- `fetch` / `processStream`。
- `saveData()` 或旧 `window.saveData`。

## 迁移结果

| 模块 | V20 前 | V20 后 |
|---|---|---|
| API preset | `apiPresetService.js` 自己维护数组 CRUD | 复用 `presetEngine.publicApi`，本文件只保留 API 表单映射 |
| Font preset | `fontPresetView.js` 直接读写 `db.fontPresets` | 通过 `presetEngine.createStateStore({ key: 'fontPresets' })` |
| Widget wallpaper preset | `widgetWallpaperPresetView.js` 直接读写 `db.widgetWallpaperPresets` | 通过 `presetEngine.createStateStore({ key: 'widgetWallpaperPresets' })` |

## 账号密码解锁暂停

V20 新增：

```text
js/app/authGate.js
```

当前配置：

```js
const AUTH_GATE_ENABLED = false;
```

启动路径：

```text
DOMContentLoaded
  -> OwoApp.app.authGate.start({ initDatabase, init, renderLoginOverlay })
  -> AUTH_GATE_ENABLED === false
  -> initDatabase()
  -> init()
```

暂停期间：

- 不渲染登录遮罩。
- 不调用远端账号密码验证接口。
- 不要求 `localStorage.ephone_auth`。

旧 `renderLoginOverlay()` / `tryLogin()` 仍保留，方便以后重新启用，但 `tryLogin()` 会先检查 `authGate.isPaused()`，暂停状态下不会发起账号密码验证请求。

## 验收

```js
window.OwoApp.features.settings.presetEngine.publicApi
window.OwoApp.app.authGate.getMode() === 'paused'
```

手工检查：

1. 打开页面应直接进入应用，不显示账号密码登录遮罩。
2. API 预设保存、应用、重命名、删除、导入、导出正常。
3. 字体预设保存、应用、重命名、删除正常。
4. 主屏幕壁纸方案保存、应用、重命名、删除、导入、导出、重置正常。
5. API 设置和聊天逻辑不受影响。
