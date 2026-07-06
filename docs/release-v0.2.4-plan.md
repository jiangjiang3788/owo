# v0.2.4 Release Plan — 聊天框功能重排 + 设置类 app 第二页

## Scope

本版只处理两个用户可见 UI 调整：

1. 聊天底部展开面板重排和紧凑化。
2. 主屏设置类 app 集中到第二页，并让这些入口显示 app 名称。

不在本版实现悬浮球、模型切换 facade、GitHub 备份 facade；但记录悬浮球后续需求，避免 v0.2.6 设计遗漏。

## Ownership

| 功能 | Owner | 说明 |
|---|---|---|
| 聊天展开面板静态顺序 | `js/features/chat/chatRoomScreenTemplate.js` | 只改静态 HTML 顺序，按钮 ID 保持不变 |
| 聊天面板紧凑样式 | `css/chat.css` | 使用既有 chat CSS owner，不新增业务逻辑 |
| 主屏 app 分组 | `js/features/home/homeAppCatalog.js` | 只保存主页 app 分组元数据，不访问 DOM / db / fetch |
| 主屏渲染消费 | `js/ui.js` | 旧 home shell 消费 catalog，保留兼容事件 |
| 主屏设置页样式 | `css/layout.css` | 第二页 app 名称展示和 dock 占位收敛 |

## Chat panel order

目标顺序：

```text
重回 → 相册 → 识图 → 直接拍照 → 提醒 → 日记 → 档案 → 向量 → 其他功能
```

完整保留的 ID：

```text
regenerate-btn
photo-video-btn
image-recognition-btn
camera-capture-btn
reminder-btn
memory-journal-btn
memory-table-btn
vector-memory-btn
voice-message-btn
wallet-btn
gift-btn
time-skip-btn
delete-history-btn
char-gallery-manage-btn
capture-btn
shop-btn
video-call-btn
location-btn
abort-reply-btn
node-system-btn
msg-version-btn
```

## Home app grouping

第一页保留高频入口：

```text
聊天、世界书、番茄钟、论坛、存钱罐、小剧场
```

第二页集中设置类入口：

```text
API、壁纸、自定义、教程、外观设置、白昼模式、夜间模式、存储分析、魔法屋
```

这些第二页入口都必须显示 app 名称。

## Deferred quickDock requirements

v0.2.6 悬浮球设计时必须包含：

1. 提示词入口放入悬浮球。
2. 悬浮球控制台 / 提示词面板允许大尺寸，必要时可近全屏。
3. 面板必须有明显关闭按钮，点击即可关闭。
4. 提示词正文必须按真实换行显示，不能把换行渲染成反斜杠 n 字符串。

## Gates

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
