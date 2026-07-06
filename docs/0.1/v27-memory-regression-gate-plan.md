# V27：memory regression gate

## 目标

V27 不拆新业务，只为 V23-V26 已迁移的 memory domain 建立固定回归门禁。

覆盖范围：

- memory table
- vector memory
- journal
- worldbook context
- memory domain cross-regression

## 修改内容

| 文件 | 修改性质 | 职责 |
|---|---|---|
| `docs/smoke-memory.md` | 新增 | 固定 memory 回归手工 smoke 矩阵 |
| `tools/memory-regression-gate.js` | 新增 | 静态检查 memory smoke 文档、owner 文件、脚本顺序和禁止依赖 |
| `tools/arch-check.js` | 修改 | 纳入 V27 gate，确保 memory smoke gate 不缺失 |
| `docs/refactor-ledger.md` | 修改 | 记录 V27 gate ownership |
| `ARCHITECTURE.md` | 修改 | 增加 memory regression gate 规则 |

## 不做什么

V27 明确不做：

- 不修改 `js/modules/chat_ai.js`
- 不修改 `js/modules/vector_memory.js`
- 不修改 prompt 主编排
- 不修改 provider fetch / stream / `processStream`
- 不修改 memory table / vector / journal / worldbook 业务实现
- 不修改 Netlify 直发配置

## Gate

```bash
node tools/arch-check.js
node tools/memory-regression-gate.js
node tools/netlify-build.js
```

V27 的 `memory-regression-gate.js` 是静态 gate，不替代浏览器手工 smoke。它主要防止：

1. memory smoke 文档缺少关键测试项。
2. V23-V26 owner 文件缺失。
3. owner 文件脚本顺序被破坏。
4. core memory 文件误接触 DOM / fetch / storage / window。
5. feature memory owner 误直接调用旧保存 / AI 全局。

## 结论

V27 完成后，阶段 5 的 memory domain 不再只是“拆了 owner”，而是有固定回归清单和静态 gate。下一版可以进入 V28 大 feature 阶段，或者先按 smoke 文档做一次手工回归。
