# V28：forum 垂直切片第一刀

目标：把论坛的 profile / post / dm 纯语义和状态服务从 `js/modules/forum.js` 拆出，同时不改 `chat_ai.js` prompt 主编排、不改 provider fetch、不改 stream、不改消息发送。

## 文件职责

| 文件 | 职责 |
|---|---|
| `js/core/forum/forumSemantics.js` | 论坛 profile/post/comment/dm 的纯语义和归一化 |
| `js/features/forum/profileService.js` | 大号、小号、active account 状态服务 |
| `js/features/forum/postService.js` | 帖子、评论、点赞、收藏、删除、统计状态服务 |
| `js/features/forum/dmService.js` | 私信用户列表、会话、未读、评论上下文、好友申请状态服务 |
| `js/features/forum/public.js` | public facade，只导出稳定 API |
| `js/modules/forum.js` | legacy DOM renderer / 事件绑定 / 论坛 AI 编排 shell |

## 禁止事项

- 不修改 `js/modules/chat_ai.js`。
- 不修改 chat prompt 输出顺序。
- 不迁移论坛 AI 生成、陌生人私信 AI、评论 AI 回复的 fetch/stream 编排。
- 不在 `core/forum` 中访问 DOM、`window`、`db`、storage、network 或 `saveData`。
- 不在 `features/forum/*Service.js` 中直接调用旧 `window.saveData`、`fetchAiResponse` 或 `processStream`。

## 验收

```bash
node --check js/core/forum/forumSemantics.js
node --check js/features/forum/profileService.js
node --check js/features/forum/postService.js
node --check js/features/forum/dmService.js
node --check js/features/forum/public.js
node --check js/modules/forum.js
node tools/arch-check.js
node tools/netlify-build.js
```

浏览器 smoke：

```js
window.OwoApp.features.forum.publicApi.getRoutingReport()
typeof window.OwoApp.core.forum.forumSemantics.createUserPost
typeof window.OwoApp.features.forum.profileService.getActiveAccount
typeof window.OwoApp.features.forum.postService.addUserComment
typeof window.OwoApp.features.forum.dmService.getConversationMessages
```

手工测试：小号创建/切换、发帖、点赞、收藏、评论、删除帖子、私信列表、发送私信、未读 badge、好友申请、论坛 AI 刷新仍可用。
