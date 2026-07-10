# OWO v0.7 · 长期陪伴人格阶段

v0.7 开始让 Memory Brain 不只记事实，而是沉淀长期陪伴关系、互动偏好、AI 自我连续性、情绪节点、纪念日、主动关心候选、人格核、陪伴边界和关系回忆 UI。

已完成：

```text
v0.7.0：关系连续性模型
v0.7.1：互动偏好模型
v0.7.2：AI 自我日记
v0.7.3：情绪节点和纪念日
v0.7.4：主动关心队列
v0.7.5：人格核版本历史
v0.7.6：陪伴边界设置
v0.7.7：关系回忆 UI
```

到 v0.9 前，Memory Brain 仍然只做可读取、可整理、可预览、可演练、可纠错、可 trace、可回滚和可浏览，不正式接管聊天 prompt。

## v0.7.4：主动关心队列

- 从 openThreads、未完成线索、高情绪节点、纪念日候选和项目节点生成关心候选。
- 候选可读、可关闭、可回滚。
- 清爽模式只展示“这件事为什么值得关心、建议下次怎么接、证据多少”。
- 不主动提醒、不正式注入 prompt、不替换旧记忆 owner。

## v0.7.5：人格核版本历史

- 把 AI 自我、关系连续性、互动偏好、情绪节点和主动关心候选收束成人格核版本。
- 吸收 jiwen 的数值化方向：connection / guardedness / valence / arousal / immersion 五轴 shadow metrics。
- 每版生成 numericAxes、axisDiffs、trustScore、stabilityScore 和 changeSummary。
- 写入 memoryBrain.personalityCoreVersions、memoryBrain.personalityCoreRuns、memoryBrain.models(type = personality-core) 和 batches(kind = personality-core-version)。
- 不正式注入 prompt，不触发主动提醒，不替换旧记忆 owner；cutoverGate 继续 blocked-until-v0.9。

## v0.7.6：陪伴边界设置

- 把人格核五轴转成亲密度、主动性、提醒频率、关心候选展示强度、追问深度和项目推进边界。
- 新增安静、平衡、项目三个预设，用户可以保存和回滚。
- 写入 memoryBrain.companionshipBoundarySettings、memoryBrain.companionshipBoundaryRuns 和 batches(kind = companionship-boundary-settings)。
- 明确补入 jiwen MIT 第三方声明：根目录 `THIRD_PARTY_NOTICES.md` 保留 `Copyright (c) 2026 Clara Shafiq` 和 MIT 许可全文。
- 继续不主动提醒、不正式注入 prompt、不替换旧记忆 owner；cutoverGate 继续 blocked-until-v0.9。

## v0.7.7：关系回忆 UI

- 把关系连续性、情绪节点、主动关心候选、人格核版本和陪伴边界整理成可浏览的关系时间线、回忆卡和重要节点房间。
- 新增四个只读房间：关系时间线、回忆卡片、未完成线索房间、边界和人格核房间。
- 每次生成会写入 memoryBrain.relationshipMemoryCards、memoryBrain.relationshipMemoryRooms、memoryBrain.relationshipMemoryRuns 和 batches(kind = relationship-memory-ui)。
- 支持撤回最近关系回忆 UI 批次，恢复上一组 active 回忆卡和房间。
- 继续不主动提醒、不推送、不接 sendMessage / getAiReply、不写旧 memory_table / journal / vector_memory、不正式注入 prompt；cutoverGate 继续 blocked-until-v0.9。
