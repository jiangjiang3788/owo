# V37：CSS ownership 收口计划

## 目标

V37 只建立 CSS owner 表、公共变量 owner 和 gate，不大改选择器，不移动业务样式块。

## 修改内容

| 文件 | 修改 |
|---|---|
| `css/shared/theme-tokens.css` | 从 `css/base.css` 迁出公共 `:root` 变量，成为公共 token 唯一 owner |
| `css/base.css` | 删除公共 `:root` 初始变量，只保留基础组件和全局基础样式 |
| `index.html` | 在 `css/base.css` 前加载 `css/shared/theme-tokens.css` |
| `tools/css-ownership-map.json` | 登记所有 CSS 文件 owner、角色、状态和行数预算 |
| `tools/css-ownership-gate.js` | 检查 CSS owner、公共 token、加载顺序和预算 |
| `tools/arch-check.js` | 接入 V37 CSS ownership gate 的静态校验 |
| `docs/operations/css-ownership.md` | 说明 CSS owner 规则和提交流程 |

## 不做什么

- 不拆大型 CSS 选择器块。
- 不重命名现有 CSS class。
- 不改 `index.html` 的业务 DOM。
- 不改 JS 业务逻辑。
- 不改 Netlify 直发模式。

## 验收

```bash
node tools/css-ownership-gate.js
node tools/screen-template-gate.js
node tools/screen-registry-gate.js
node tools/feature-integration-gate.js
node tools/memory-regression-gate.js
node tools/arch-check.js
node tools/netlify-build.js
```

浏览器检查：

```js
getComputedStyle(document.documentElement).getPropertyValue('--primary-color')
getComputedStyle(document.documentElement).getPropertyValue('--font-family')
```

都应该有值。页面样式应与 V36 保持一致。
