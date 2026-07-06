# V2 shared/platform 边界版

V2 目标：继续验证“两个入口，一个实现”，并开始把 `js/utils.js` 中最低风险的通用逻辑迁到明确 owner。

## 本版修改范围

| 序号 | 修改性质 | 性价比 | 进度 | 修改原因 | 涉及文件 | 用时 | 危险性 | 验收标准 | 最小 MVP 标准 |
|---:|---|---|---|---|---|---|---|---|---|
| 1 | 扩展命名空间 | A | V2-1 | V1 只有 shared/utils 和 shared/ui，V2 需要 platform/browser 承接浏览器能力 | `js/app/namespace.js` | S | 低 | `window.OwoApp.platform.browser` 存在 | platform/browser 模块可注册函数 |
| 2 | 迁移通用 ID 工具 | A | V2-2 | `generateUUID` 是纯工具，适合先迁出 `utils.js` | `js/shared/utils/id.js`、`js/utils.js` | S | 低 | `window.generateUUID === OwoApp.shared.utils.generateUUID` | 旧调用仍可生成 UUID |
| 3 | 迁移通用文本工具 | A | V2-3 | `getRandomValue` 本身只是逗号分隔随机选择，不应继续留在大工具文件 | `js/shared/utils/text.js`、`js/utils.js` | S | 低 | `window.getRandomValue === OwoApp.shared.utils.getRandomValue` | Gemini 多 key 旧调用不变 |
| 4 | 迁移通用时间工具 | A | V2-4 | 时间格式化是纯函数，适合从 `utils.js` 拆出 | `js/shared/utils/time.js`、`js/utils.js` | M | 低 | 旧时间展示函数与 canonical owner 是同一函数 | 消息时间、时间差、时区显示不变 |
| 5 | 迁移确认弹窗 UI | B+ | V2-5 | `showAppConfirmDialog` 是通用 UI，不应在大工具文件里继续增长 | `js/shared/ui/confirmDialog.js`、`js/utils.js` | M | 中低 | `window.showAppConfirmDialog === OwoApp.shared.ui.showAppConfirmDialog` | 旧调用可弹出并返回 confirm/cancel/dismiss |
| 6 | 迁移图片压缩 adapter | A | V2-6 | `compressImage` 直接使用 FileReader/Image/Canvas，属于平台浏览器适配 | `js/platform/browser/imageAdapter.js`、`js/utils.js` | M | 中 | `window.compressImage === OwoApp.platform.browser.compressImage` | 头像/图片上传压缩旧调用不变 |
| 7 | 迁移系统通知 adapter | B+ | V2-7 | Service Worker 通知属于浏览器平台能力 | `js/platform/browser/notificationAdapter.js`、`js/utils.js` | S | 中低 | `window.showSystemNotification === OwoApp.platform.browser.showSystemNotification` | 开启权限后通知逻辑不变 |
| 8 | 新增 ownership map gate | A+ | V2-8 | 防止 canonical 迁移后，legacy 文件又写回第二套实现 | `tools/ownership-map.json`、`tools/arch-check.js` | M | 低 | `node tools/arch-check.js` 会检查 owner 加载顺序和 legacy 残留实现 | 已迁移符号无法在 `utils.js` 重新定义函数实现 |
| 9 | 更新账本和架构文档 | A | V2-9 | 后续开发必须知道哪些符号已经 canonical，哪些仍是 legacy-owner | `ARCHITECTURE.md`、`docs/refactor-ledger.md` | S | 低 | 文档列出 V2 migrated 和 deferred 清单 | 不会误把高风险逻辑复制到新路径 |

## 本版明确不做

| 不做项 | 原因 |
|---|---|
| 不拆 `db.js/saveData` | 存储必须单写，V2 不碰 |
| 不拆 `chat_ai.js` | AI provider/prompt 等到 V3 |
| 不迁移 `showToast` | Toast 有队列和显示状态，后续单独迁移 |
| 不迁移 `triggerHapticFeedback` | 旧实现读取 `db.hapticEnabled`，不能直接放 platform |
| 不迁移 PNG metadata | 含应用格式语义，后续单独判断 ownership |

## V2 验收命令

```bash
node --check js/utils.js
node --check js/shared/utils/id.js
node --check js/shared/utils/text.js
node --check js/shared/utils/time.js
node --check js/shared/ui/confirmDialog.js
node --check js/platform/browser/imageAdapter.js
node --check js/platform/browser/notificationAdapter.js
node tools/arch-check.js
```
