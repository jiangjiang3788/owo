# OWO v0.7.6 · 陪伴边界设置

v0.7.6 的目标是把 v0.7.5 的人格核五轴转成用户可以理解、可以调整、可以回滚的陪伴边界设置。

输入来源：

```text
人格核版本历史
互动偏好模型
关系连续性模型
AI 自我日记
情绪节点和纪念日
主动关心候选
长期模型 / 事件 / 事实
```

输出写入：

```text
memoryBrain.companionshipBoundarySettings
memoryBrain.companionshipBoundaryRuns
memoryBrain.batches(kind = companionship-boundary-settings)
```

## 这版解决什么

v0.7.5 已经能形成人格核，但人格核还偏“内部模型”。v0.7.6 把它落成可控边界：

```text
亲密度
主动性
提醒频率
关心候选展示强度
不查岗 / 不追问语气
项目推进深度
情绪优先级
```

## 从 jiwen 继续吸收的方向

沿用 v0.7.5 的安全吸收方式：

```text
连续数值状态
  ↓
阈值解释
  ↓
边界设置
  ↓
用户可改 / 可回滚
```

OWO 侧没有接入 jiwen 的主动开口、tick drift 或 tone-grid prompt wiring。v0.7.6 只把数值状态变成 shadow 边界设置。

## 新增模块

```text
js/core/memoryBrain/companionshipBoundarySemantics.js
js/platform/memoryBrain/companionshipBoundaryStore.js
js/features/memoryBrain/companionshipBoundaryService.js
js/features/memoryBrain/companionshipBoundaryView.js
css/modules/memory_brain_companionship_boundary.css
tools/companionship-boundary-gate.js
THIRD_PARTY_NOTICES.md
docs/0.7/jiwen-mit-notice.md
```

## UI

放在“长期陪伴人格”分组里，位于人格核版本历史之后。

清爽模式展示：

```text
当前边界摘要
亲密 / 主动 / 提醒 / 展示 / 语气
八个数值控制条
主要规则
生成 / 保存预设 / 回滚 / trace
```

## 安全边界

v0.7.6 继续保持：

```text
formalPromptInjection = false
proactiveDelivery = false
shouldNotify = false
writesLegacyMemory = false
cutoverGate = blocked-until-v0.9
finalOwner = legacy
```

陪伴边界只影响 Memory Brain 里的展示、解释和后续 gate 评估；不会主动推送提醒，也不会替换旧记忆 owner。

## 验收

```bash
node tools/companionship-boundary-gate.js
node tools/personality-core-gate.js
node tools/proactive-care-gate.js
node tools/css-ownership-gate.js
node tools/arch-check.js
node tools/feature-integration-gate.js
node tools/netlify-build.js
```
