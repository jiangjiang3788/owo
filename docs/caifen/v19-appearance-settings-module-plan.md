# V19：外观 / 主题 / 壁纸 / 字体拆分

## 目标

基于 V18.1，继续阶段 4 的 `settings.js` 巨石拆分。本版只迁移 appearance / theme / wallpaper / font 相关 UI 与预设逻辑，不改 API 设置、不改 `chat_ai.js`、不改 provider fetch / stream。

## 新 owner

- `js/features/settings/appearance/appearanceModel.js`
  - 默认壁纸、默认主屏签名、默认 INS 小组件、默认夜间模式 CSS。
- `js/features/settings/appearance/appearanceRuntime.js`
  - 外观模块内部的 `save / toast / compressImage / fileAdapter` runtime 桥。
- `js/features/settings/appearance/wallpaperSettingsView.js`
  - 壁纸设置、全局聊天壁纸、全局通话壁纸 UI 绑定。
- `js/features/settings/appearance/fontPresetView.js`
  - 字体预设下拉、保存、应用、管理弹窗。
- `js/features/settings/appearance/widgetWallpaperPresetView.js`
  - 主屏幕壁纸 / 小组件方案保存、应用、导入、导出、重置。
- `js/features/settings/appearance/themeStatusView.js`
  - 夜间模式和顶栏状态栏 UI 绑定、导入导出和应用。
- `js/features/settings/appearance/appearanceService.js`
  - service facade，只聚合子 view。
- `js/features/settings/appearance/public.js`
  - public facade，只导出稳定 API。

## 非目标

- 不修改 API 设置模块。
- 不修改 `chat_ai.js`。
- 不修改 provider request / stream / response 解析。
- 不迁移 TTS、COT、voice 设置。
- 不迁移 icon/name/sound 等其它 customize 子功能。

## 兼容策略

`settings.js` 只保留 compatibility wrappers：

```text
populateFontPresetSelect -> OwoApp.features.settings.appearance.publicApi.populateFontPresetSelect
setupWallpaperApp -> OwoApp.features.settings.appearance.publicApi.setupWallpaperApp
applyNightMode -> OwoApp.features.settings.appearance.publicApi.applyNightMode
applyHomeStatusBar -> OwoApp.features.settings.appearance.publicApi.applyHomeStatusBar
```

旧全局入口继续可用，但实现只在 `features/settings/appearance` 中存在一份。

## 验收

- `node tools/arch-check.js` 通过。
- `node tools/netlify-build.js` 通过。
- 设置页中的壁纸、全局聊天壁纸、全局通话壁纸可保存和重置。
- 字体预设可保存、应用、重命名、删除。
- 主屏幕壁纸方案可保存、导出、导入、应用、重置。
- 夜间模式和顶栏状态栏可应用、导入、导出。
- API 设置和普通聊天 AI 回复不受影响。
