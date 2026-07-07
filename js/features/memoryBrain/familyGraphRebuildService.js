// --- Memory Brain full family / graph rebuild service owner (v0.4.6) ---
// 编排 active facts → 全量 family → 全量 graph；不写旧记忆，不接正式 prompt。
(function registerMemoryBrainFamilyGraphRebuildService(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;

    function asArray(value) { return Array.isArray(value) ? value : []; }
    function getPlatformApi() { return app.platform.memoryBrain.publicApi; }
    function record(label, data, level) {
        if (feature.service && typeof feature.service.recordOperation === 'function') return feature.service.recordOperation(label, data || {}, level || 'event');
        return null;
    }
    function isEligibleFact(fact) {
        if (!fact || fact.status === 'retired') return false;
        const status = String(fact.lifecycleStatus || fact.status || 'active');
        return !['duplicate', 'obsolete', 'disputed', 'merged', 'retired'].includes(status);
    }
    function buildInput(snapshot, options) {
        const activeFacts = asArray(snapshot.facts).filter(fact => fact && fact.status !== 'retired');
        const eligibleFacts = activeFacts.filter(isEligibleFact);
        return {
            activeFactCount: activeFacts.length,
            eligibleFactCount: eligibleFacts.length,
            excludedFactCount: activeFacts.length - eligibleFacts.length,
            existingFamilyCount: asArray(snapshot.families).filter(family => family && family.status !== 'retired').length,
            existingEdgeCount: asArray(snapshot.edges).filter(edge => edge && edge.status !== 'retired').length,
            familyMinFacts: Number(options.familyMinFacts) || 2,
            maxFamilies: Number(options.maxFamilies) || 16,
            maxEdges: Number(options.maxEdges) || 180,
            formalPromptInjection: false,
            writesLegacyMemory: false
        };
    }
    async function rebuildFamilyGraph(options = {}) {
        const platformApi = getPlatformApi();
        const state = (options && options.state) || global.db || {};
        const snapshot = platformApi.getSnapshot({ state });
        const eligibleFacts = asArray(snapshot.facts).filter(isEligibleFact);
        const eligibleFactIds = eligibleFacts.map(fact => fact.id).filter(Boolean);
        const input = buildInput(snapshot, options);
        if (!input.eligibleFactCount) throw new Error('没有可用于全量重建的 active facts。请先完成历史事实回填，并清理 duplicate / obsolete / disputed。');
        record('记忆脑全量家族 graph 重建输入', input, 'event');
        const reset = platformApi.resetFamilyGraphForRebuild({ state, reason: 'v0.4.6-full-rebuild' });
        const diagnostics = [];
        let familyResult = null;
        let graphResult = null;
        try {
            familyResult = await feature.familyService.organizeFamilies({ state, rebuild: true, excludeLifecycle: true, eligibleFactIds, allowSingleSeed: options.allowSingleSeed !== false, minNewFacts: Number(options.familyMinFacts) || 2, maxFamilies: Number(options.maxFamilies) || 16, embeddingLimit: Number(options.embeddingLimit) || 80 });
            graphResult = await feature.graphService.buildGraph({ state, rebuild: true, excludeLifecycle: true, eligibleFactIds, maxEdges: Number(options.maxEdges) || 180 });
            const stored = platformApi.appendFamilyGraphRebuildBatch({
                resetBatchId: reset.batch && reset.batch.id,
                familyBatchId: familyResult.batch && familyResult.batch.id,
                graphBatchId: graphResult.batch && graphResult.batch.id,
                familyIds: asArray(familyResult.families).map(family => family.id),
                edgeIds: asArray(graphResult.edges).map(edge => edge.id),
                factSummary: reset.factSummary,
                diagnostics
            }, { state });
            record('记忆脑全量家族 graph 重建应用结果', { batchId: stored.batch && stored.batch.id, resetBatchId: reset.batch && reset.batch.id, familyCount: asArray(familyResult.families).length, edgeCount: asArray(graphResult.edges).length, diagnostics }, 'success');
            return Object.assign({ reset, familyResult, graphResult, diagnostics }, stored);
        } catch (error) {
            diagnostics.push(error.message || 'family_graph_rebuild_failed');
            const stored = platformApi.appendFamilyGraphRebuildBatch({ resetBatchId: reset.batch && reset.batch.id, familyBatchId: familyResult && familyResult.batch && familyResult.batch.id || '', graphBatchId: graphResult && graphResult.batch && graphResult.batch.id || '', factSummary: reset.factSummary, diagnostics, errorMessage: error.message || '重建失败' }, { state });
            record('记忆脑全量家族 graph 重建错误', { message: error.message, diagnostics }, 'error');
            throw error;
        }
    }
    function rollbackLatestFamilyGraphRebuildBatch(options = {}) {
        const platformApi = getPlatformApi();
        const snapshot = platformApi.getSnapshot(options);
        const batch = asArray(snapshot.batches).find(item => item && item.kind === 'family-graph-rebuild' && item.status === 'applied');
        if (!batch) throw new Error('没有可撤回的全量家族 / graph 重建批次。');
        const graph = batch.graphBatchId ? platformApi.rollbackGraphBatch(batch.graphBatchId, options) : { ok: true, skipped: true };
        const family = batch.familyBatchId ? platformApi.rollbackFamilyBatch(batch.familyBatchId, options) : { ok: true, skipped: true };
        const reset = batch.resetBatchId ? platformApi.rollbackRebuildResetBatch(batch.resetBatchId, options) : { ok: true, skipped: true };
        const meta = platformApi.rollbackFamilyGraphRebuildBatch ? platformApi.rollbackFamilyGraphRebuildBatch(batch.id, { state: (options && options.state) || global.db || {}, graph, family, reset }) : { ok: true, skipped: true };
        record('记忆脑全量家族 graph 批次回滚', { batchId: batch.id, graph, family, reset, meta }, graph.ok && family.ok && reset.ok && meta.ok ? 'success' : 'error');
        return { ok: graph.ok && family.ok && reset.ok && meta.ok, batchId: batch.id, graph, family, reset, meta };
    }
    function getFamilyGraphRebuildCards(options = {}) {
        const snapshot = getPlatformApi().getFamilyGraphRebuildSnapshot(options);
        const runs = asArray(snapshot.runs).slice(0, 8).map(run => ({ id: run.id, status: run.status, createdAt: run.createdAt, familyBatchId: run.familyBatchId || '', graphBatchId: run.graphBatchId || '', resetBatchId: run.resetBatchId || '', factSummary: run.factSummary || {}, diagnostics: run.diagnostics || [] }));
        return { totalText: snapshot.factSummary || {}, runs, batches: asArray(snapshot.batches).slice(0, 8).map(batch => ({ id: batch.id, kind: batch.kind, status: batch.status, createdAt: batch.createdAt, familyIds: batch.familyIds || [], edgeIds: batch.edgeIds || [], factSummary: batch.factSummary || {} })) };
    }
    feature.familyGraphRebuildService = { rebuildFamilyGraph, rollbackLatestFamilyGraphRebuildBatch, getFamilyGraphRebuildCards };
})(window);
