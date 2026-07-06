# V17：settings shell + public facade 版

## 目标

V17 进入阶段 4 的第一刀，但不拆 `settings.js` 内部业务细节。

本版只建立 settings feature 的稳定出口，避免后续 V18/V19/V20 拆 API 设置、外观、preset 时继续让新代码直接依赖 8000 行 legacy 文件。

## 新增 owner

| 文件 | 角色 | 职责 |
|---|---|---|
| `js/features/settings/settingsShell.js` | shell / registry | 保存 `js/settings.js` 注册过来的 legacy 实现引用，防止第二套 settings setup 实现 |
| `js/features/settings/settingsService.js` | service facade | 为 settings setup 入口提供稳定转发函数，不写设置业务逻辑 |
| `js/features/settings/public.js` | public facade | 对外暴露 `OwoApp.features.settings.publicApi`，只转发 service |

## 迁移入口

V17 把这些旧全局 setup 入口注册到 settings public facade：

- `setupChatSettings`
- `loadSettingsToSidebar`
- `setupMagicRoomApp`
- `setupApiSettingsApp`
- `setupWallpaperApp`
- `setupPresetFeatures`
- `setupCustomizeApp`
- `setupNightModeBindings`
- `setupStatusBarBindings`

旧入口仍然可用，但路径变成：

```text
window.setupApiSettingsApp()
  -> OwoApp.features.settings.publicApi.setupApiSettingsApp()
  -> settingsService
  -> settingsShell 保存的 js/settings.js legacy 实现
```

## 明确不做

- 不拆 API 设置表单。
- 不拆 provider preset CRUD。
- 不拆壁纸、字体、主题、夜间模式内部逻辑。
- 不改设置保存字段。
- 不改 DOM 结构。
- 不改 Netlify 直发方式。

## 防两套路径规则

1. `features/settings/public.js` 只允许暴露稳定 API，不写业务逻辑。
2. `settingsService.js` 只允许转发到 `settingsShell`，不直接操作 DOM、db、fetch。
3. `settingsShell.js` 只保存 legacy 实现引用，第二次注册不同实现直接报错。
4. `js/settings.js` 本版仍是具体实现 owner，但末尾必须注册到 `settingsShell`。
5. `js/main.js` 初始化 settings 时必须走 `OwoApp.features.settings.publicApi`。

## 下一版

V18 才开始拆 API 设置细节：

```text
features/settings/apiSettings/
  public.js
  service.js
  model.js
  view.js
  presetSemantics.js
```

V18 的底线仍然是：旧 `setupApiSettingsApp` 只做 compatibility facade，不能和新目录保留两套 API 设置实现。
