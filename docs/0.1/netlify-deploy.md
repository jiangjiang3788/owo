# Netlify 发布说明

本项目当前仍是原生静态前端项目，不需要 Vite、React、Next.js、SSR 或服务器函数。

## 当前推荐：直接静态发布

V5 起，仓库默认采用直接发布模式，避免 Netlify 执行不存在或不必要的构建脚本。

`netlify.toml` 应保持：

```toml
[build]
  publish = "."
```

Netlify UI 中也建议保持：

| 配置项 | 值 |
|---|---|
| 基础目录 | 留空 |
| 包目录 | 留空 |
| 构建命令 | 留空 |
| 发布目录 | `.` |
| 函数目录 | 留空 |

注意：如果仓库中存在 `netlify.toml`，文件中的配置会覆盖 UI 中相同项目的设置。因此如果想直接发布，`netlify.toml` 里不能保留 `command = "node tools/..."`。

## 直接发布模式需要的最小文件

```text
index.html
js/
css/
```

推荐保留但不作为部署阻断项：

```text
_redirects
manifest.json
sw.js
```

`_redirects` 用于 SPA 深链刷新回退；`manifest.json` 和 `sw.js` 用于 PWA/安装/离线体验。缺少它们不应该阻断最基础的静态站部署。

## 可选：发布前整理到 dist

后续如果想避免把 `docs/`、`tools/` 也发布出去，可以切回 dist 模式：

```toml
[build]
  command = "node tools/arch-check.js && node tools/netlify-build.js"
  publish = "dist"
```

切换到 dist 模式前，本地先运行：

```bash
node tools/arch-check.js
node tools/netlify-build.js
```

`tools/netlify-build.js` 只复制静态文件，不打包、不转译、不改变运行时代码。

## 缓存策略

`netlify.toml` 对 `/*` 设置了 `Cache-Control: no-cache`。当前文件还没有 hash 指纹，过度长缓存会让用户拿到旧脚本，所以暂不做强缓存优化。

## 环境变量

不要把 API key 或 token 写进 `netlify.toml`。当前应用的 API 配置仍由用户在浏览器端输入并保存在本地数据中。
