// --- Memory Brain model owner (v0.4.2) ---
// 只把 store/core 状态整理为展示模型，不访问 DOM。
(function registerMemoryBrainModel(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;

    function getCorePublic() { return app.core.memoryBrain.publicApi; }
    function formatNumber(value) { return (Number(value) || 0).toLocaleString('zh-CN'); }
    function asArray(value) { return Array.isArray(value) ? value : []; }

    function buildLayerCards(snapshot) {
        const layers = getCorePublic().getLayers();
        const counts = {
            raw: snapshot.lastLegacyScan ? snapshot.lastLegacyScan.totals.messages : 0,
            archive: asArray(snapshot.archiveSources).length + asArray(snapshot.archiveChunks).length + asArray(snapshot.backfillJobs).length,
            event: asArray(snapshot.events).length,
            fact: asArray(snapshot.facts).filter(fact => fact && fact.status !== 'retired').length,
            family: asArray(snapshot.families).filter(family => family && family.status !== 'retired').length,
            graph: asArray(snapshot.edges).length,
            model: asArray(snapshot.models).length,
            injection: asArray(snapshot.injectionPreviews).filter(preview => preview && preview.status !== 'retired').length,
            scheduler: asArray(snapshot.schedulerRuns).length + asArray(snapshot.scheduleQueue).filter(item => item && item.status !== 'retired').length,
            product: asArray(snapshot.exports).filter(item => item && item.status !== 'retired').length
        };
        return layers.map(layer => ({ id: layer.id, name: layer.name, goal: layer.goal, status: layer.status, count: counts[layer.id] || 0, countText: formatNumber(counts[layer.id] || 0) }));
    }

    function buildReplacementCards(plan) {
        return plan.map((stage, index) => ({ index: index + 1, id: stage.id, name: stage.name, targetVersion: stage.targetVersion, goal: stage.goal, oldSystemMode: stage.oldSystemMode, brainMode: stage.brainMode }));
    }

    function buildPlanCards() {
        return [
            { version: 'v0.3.0', title: '架构骨架', result: 'memoryBrain 独立 namespace、store、App 壳和旧来源扫描。', status: 'done' },
            { version: 'v0.3.1', title: '事件时间线', result: '最近聊天整理为事件卡片，保留来源消息范围。', status: 'done' },
            { version: 'v0.3.2', title: '原子事实层', result: '事件拆成可追溯、可回滚、可多归属的事实候选。', status: 'done' },
            { version: 'v0.3.3', title: '记忆家族', result: '事实通过向量/关键词自动成团，家族由 AI 命名和摘要。', status: 'done' },
            { version: 'v0.3.4', title: 'Graph 关系', result: '事实连接人物、主题、目的、情绪、项目和多个家族。', status: 'done' },
            { version: 'v0.3.5', title: '长期模型', result: '用户画像、AI 自我、世界观、项目脑开始有版本历史。', status: 'done' },
            { version: 'v0.3.6', title: '注入预览', result: '生成影子注入包并和旧系统对照，仍不替换正式 prompt。', status: 'done' },
            { version: 'v0.3.7', title: '调度生命机制', result: '省钱/均衡/深度成本档，整理队列，浮现/衰减维护和回滚。', status: 'done' },
            { version: 'v0.3.8', title: '产品化收口', result: '记忆小屋 UI、今日浮现、安全门、导出包和稳定 gate。', status: 'done' },
            { version: 'v0.3.9', title: 'AI Pipeline', result: '统一 AI provider、task routing、response batch 和控制台分类。', status: 'done' },
            { version: 'v0.3.10', title: '旧记忆 owner 守门', result: 'v0.9 前 Memory Brain 只读，正式注入仍由当前档案记忆等旧 owner 执行。', status: 'done' },
            { version: 'v0.4.0', title: '历史源扫描器', result: '扫描全部聊天来源、消息总量、时间范围和预计切片数，先盘点整个过去。', status: 'done' },
            { version: 'v0.4.1', title: '历史切片 / 游标', result: '把几万条消息切成可续跑、可重试、带 overlap 的 archive chunks。', status: 'done' },
            { version: 'v0.4.2', title: '回填队列 / 断点续跑', result: '建立 backfillJobs / runs，支持暂停、继续、失败重试和成本档。', status: 'active' },
            { version: 'v0.4.3', title: '历史事件回填', result: '从 archiveChunks 批量生成历史事件，保留来源消息范围。', status: 'planned' }
        ];
    }

    function compactEvents(snapshot) {
        const api = getCorePublic();
        return asArray(snapshot.events).slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, 24)
            .map(event => api && typeof api.compactEventForTimeline === 'function' ? api.compactEventForTimeline(event) : event);
    }
    function compactFacts(snapshot) {
        const api = getCorePublic();
        return asArray(snapshot.facts).filter(fact => fact && fact.status !== 'retired').sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, 36)
            .map(fact => api && typeof api.compactFactForList === 'function' ? api.compactFactForList(fact) : fact);
    }
    function compactFamilies(snapshot) {
        const api = getCorePublic();
        const facts = asArray(snapshot.facts).filter(fact => fact && fact.status !== 'retired');
        return asArray(snapshot.families).filter(family => family && family.status !== 'retired')
            .sort((a, b) => asArray(b.factIds).length - asArray(a.factIds).length || String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
            .slice(0, 24).map(family => api && typeof api.compactFamilyForList === 'function' ? api.compactFamilyForList(family, facts) : family);
    }
    function countBatches(snapshot, kind) { return asArray(snapshot.batches).filter(batch => batch && batch.kind === kind).length; }

    function compactInjectionPreviews(snapshot) {
        const api = getCorePublic();
        return asArray(snapshot.injectionPreviews).filter(preview => preview && preview.status !== 'retired')
            .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
            .slice(0, 10).map(preview => api && typeof api.compactInjectionPreviewForList === 'function' ? api.compactInjectionPreviewForList(preview) : preview);
    }

    function compactModels(snapshot) {
        const api = getCorePublic();
        return asArray(snapshot.models).filter(model => model && model.status === 'active')
            .sort((a, b) => (a.type || '').localeCompare(b.type || '') || (Number(b.version) || 0) - (Number(a.version) || 0))
            .slice(0, 12).map(model => api && typeof api.compactModelForList === 'function' ? api.compactModelForList(model) : model);
    }

    function compactGraph(snapshot) {
        const api = getCorePublic();
        return api && typeof api.compactGraphForList === 'function'
            ? api.compactGraphForList(asArray(snapshot.edges), asArray(snapshot.facts), asArray(snapshot.families), { edgeLimit: 36, nodeLimit: 18 })
            : { relationCards: [], nodeCards: [], edgeCount: 0, activeEdgeCount: 0 };
    }

    function compactScheduler(snapshot) {
        const api = getCorePublic();
        const settings = snapshot.settings && snapshot.settings.scheduler || { costProfileId: snapshot.settings && snapshot.settings.costProfileId || 'balanced' };
        const plan = api && typeof api.buildMaintenancePlan === 'function' ? api.buildMaintenancePlan(snapshot, { profileId: settings.costProfileId || 'balanced' }) : null;
        return api && typeof api.compactSchedulerForList === 'function'
            ? api.compactSchedulerForList(settings, plan, asArray(snapshot.schedulerRuns), asArray(snapshot.scheduleQueue))
            : { settings, costProfiles: [], queueItems: [], runs: [], floating: [] };
    }

    function compactPalace(snapshot) {
        const api = getCorePublic();
        return api && typeof api.buildMemoryPalace === 'function' ? api.buildMemoryPalace(snapshot, { highlightLimit: 9 }) : { rooms: [], highlights: [], safety: null };
    }
    function compactExports(snapshot) {
        return asArray(snapshot.exports).filter(item => item && item.status !== 'retired')
            .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
            .slice(0, 8).map(item => ({ id: item.id, createdAt: item.createdAt, mode: item.mode, counts: item.counts || {}, storedData: item.storedData || 'manifest-only', safetySummary: item.manifest && item.manifest.safetySummary || '' }));
    }

    function buildDashboard(snapshot, legacyScan, replacementPlan, archiveCards, chunkCards, backfillCards) {
        const settings = snapshot.settings || {};
        const scan = legacyScan || snapshot.lastLegacyScan || null;
        const activeFacts = asArray(snapshot.facts).filter(fact => fact && fact.status !== 'retired');
        const activeFamilies = asArray(snapshot.families).filter(family => family && family.status !== 'retired');
        return {
            release: snapshot.release || 'v0.4.2',
            mode: settings.mode || 'shadow',
            currentStageId: settings.currentStageId || 'history-backfill',
            thresholdText: Math.round((settings.familySimilarityThreshold || 0.7) * 100) + '%',
            familySummaryMinFacts: settings.familySummaryMinFacts || 5,
            processingMode: settings.processingMode || 'balanced',
            legacyBridgeMode: settings.legacyBridgeMode || 'read-only-source',
            eventCount: asArray(snapshot.events).length,
            factCount: activeFacts.length,
            familyCount: activeFamilies.length,
            edgeCount: asArray(snapshot.edges).filter(edge => edge && edge.status !== 'retired').length,
            modelCount: asArray(snapshot.models).filter(model => model && model.status === 'active').length,
            injectionPreviewCount: asArray(snapshot.injectionPreviews).filter(preview => preview && preview.status !== 'retired').length,
            scheduleQueueCount: asArray(snapshot.scheduleQueue).filter(item => item && item.status !== 'retired').length,
            schedulerRunCount: asArray(snapshot.schedulerRuns).length,
            exportCount: asArray(snapshot.exports).filter(item => item && item.status !== 'retired').length,
            archiveSourceCount: asArray(snapshot.archiveSources).length,
            archiveRunCount: asArray(snapshot.archiveScanRuns).length,
            archiveChunkCount: asArray(snapshot.archiveChunks).filter(chunk => chunk && chunk.status !== 'retired').length,
            archiveCursorCount: asArray(snapshot.archiveCursors).length,
            archiveChunkRunCount: asArray(snapshot.archiveChunkRuns).length,
            backfillJobCount: asArray(snapshot.backfillJobs).filter(job => job && job.status !== 'retired').length,
            backfillRunCount: asArray(snapshot.backfillRuns).length,
            batchCount: asArray(snapshot.batches).length,
            factBatchCount: countBatches(snapshot, 'fact-extraction'),
            familyBatchCount: countBatches(snapshot, 'family-clustering'),
            graphBatchCount: countBatches(snapshot, 'graph-linking'),
            modelBatchCount: countBatches(snapshot, 'long-term-model'),
            injectionBatchCount: countBatches(snapshot, 'injection-preview'),
            maintenanceBatchCount: countBatches(snapshot, 'memory-maintenance'),
            exportBatchCount: countBatches(snapshot, 'memory-export-preview'),
            archiveBatchCount: countBatches(snapshot, 'history-archive-scan'),
            archiveChunkBatchCount: countBatches(snapshot, 'history-archive-chunking'),
            backfillBatchCount: countBatches(snapshot, 'history-backfill-queue'),
            palaceCards: compactPalace(snapshot),
            exportCards: compactExports(snapshot),
            archiveCards: archiveCards || { totalText: {}, sources: [], runs: [] },
            chunkCards: chunkCards || { totalText: {}, cursors: [], chunks: [], runs: [] },
            backfillCards: backfillCards || { totalText: {}, jobs: [], runs: [] },
            timelineEvents: compactEvents(snapshot),
            factCards: compactFacts(snapshot),
            familyCards: compactFamilies(snapshot),
            graphCards: compactGraph(snapshot),
            modelCards: compactModels(snapshot),
            injectionPreviewCards: compactInjectionPreviews(snapshot),
            schedulerCards: compactScheduler(snapshot),
            planCards: buildPlanCards(),
            layerCards: buildLayerCards(snapshot),
            replacementCards: buildReplacementCards(replacementPlan),
            legacyScan: scan,
            totals: scan ? scan.totals : { messages: 0, journals: 0, vectorEntries: 0, tableCells: 0 }
        };
    }

    feature.model = { buildDashboard, buildLayerCards, buildReplacementCards, buildPlanCards, compactEvents, compactFacts, compactFamilies, compactGraph, compactModels, compactInjectionPreviews, compactScheduler, compactPalace, compactExports, formatNumber };
})(window);
