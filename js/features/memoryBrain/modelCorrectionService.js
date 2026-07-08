// --- Memory Brain model correction service owner (v0.5.4) ---
// 编排长期模型人工修正、版本记录和回滚；不跑 AI，不写旧记忆，不接正式 prompt。
(function registerModelCorrectionService(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;
    function api() { return app.platform.memoryBrain.publicApi; }
    function core() { return app.core.memoryBrain.modelCorrectionSemantics; }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function recordOperation(label, data, level) {
        const trace = app.platform.observability && app.platform.observability.operationTraceService;
        if (trace && typeof trace.recordOperation === 'function') return trace.recordOperation({ source: 'features/memoryBrain/modelCorrectionService', sourceModule: 'features/memoryBrain/modelCorrectionService', label, level: level || 'event', data: data || {} });
        return null;
    }
    function correctModel(options = {}) {
        recordOperation('长期模型修正输入', { modelId: options.modelId || '', reviewItemId: options.reviewItemId || '', formalPromptInjection: false, writesLegacyMemory: false });
        const plan = api().buildModelCorrectionPlan(options);
        if (!plan.ok) {
            recordOperation('长期模型修正计划错误', { errorMessage: plan.errorMessage, status: plan.status }, 'error');
            throw new Error(plan.errorMessage || '长期模型修正计划失败');
        }
        recordOperation('长期模型修正计划', { modelId: plan.modelId, modelType: plan.modelType, reviewItemId: plan.reviewItemId, changedFields: plan.changedFields, version: plan.version, status: plan.status }, 'success');
        const stored = api().applyModelCorrectionPlan(plan, options);
        recordOperation('长期模型修正应用结果', { batchId: stored.batch && stored.batch.id, runId: stored.run && stored.run.id, correctionId: stored.correction && stored.correction.id, modelId: stored.correction && stored.correction.modelId, newModelId: stored.correction && stored.correction.newModelId, changedFields: plan.changedFields, formalPromptInjection: false }, 'success');
        return stored;
    }
    function rollbackLatestModelCorrectionBatch(options = {}) {
        const snapshot = api().getSnapshot(options);
        const batch = asArray(snapshot.batches).find(item => item && item.kind === 'model-correction' && item.status === 'applied');
        if (!batch) throw new Error('没有可撤回的长期模型修正批次');
        const result = api().rollbackModelCorrectionBatch(batch.id, options);
        recordOperation('长期模型修正批次回滚', { batchId: batch.id, result }, 'success');
        return result;
    }
    function activeModels(snapshot) { return asArray(snapshot.models).filter(model => model && model.status === 'active'); }
    function getModelCorrectionCards(options = {}) {
        const snapshot = api().getModelCorrectionSnapshot(options);
        const needsEditItems = asArray(snapshot.reviewInboxItems).filter(item => item && item.targetType === 'model' && item.status === 'needs-edit').slice(0, 24);
        const modelById = new Map(asArray(snapshot.models).map(model => [model && model.id, model]).filter(pair => pair[0]));
        const candidates = needsEditItems.map(item => {
            const model = modelById.get(item.targetId) || {};
            const compact = core().compactModelOption(model);
            return Object.assign({}, compact, { reviewItemId: item.id, modelId: item.targetId, issueType: item.issueType, severity: item.severity, reason: item.reason, itemTitle: item.title });
        });
        const modelOptions = activeModels(snapshot).map(model => core().compactModelOption(model)).slice(0, 18);
        const corrections = asArray(snapshot.modelCorrections).slice(0, 12).map(item => core().compactModelCorrectionForList(item));
        const runs = asArray(snapshot.modelCorrectionRuns).slice(0, 10).map(run => core().compactModelCorrectionRunForList(run));
        const batches = asArray(snapshot.batches).slice(0, 8).map(batch => ({ id: batch.id, status: batch.status, modelId: batch.modelId, newModelId: batch.newModelId, reviewItemId: batch.reviewItemId, version: batch.version, changedFields: batch.changedFields || [], createdAt: batch.createdAt }));
        return { candidates, modelOptions, corrections, runs, batches, totalText: { candidates: String(candidates.length), models: String(modelOptions.length), corrections: String(corrections.length), runs: String(runs.length), batches: String(batches.length) }, nextVersion: 'v0.5.5：纠错影响传播' };
    }
    function getRoutingReport() { return { owner: 'features/memoryBrain/modelCorrectionService', release: 'v0.5.4', writes: ['memoryBrain.models versioned correction', 'memoryBrain.modelCorrections', 'memoryBrain.modelCorrectionRuns', 'memoryBrain.batches(kind=model-correction)'], usesAi: false, formalPromptInjection: false, writesLegacyMemory: false }; }
    feature.modelCorrectionService = { correctModel, rollbackLatestModelCorrectionBatch, getModelCorrectionCards, recordOperation, getRoutingReport };
})(window);
