# V22：settings legacy shell 收口

## 目标

V22 不继续拆新业务模块，只清理阶段 4 已迁移入口的 routing 边界，避免 `settingsShell` 继续保存已经迁移到子模块的 setup 实现。

## 已收口入口

| 入口 | V22 后 canonical owner | 是否允许注册到 settingsShell |
|---|---|---:|
| `setupApiSettingsApp` | `OwoApp.features.settings.apiSettings.publicApi.setupApiSettingsApp` | 否 |
| `setupWallpaperApp` | `OwoApp.features.settings.appearance.publicApi.setupWallpaperApp` | 否 |
| `setupNightModeBindings` | `OwoApp.features.settings.appearance.publicApi.setupNightModeBindings` | 否 |
| `setupStatusBarBindings` | `OwoApp.features.settings.appearance.publicApi.setupStatusBarBindings` | 否 |
| `initCotSettings` | `OwoApp.features.settings.voiceCot.publicApi.initCotSettings` | 否 |

## 仍然留在 legacy shell 的入口

| 入口 | 原因 |
|---|---|
| `setupChatSettings` | 仍包含聊天设置页大量 DOM 绑定，后续应单独切片 |
| `loadSettingsToSidebar` | 仍是角色设置页回填中心，后续应和角色 settings 拆分一起处理 |
| `setupMagicRoomApp` | 尚未迁移 |
| `setupPresetFeatures` | 仍绑定气泡 CSS 等未迁移 preset 入口 |
| `setupCustomizeApp` | 仍包含图标/名称/全局 CSS 等自定义设置 |

## V22 规则

1. 已迁移入口必须强制走对应子模块 public facade，不再 fallback 到 `settingsShell`。
2. `settingsShell.registerLegacyApi()` 如果收到已迁移入口，应直接抛错。
3. `settings.js` 末尾只注册尚未迁移的 legacy setup。
4. 旧 `window.setupXxx` 仍可用，但只能通过 `OwoApp.compat.expose()` 指向 canonical route。
5. 本版不新增业务模块，不改 API 设置、外观、TTS、CoT、聊天、fetch、stream。

## 验收

```js
window.OwoApp.features.settings.publicApi.getSettingsRoutingReport()
```

预期：

- `legacyShellApis` 只包含尚未迁移入口。
- `migratedCanonicalApis` 包含 API 设置、壁纸、夜间模式、顶栏状态栏、CoT init。
- `setupWallpaperApp / setupNightModeBindings / setupStatusBarBindings` 不再出现在 `settingsShell.listRegisteredApiNames()` 中。
