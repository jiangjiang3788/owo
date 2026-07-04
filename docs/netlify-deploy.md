# Netlify 发布说明

本项目当前仍是静态前端项目，不需要 Vite、React、Next.js 或服务器函数。

## Netlify 配置

根目录新增 `netlify.toml`：

```toml
[build]
  command = "node tools/arch-check.js && node tools/netlify-build.js"
  publish = "dist"
```

构建过程会先运行架构 gate，再把可发布文件复制到 `dist/`。这样可以避免直接把 `docs/`、`tools/` 等维护文件发布出去。

## 发布前本地检查

```bash
node tools/arch-check.js
node tools/netlify-build.js
```

生成的 `dist/` 至少应包含：

```text
dist/index.html
dist/_redirects
dist/sw.js
dist/manifest.json
dist/css/
dist/js/
```

## SPA fallback

项目已有 `_redirects`：

```text
/* /index.html 200
```

`tools/netlify-build.js` 会把它复制到 `dist/`。Netlify 发布时应以 `dist/` 为 publish directory，因此 `_redirects` 会位于发布目录中。

## 缓存策略

`netlify.toml` 对 `/*` 设置了 `Cache-Control: no-cache`。当前文件还没有 hash 指纹，过度长缓存会让用户拿到旧脚本，所以 V4 暂不做强缓存优化。

## 环境变量

不要把 API key 或 token 写进 `netlify.toml`。当前应用的 API 配置仍由用户在浏览器端输入并保存在本地数据中。
