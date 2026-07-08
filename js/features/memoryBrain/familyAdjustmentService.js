// --- Memory Brain family adjustment service owner (v0.5.3) ---
// 编排家族合并 / 拆分 / 改名；不请求 AI、不接正式 prompt、不写旧记忆。
(function registerMemoryBrainFamilyAdjustmentService(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;
    function platformApi() { return app.platform.memoryBrain.publicApi; }
    function coreApi() { return app.core.memoryBrain.publicApi; }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function recordOperation(label, data, level) {
        const service = app.platform.observability && app.platform.observability.operationTraceService;
        if (service && typeof service.recordOperation === 'function') {
            return service.recordOperation({ source: 'features/memoryBrain', sourceModule: 'features/memoryBrain/familyAdjustmentService', label, level: level || 'event', data: data || {} });
        }
        return null;
    }
    function adjustFamily(options = {}) {
        recordOperation('记忆家族调整输入', Object.assign({}, options, { formalPromptInjection: false, writesLegacyMemory: false }));
        const plan = platformApi().buildFamilyAdjustmentPlan(options);
        if (!plan || !plan.ok) {
            recordOperation('记忆家族调整计划错误', { status: plan && plan.status, errorMessage: plan && plan.errorMessage }, 'error');
            throw new Error(plan && plan.errorMessage || '家族调整计划失败');
        }
        recordOperation('记忆家族调整计划', { action: plan.action, familyIds: plan.familyIds, factIds: plan.factIds || plan.splitFactIds || [], reason: plan.reason, formalPromptInjection: false }, 'success');
        const result = platformApi().applyFamilyAdjustmentPlan(plan, options);
        recordOperation('记忆家族调整应用结果', { batchId: result.batch && result.batch.id, action: result.adjustment && result.adjustment.action, familyCount: result.familyCount, factCount: result.factCount, formalPromptInjection: false }, 'success');
        return result;
    }
    function rollbackLatestFamilyAdjustmentBatch(options = {}) {
        const snapshot = platformApi().getFamilyAdjustmentSnapshot(options);
        const batch = asArray(snapshot.batches).find(item => item && item.status === 'applied');
        if (!batch) throw new Error('没有可撤回的家族调整批次');
        const result = platformApi().rollbackFamilyAdjustmentBatch(batch.id, options);
        recordOperation('记忆家族调整批次回滚', { batchId: batch.id, result }, 'success');
        return result;
    }
    function getFamilyAdjustmentCards(options = {}) {
        const snapshot = platformApi().getFamilyAdjustmentSnapshot(options);
        return {
            candidates: asArray(snapshot.candidates).slice(0, 12).map(item => coreApi().compactFamilyAdjustmentCandidateForList(item)),
            adjustments: asArray(snapshot.familyAdjustments).slice(0, 12).map(item => coreApi().compactFamilyAdjustmentForList(item)),
            runs: asArray(snapshot.familyAdjustmentRuns).slice(0, 10).map(item => coreApi().compactFamilyAdjustmentRunForList(item)),
            batches: asArray(snapshot.batches).slice(0, 8).map(batch => ({ id: batch.id, status: batch.status, action: batch.action, familyIds: batch.familyIds || [], factIds: batch.factIds || [], newFamilyId: batch.newFamilyId || '', createdAt: batch.createdAt })),
            familyOptions: asArray(snapshot.families).slice(0, 80).map(family => ({ id: family.id, title: family.title || family.name || family.id, factCount: asArray(family.factIds).length })),
            totalText: { candidates: String(asArray(snapshot.candidates).length), adjustments: String(asArray(snapshot.familyAdjustments).filter(item => item && item.status !== 'rolled-back').length), runs: String(asArray(snapshot.familyAdjustmentRuns).length), batches: String(asArray(snapshot.batches).length) },
            nextVersion: 'v0.5.4：长期模型人工修正'
        };
    }
    function getRoutingReport() { return { owner: 'features/memoryBrain/familyAdjustmentService', release: 'v0.5.3', writes: ['memoryBrain.families', 'fact.familyIds', 'memoryBrain.familyAdjustments', 'memoryBrain.familyAdjustmentRuns', 'memoryBrain.batches(kind=family-adjustment)'], usesAi: false, formalPromptInjection: false, writesLegacyMemory: false }; }
    feature.familyAdjustmentService = { adjustFamily, rollbackLatestFamilyAdjustmentBatch, getFamilyAdjustmentCards, recordOperation, getRoutingReport };
})(window);
