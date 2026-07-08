# OWO Memory Brain v0.5

v0.5 是可信记忆阶段。

目标不是继续增加注入能力，而是让 Memory Brain 在正式接管前先变得可审查、可纠错、可解释。

边界：到 v0.9 完成前，Memory Brain 仍然只读 / 可整理 / 可预览 / 可演练 / 可纠错，不正式接管聊天 prompt；旧记忆 owner 继续负责正式注入。

## v0.5.0：可信记忆审查收件箱

汇总低置信、重复、冲突、过时事实和待确认长期模型，进入审查收件箱。

## v0.5.1：事实纠错 / 改写

从审查收件箱中标记为 `needs-edit` 的事实，或手动输入 Fact ID，改写事实内容和语义字段。改写保留原始来源、证据、家族连接和 graph 连接，并写入 `fact-correction` 批次，支持回滚。

## v0.5.2：冲突事实处理

对 `disputed facts` 选择真实版本、两边保留、条件保留、标记过时或忽略误报，写入 `fact-conflict-resolution` 批次，支持回滚。

## v0.5.3：家族合并 / 拆分

合并近似家族、拆分误聚家族、手动改名和修摘要。所有成员变更写入 `family-adjustment` 批次，支持回滚。

## v0.5.4：长期模型人工修正

人工修正用户画像、AI 自我、世界观、项目脑、互动偏好和关系连续性。每次修正生成新的 active 模型版本，旧模型 superseded，写入 `model-correction` 批次，支持回滚。

## v0.5.5：纠错影响传播

把事实改写、冲突处理、家族调整和长期模型修正传播到受影响的 family / graph / model / review inbox，写入 `correction-propagation` 批次，支持回滚。

## v0.5.6：记忆信任分

为事实、家族、graph 关系边和长期模型生成可解释 `trustScore`，参考证据数量、置信度、冲突状态、修正历史、传播状态和来源新鲜度。信任分写入 `memory-trust-score` 批次，支持回滚。

## v0.5.7：可信记忆 gate

统一检查审查收件箱、事实纠错、冲突事实处理、家族合并/拆分、长期模型人工修正、纠错影响传播和记忆信任分，生成 `trusted-memory-gate` 报告。这个 gate 只收口可信记忆阶段，不打开正式 prompt 注入；正式接管仍被 `blocked-until-v0.9` 拦住。
