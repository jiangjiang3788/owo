// --- Memory Brain correction propagation service owner (v0.5.5) ---
// 编排纠错影响传播：预览、应用、回滚；不跑 AI，不写旧记忆，不接正式 prompt。
(function registerCorrectionPropagationService(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;
    function api() { return app.platform.memoryBrain.publicApi; }
    function core() { return app.core.memoryBrain.correctionPropagationSemantics; }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function recordOperation(label, data, level) {
        const trace = app.platform.observability && app.platform.observability.operationTraceService;
        if (trace && typeof trace.recordOperation === 'function') return trace.recordOperation({ source: 'features/memoryBrain/correctionPropagationService', sourceModule: 'features/memoryBrain/correctionPropagationService', label, level: level || 'event', data: data || {} });
        return null;
    }
    function applyCorrectionPropagation(options = {}) {
        recordOperation('纠错影响传播输入', { factIds: options.factIds || '', familyIds: options.familyIds || '', modelIds: options.modelIds || '', formalPromptInjection: false, writesLegacyMemory: false });
        const plan = api().buildCorrectionPropagationPlan(options);
        if (!plan.ok) {
            recordOperation('纠错影响传播计划错误', { status: plan.status, errorMessage: plan.errorMessage }, 'error');
            throw new Error(plan.errorMessage || '纠错影响传播计划失败');
        }
        recordOperation('纠错影响传播计划', { status: plan.status, factCount: plan.impact.factIds.length, familyCount: plan.impact.familyIds.length, edgeCount: plan.impact.edgeIds.length, modelCount: plan.impact.modelIds.length, reviewItemCount: plan.impact.reviewItemIds.length }, 'success');
        const stored = api().applyCorrectionPropagationPlan(plan, options);
        recordOperation('纠错影响传播应用结果', { batchId: stored.batch && stored.batch.id, runId: stored.run && stored.run.id, propagationId: stored.propagation && stored.propagation.id, counts: stored.counts, formalPromptInjection: false }, 'success');
        return stored;
    }
    function rollbackLatestCorrectionPropagationBatch(options = {}) {
        const snapshot = api().getSnapshot(options);
        const batch = asArray(snapshot.batches).find(item => item && item.kind === 'correction-propagation' && item.status === 'applied');
        if (!batch) throw new Error('没有可撤回的纠错影响传播批次');
        const result = api().rollbackCorrectionPropagationBatch(batch.id, options);
        recordOperation('纠错影响传播批次回滚', { batchId: batch.id, result }, 'success');
        return result;
    }
    function getCorrectionPropagationCards(options = {}) {
        const snapshot = api().getCorrectionPropagationSnapshot(options);
        const plan = snapshot.plan || { ok: false, impact: { factIds: [], familyIds: [], edgeIds: [], modelIds: [], reviewItemIds: [], sourceIds: {} } };
        const sourceIds = plan.impact && plan.impact.sourceIds || {};
        const pendingSources = [
            { label: '事实改写', count: asArray(sourceIds.factCorrectionIds).length },
            { label: '冲突处理', count: asArray(sourceIds.conflictResolutionIds).length },
            { label: '家族调整', count: asArray(sourceIds.familyAdjustmentIds).length },
            { label: '模型修正', count: asArray(sourceIds.modelCorrectionIds).length }
        ];
        const impactCards = [
            { label: '事实', count: asArray(plan.impact && plan.impact.factIds).length, ids: asArray(plan.impact && plan.impact.factIds).slice(0, 8) },
            { label: '家族', count: asArray(plan.impact && plan.impact.familyIds).length, ids: asArray(plan.impact && plan.impact.familyIds).slice(0, 8) },
            { label: '关系边', count: asArray(plan.impact && plan.impact.edgeIds).length, ids: asArray(plan.impact && plan.impact.edgeIds).slice(0, 8) },
            { label: '长期模型', count: asArray(plan.impact && plan.impact.modelIds).length, ids: asArray(plan.impact && plan.impact.modelIds).slice(0, 8) },
            { label: '审查项', count: asArray(plan.impact && plan.impact.reviewItemIds).length, ids: asArray(plan.impact && plan.impact.reviewItemIds).slice(0, 8) }
        ];
        const propagations = asArray(snapshot.correctionPropagations).slice(0, 12).map(item => core().compactPropagationForList(item));
        const runs = asArray(snapshot.correctionPropagationRuns).slice(0, 10).map(run => core().compactPropagationRunForList(run));
        const batches = asArray(snapshot.batches).slice(0, 8).map(batch => ({ id: batch.id, status: batch.status, reason: batch.reason, factCount: batch.factCount || 0, familyCount: batch.familyCount || 0, edgeCount: batch.edgeCount || 0, modelCount: batch.modelCount || 0, createdAt: batch.createdAt }));
        return { planStatus: plan.status || (plan.ok ? 'ready' : 'blocked'), planOk: !!plan.ok, planError: plan.errorMessage || '', reason: plan.reason || '', pendingSources, impactCards, propagations, runs, batches, totalText: { sources: String(pendingSources.reduce((sum, item) => sum + item.count, 0)), impacts: String(impactCards.reduce((sum, item) => sum + item.count, 0)), propagations: String(propagations.length), runs: String(runs.length), batches: String(batches.length) }, nextVersion: 'v0.5.6：记忆信任分' };
    }
    function getRoutingReport() { return { owner: 'features/memoryBrain/correctionPropagationService', release: 'v0.5.5', writes: ['memoryBrain downstream propagation fields', 'memoryBrain.correctionPropagations', 'memoryBrain.correctionPropagationRuns', 'memoryBrain.batches(kind=correction-propagation)'], usesAi: false, formalPromptInjection: false, writesLegacyMemory: false }; }
    feature.correctionPropagationService = { applyCorrectionPropagation, rollbackLatestCorrectionPropagationBatch, getCorrectionPropagationCards, recordOperation, getRoutingReport };
})(window);
