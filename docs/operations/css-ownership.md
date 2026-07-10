# CSS ownership map

V37 只建立 CSS 归属、公共变量和 gate，不大改选择器，不改变业务 DOM。

## 公共 token

公共 CSS 变量唯一 owner：

```text
css/shared/theme-tokens.css
```

这个文件只允许放 `:root` 级别的公共变量，不允许出现 chat / forum / wallet / theater / peek 等业务选择器。

`css/base.css` 不再拥有公共 `:root` 初始变量。夜间模式等主题覆盖仍可暂时保留在 `css/layout.css`，后续如需细拆再进入 theme override 文件。

## CSS ownership map

CSS 文件归属登记在：

```text
tools/css-ownership-map.json
```

新增 CSS 文件必须先进入 ownership map，至少写明：

```text
path
owner
role
status
maxLines
```

## Gate

提交前运行：

```bash
node tools/css-ownership-gate.js
node tools/arch-check.js
```

`node tools/css-ownership-gate.js` 会检查：

- `index.html` 加载的 CSS 是否都有 owner。
- 项目中所有 CSS 文件是否都登记在 `tools/css-ownership-map.json`。
- `css/shared/theme-tokens.css` 是否在 `css/base.css` 前加载。
- 公共 token 是否只由 `css/shared/theme-tokens.css` 初始定义。
- shared CSS 是否误放业务选择器。
- CSS 文件是否超过 owner map 预算。

## V37 之后的修改规则

- 新增 feature CSS 要归到对应 `features/<name>` owner，不要塞进 `css/base.css` 或 `css/settings.css`。
- 新增公共变量先加到 `css/shared/theme-tokens.css`，同时更新 `tools/css-ownership-map.json`。
- 不要在 feature CSS 中重新定义公共 `--bg-color` / `--primary-color` / `--font-family` 等初始 token。
- 大型 legacy CSS 暂时允许存在，但必须在 ownership map 中标记为 `legacy-heavy`。
