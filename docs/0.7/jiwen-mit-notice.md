# jiwen MIT notice for OWO v0.7.x

`jiwen`（积温）在提供的源码包中声明为 MIT License：

```text
Package: @clarashafiq/jiwen
Version: 0.4.0
Copyright (c) 2026 Clara Shafiq
License: MIT
```

OWO v0.7.5 / v0.7.6 对它的使用边界：

```text
吸收：连续数值轴、阈值、diff、状态解释的设计方向
不吸收：jiwen 主动开口 runtime、tick 漂移调度、tone-grid prompt 接线
不复制：jiwen.js、tone-grid.js、simulate.js 的源码主体
```

为了让归属足够明确，v0.7.6 在根目录新增 `THIRD_PARTY_NOTICES.md`，包含 jiwen 的 MIT 版权和许可全文。

OWO 侧新增实现仍然遵守 Memory Brain 的安全边界：

```text
formalPromptInjection = false
proactiveDelivery = false
shouldNotify = false
writesLegacyMemory = false
cutoverGate = blocked-until-v0.9
```
