// --- Memory Brain product semantics owner (v0.4.1) ---
// 只做记忆小屋、导出清单和切换前 safety gate 的纯计算；不访问 DOM、网络、存储或旧记忆系统。
(function registerMemoryBrainProductSemantics(app) {
    const core = app.core;
    core.memoryBrain = core.memoryBrain || {};

    const ROOM_DEFS = Object.freeze([
        Object.freeze({ id: 'floating', name: '今日浮现', icon: '✦', source: 'highlights', role: '让重要、未完成和最近激活的记忆先浮上来。' }),
        Object.freeze({ id: 'archive', name: '历史整理室', icon: '▦', source: 'archiveSources', role: '盘点全部聊天来源、消息数量、时间范围和预计切片。' }),
        Object.freeze({ id: 'timeline', name: '时间线书桌', icon: '☽', source: 'events', role: '按发生顺序保存事件和来源消息范围。' }),
        Object.freeze({ id: 'facts', name: '事实抽屉', icon: '◌', source: 'facts', role: '把复合事件拆成可追溯的原子事实。' }),
        Object.freeze({ id: 'families', name: '家族花园', icon: '✿', source: 'families', role: '让相似事实自己长成主题簇。' }),
        Object.freeze({ id: 'graph', name: '关系走廊', icon: '⌁', source: 'edges', role: '连接人物、主题、目的、情绪、项目和家族。' }),
        Object.freeze({ id: 'models', name: '长期模型房间', icon: '◈', source: 'models', role: '展示用户画像、AI 自我、世界观和项目脑。' }),
        Object.freeze({ id: 'injection', name: '注入观测窗', icon: '◇', source: 'injectionPreviews', role: '预览本次会想起什么，但不正式注入 prompt。' }),
        Object.freeze({ id: 'scheduler', name: '维护钟楼', icon: '◷', source: 'schedulerRuns', role: '省钱/均衡/深度调度、浮现和衰减维护。' })
    ]);

    function asArray(value) { return Array.isArray(value) ? value : []; }
    function active(items) { return asArray(items).filter(item => item && item.status !== 'retired'); }
    function activeModels(items) { return asArray(items).filter(item => item && item.status === 'active'); }
    function text(value) { return String(value == null ? '' : value).trim(); }
    function compactText(value, max) { const source = text(value); return source.length > max ? source.slice(0, max - 1) + '…' : source; }
    function latestAt(items) {
        return asArray(items).map(item => item && (item.updatedAt || item.createdAt || item.lastWeightAt || '')).filter(Boolean).sort().pop() || '';
    }
    function itemTitle(item, type) {
        if (!item) return '未命名记忆';
        if (type === 'event') return item.title || item.summary || '时间线事件';
        if (type === 'fact') return item.content || item.object || '原子事实';
        if (type === 'family') return item.name || item.title || '记忆家族';
        if (type === 'edge') return item.label || item.reason || `${item.fromLabel || item.fromId || '节点'} → ${item.toLabel || item.toId || '节点'}`;
        if (type === 'model') return item.title || item.type || '长期模型';
        if (type === 'injectionPreview') return item.query || item.memoryBlock || '注入预览';
        return item.title || item.name || item.content || item.id || '记忆';
    }
    function itemSummary(item, type) {
        if (!item) return '';
        return compactText(item.summary || item.description || item.reason || item.evidenceQuote || item.memoryBlock || item.content || itemTitle(item, type), 96);
    }
    function itemScore(item, type) {
        const weight = Number(item && item.weight) || 0;
        const activation = Number(item && item.activation) || 0;
        const confidence = Number(item && (item.confidence || item.importance)) || 0;
        const fanout = asArray(item && (item.factIds || item.familyIds || item.edgeIds || item.evidenceIds || item.selectedFactIds)).length;
        const typeBoost = { model: 0.16, family: 0.12, fact: 0.1, event: 0.08, edge: 0.05, injectionPreview: 0.04 }[type] || 0;
        return Math.min(1, Math.max(0.02, weight * 0.42 + activation * 0.3 + confidence * 0.18 + Math.min(fanout, 8) * 0.025 + typeBoost));
    }
    function collectHighlights(snapshot, options = {}) {
        const limit = Number(options.limit) || 9;
        const sources = [
            ['event', active(snapshot.events)],
            ['fact', active(snapshot.facts)],
            ['family', active(snapshot.families)],
            ['edge', active(snapshot.edges)],
            ['model', activeModels(snapshot.models)],
            ['injectionPreview', active(snapshot.injectionPreviews)]
        ];
        return sources.reduce((list, pair) => list.concat(pair[1].map(item => ({
            id: item.id,
            type: pair[0],
            title: compactText(itemTitle(item, pair[0]), 48),
            summary: itemSummary(item, pair[0]),
            score: Number(itemScore(item, pair[0]).toFixed(3)),
            updatedAt: item.updatedAt || item.createdAt || item.lastWeightAt || ''
        }))), []).sort((a, b) => b.score - a.score || String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0, limit);
    }
    function countSource(snapshot, source, highlights) {
        if (source === 'highlights') return highlights.length;
        if (source === 'models') return activeModels(snapshot.models).length;
        if (source === 'schedulerRuns') return asArray(snapshot.schedulerRuns).length + active(snapshot.scheduleQueue).length;
        return active(snapshot[source]).length;
    }
    function buildMemoryRooms(snapshot, highlights) {
        return ROOM_DEFS.map(room => {
            const count = countSource(snapshot, room.source, highlights);
            return {
                id: room.id,
                name: room.name,
                icon: room.icon,
                role: room.role,
                count,
                countText: String(count),
                status: count ? 'lit' : 'empty',
                source: room.source,
                latestAt: room.source === 'highlights' ? latestAt(highlights) : latestAt(snapshot[room.source])
            };
        });
    }
    function buildCutoverSafetyReport(snapshot) {
        const settings = snapshot.settings || {};
        const gates = [
            { id: 'shadow-mode', name: '仍处于影子模式', passed: settings.mode === 'shadow', note: 'v0.4.1 只做历史切片和游标，不接正式 prompt。' },
            { id: 'legacy-readonly', name: '旧系统只读对照', passed: settings.legacyBridgeMode === 'read-only-source', note: '旧 memory_table / vector_memory / journal 不被双写。' },
            { id: 'events-ready', name: '已有事件时间线', passed: active(snapshot.events).length > 0, note: '事件是事实和家族的来源。' },
            { id: 'facts-ready', name: '已有原子事实', passed: active(snapshot.facts).length > 0, note: '事实是 graph 和长期模型的基础。' },
            { id: 'families-ready', name: '已有记忆家族', passed: active(snapshot.families).length > 0, note: '家族证明记忆能自动成团。' },
            { id: 'graph-ready', name: '已有 graph 关系', passed: active(snapshot.edges).length > 0, note: 'graph 让召回不只靠向量。' },
            { id: 'models-ready', name: '已有长期模型', passed: activeModels(snapshot.models).length >= 2, note: '用户画像 / AI 自我 / 世界观 / 项目脑应可查看和回滚。' },
            { id: 'preview-ready', name: '已有注入预览', passed: active(snapshot.injectionPreviews).length > 0, note: '正式接管前必须先看它会想起什么。' },
            { id: 'rollback-batches', name: '有批次和回滚记录', passed: asArray(snapshot.batches).length > 0, note: '所有自动整理都要能追踪和撤回。' },
            { id: 'no-formal-injection', name: '未接正式聊天注入', passed: true, note: 'v0.9 前 Memory Brain 仍不替换当前旧记忆 owner。' }
        ];
        const passedCount = gates.filter(gate => gate.passed).length;
        return {
            gates,
            passedCount,
            total: gates.length,
            readyForFormalCutover: false,
            summary: `通过 ${passedCount}/${gates.length}；v0.4.1 只允许历史扫描、切片和游标，不允许正式换脑。`
        };
    }
    function buildMemoryExportManifest(snapshot, options = {}) {
        const safety = buildCutoverSafetyReport(snapshot);
        return {
            kind: 'owo-memory-brain-export-manifest',
            release: snapshot.release || 'v0.4.1',
            schemaVersion: snapshot.schemaVersion || 1,
            exportedAt: options.exportedAt || new Date().toISOString(),
            mode: snapshot.settings && snapshot.settings.mode || 'shadow',
            includedKeys: ['archiveSources', 'archiveScanRuns', 'events', 'facts', 'families', 'edges', 'models', 'injectionPreviews', 'scheduleQueue', 'schedulerRuns', 'batches', 'exports'],
            counts: {
                archiveSources: active(snapshot.archiveSources).length,
                archiveScanRuns: asArray(snapshot.archiveScanRuns).length,
                events: active(snapshot.events).length,
                facts: active(snapshot.facts).length,
                families: active(snapshot.families).length,
                edges: active(snapshot.edges).length,
                models: activeModels(snapshot.models).length,
                injectionPreviews: active(snapshot.injectionPreviews).length,
                scheduleQueue: active(snapshot.scheduleQueue).length,
                schedulerRuns: asArray(snapshot.schedulerRuns).length,
                batches: asArray(snapshot.batches).length,
                exports: asArray(snapshot.exports).length
            },
            safetySummary: safety.summary,
            readyForFormalCutover: safety.readyForFormalCutover,
            policy: { noLegacyWrite: true, formalPromptInjection: false, manifestOnlyStoredInApp: true }
        };
    }
    function buildMemoryPalace(snapshot, options = {}) {
        const highlights = collectHighlights(snapshot, { limit: options.highlightLimit || 9 });
        return {
            release: snapshot.release || 'v0.4.1',
            rooms: buildMemoryRooms(snapshot, highlights),
            highlights,
            safety: buildCutoverSafetyReport(snapshot),
            exportManifest: buildMemoryExportManifest(snapshot, options)
        };
    }

    core.memoryBrain.productSemantics = {
        ROOM_DEFS,
        collectHighlights,
        buildMemoryRooms,
        buildCutoverSafetyReport,
        buildMemoryExportManifest,
        buildMemoryPalace
    };
})(OwoApp);
