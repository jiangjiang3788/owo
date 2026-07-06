# V38.1：移除用户可见占位功能入口

本版只清理用户界面里“点开后提示开发中 / 敬请期待”的占位功能，不新增新模块、不拆业务逻辑、不删除兼容架构。

## 移除范围

- 更多菜单中的占位入口：日历、小号、动态、联机。
- 主屏中的占位入口：音乐、别看、小屋。
- 外观教程页里的“壁纸方案 / 敬请期待”预留卡片。
- 未加载的音乐占位文件：`js/modules/music_player.js`、`css/modules/music_player.css`。
- 自定义图标列表中的占位图标项：`music-screen`、`diary-screen`、`biekan-app`、`xiaowu-app`。

## 保留范围

- 已有真实功能：存钱罐、论坛、小剧场、偷看、番茄钟、收藏、正则、状态栏、API 设置等。
- V34～V36 的 screen template placeholder 容器：这些是模板 hydrate 的技术容器，不是用户可见的占位功能，不能删除。
- 空状态提示，例如“暂无收藏”“暂无日记”等，这些是正常 UI 状态。

## Gate

新增：

```bash
node tools/placeholder-feature-gate.js
```

检查内容：

- 不允许重新出现 `功能开发中 / 正在开发中 / 敬请期待` 这类用户可见占位提示。
- 不允许重新出现被移除的占位入口 selector。
- 不允许 `defaultIcons` 和自定义图标列表继续登记被移除的占位入口。
- 不允许保留未加载的音乐占位文件。
