// --- Memory Brain trust score service owner (v0.5.6) ---
// 编排记忆信任分：计算、应用、回滚和卡片展示；不跑 AI，不接正式 prompt。
(function registerMemoryTrustScoreService(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;
    function api() { return app.platform.memoryBrain.publicApi; }
    function core() { return app.core.memoryBrain.trustScoreSemantics; }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function recordOperation(label, data, level) {
        const trace = app.platform.observability && app.platform.observability.operationTraceService;
        if (trace && typeof trace.recordOperation === 'function') return trace.recordOperation({ source: 'features/memoryBrain/trustScoreService', sourceModule: 'features/memoryBrain/trustScoreService', label, level: level || 'event', data: data || {} });
        return null;
    }
    function runMemoryTrustScore(options = {}) {
        recordOperation('记忆信任分输入', { options, formalPromptInjection: false, writesLegacyMemory: false });
        const plan = api().buildMemoryTrustScorePlan(options);
        if (!plan.ok) {
            recordOperation('记忆信任分计划错误', { status: plan.status, errorMessage: plan.errorMessage }, 'error');
            throw new Error(plan.errorMessage || '记忆信任分计划失败');
        }
        recordOperation('记忆信任分计划', { total: plan.records.length, averageScore: plan.stats && plan.stats.averageScore, lowCount: plan.stats && plan.stats.lowCount }, 'success');
        const stored = api().applyMemoryTrustScorePlan(plan, options);
        recordOperation('记忆信任分应用结果', { batchId: stored.batch && stored.batch.id, runId: stored.run && stored.run.id, total: stored.records && stored.records.length, averageScore: stored.stats && stored.stats.averageScore, formalPromptInjection: false }, 'success');
        return stored;
    }
    function rollbackLatestTrustScoreBatch(options = {}) {
        const snapshot = api().getSnapshot(options);
        const batch = asArray(snapshot.batches).find(item => item && item.kind === 'memory-trust-score' && item.status === 'applied');
        if (!batch) throw new Error('没有可撤回的记忆信任分批次');
        const result = api().rollbackMemoryTrustScoreBatch(batch.id, options);
        recordOperation('记忆信任分批次回滚', { batchId: batch.id, result }, 'success');
        return result;
    }
    function getTrustScoreCards(options = {}) {
        const snapshot = api().getMemoryTrustScoreSnapshot(options);
        const plan = snapshot.plan || { ok: false, records: [], stats: {} };
        const latestRecords = asArray(snapshot.trustScoreRecords).filter(item => item && item.status !== 'rolled-back').slice(0, 24).map(item => core().compactTrustRecordForList(item));
        const lowRecords = latestRecords.filter(item => Number(item.score) < 62).slice(0, 12);
        const runs = asArray(snapshot.trustScoreRuns).slice(0, 10).map(run => core().compactTrustRunForList(run));
        const batches = asArray(snapshot.batches).slice(0, 8).map(batch => ({ id: batch.id, status: batch.status, totalCount: batch.totalCount || 0, averageScore: batch.averageScore || 0, lowCount: batch.lowCount || 0, createdAt: batch.createdAt }));
        const stats = plan.stats || {};
        const byLevel = stats.byLevel || {};
        const byType = stats.byType || {};
        return {
            planOk: !!plan.ok,
            planStatus: plan.status || '',
            planError: plan.errorMessage || '',
            stats: { total: stats.total || 0, averageScore: stats.averageScore || 0, lowCount: stats.lowCount || 0, byLevel, byType },
            levelCards: ['high', 'medium', 'low', 'critical'].map(level => ({ level, count: byLevel[level] || 0 })),
            typeCards: ['fact', 'family', 'edge', 'model'].map(type => ({ type, count: byType[type] || 0 })),
            latestRecords, lowRecords, runs, batches,
            totalText: { records: String(latestRecords.length), low: String(lowRecords.length), runs: String(runs.length), batches: String(batches.length) },
            nextVersion: 'v0.5.7：可信记忆 gate'
        };
    }
    function getRoutingReport() { return { owner: 'features/memoryBrain/trustScoreService', release: 'v0.5.6', writes: ['trust score fields', 'memoryBrain.trustScoreRecords', 'memoryBrain.trustScoreRuns', 'memoryBrain.batches(kind=memory-trust-score)'], usesAi: false, formalPromptInjection: false, writesLegacyMemory: false }; }
    feature.trustScoreService = { runMemoryTrustScore, rollbackLatestTrustScoreBatch, getTrustScoreCards, recordOperation, getRoutingReport };
})(window);
