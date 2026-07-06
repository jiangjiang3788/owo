# V5：Netlify 直接发布收口版

## 目标

V4 为了长期维护预留了 `dist` 构建模式，但实际部署时项目可以直接作为静态站发布。V5 的目标是消除“UI 已清空构建命令，但 `netlify.toml` 仍覆盖执行构建”的风险。

## 修改点

| 项目 | V5 处理 |
|---|---|
| `netlify.toml` | 保持 `publish = "."`，不写 `command` |
| `tools/arch-check.js` | 支持 direct publish 和 dist build 两种模式 |
| `tools/netlify-build.js` | 改成可选 dist 模式脚本，不再把 `manifest.json` / `sw.js` / `_redirects` 当作硬阻断 |
| `docs/netlify-deploy.md` | 以直接发布作为默认推荐 |
| `docs/refactor-ledger.md` | 记录 Netlify 发布 ownership 已从 V4 dist 模式调整为 V5 direct 模式 |

## 单一路径原则

当前只采用一种发布路径：

```text
Netlify -> publish = "." -> index.html / js / css
```

不再同时保留：

```text
UI 空构建命令
netlify.toml build.command 又强制构建
```

这两者同时存在会导致部署排查困难。

## 验收标准

```bash
node tools/arch-check.js
node tools/netlify-build.js
```

`arch-check` 通过即可；`netlify-build` 只是可选检查，直接发布模式下 Netlify 不会运行它。

浏览器部署验收：

1. Netlify 日志中不应再出现 `node tools/arch-check.js && node tools/netlify-build.js`。
2. 发布目录应显示为项目根目录。
3. 网站首页能打开。
4. `js/` 和 `css/` 资源加载无 404。

---

## 同版补充：Dexie adapter shell

V5 同时把 `db.js` 中的 Dexie schema / migration 第一刀迁到 `platform/storage`：

| owner | 文件 | 职责 |
|---|---|---|
| `OwoApp.platform.storage.dexieMigrations` | `js/platform/storage/dexieMigrations.js` | 只放 Dexie 版本迁移函数，不保存运行时数据 |
| `OwoApp.platform.storage.dexieAdapter` | `js/platform/storage/dexieAdapter.js` | 创建 Dexie 实例、注册 schema、挂载 migration |
| `initDatabase` legacy alias | `js/db.js` | 只回填 legacy `dexieDB` 变量，旧调用不变 |

仍然禁止：

1. 在 `dexieAdapter` 里调用 `saveData` / `saveCharacter` / `saveGroup` / `saveGlobalSettings`。
2. 在 `db.js` 重新 `new Dexie(...)`。
3. 在 `db.js` 重新声明 `version(...).stores(...)`。
4. 复制 private writer。保存公开入口仍是 `OwoApp.platform.storage.repository`。
