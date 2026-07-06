# V32：wallet / shop / payment card 归属第一刀

## 目标

只迁移钱包、商城、代付、转账和亲属卡的纯语义与聊天卡片 view model。

不改：

- `chat_ai.js`
- provider fetch / stream
- 消息保存路径
- `chat_render` 主入口
- 商城 UI 主流程
- 存钱罐 UI 主流程

## 新 owner

```text
js/core/wallet/paymentSemantics.js
js/features/wallet/paymentCardViewModel.js
js/features/wallet/public.js
```

## 职责

| 文件 | 职责 |
|---|---|
| `paymentSemantics.js` | 订单/代付/转账/亲属卡解析、金额格式、购物车总价、消息格式构建 |
| `paymentCardViewModel.js` | 小票、代付、转账、亲属卡聊天卡片 view model |
| `public.js` | wallet public facade |

## 兼容策略

- `chat_render.js` 继续负责 DOM 渲染，但不再直接拥有支付卡片解析语义。
- `shop.js` 继续负责商城 UI 和下单编排，但订单/代付消息格式构建走 `paymentSemantics`。
- 不移动 `sendPayResponse` 的消息保存流程，只把代付金额解析、支出记录和响应文本格式迁到 `paymentSemantics`。

## 验收

```bash
node --check js/core/wallet/paymentSemantics.js
node --check js/features/wallet/paymentCardViewModel.js
node --check js/features/wallet/public.js
node --check js/modules/chat_render.js
node --check js/modules/shop.js
node tools/arch-check.js
node tools/memory-regression-gate.js
node tools/netlify-build.js
```

浏览器检查：

```js
window.OwoApp.core.wallet.paymentSemantics
window.OwoApp.features.wallet.paymentCardViewModel
window.OwoApp.features.wallet.publicApi.getRoutingReport()
```
