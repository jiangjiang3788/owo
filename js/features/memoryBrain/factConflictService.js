// --- Memory Brain fact conflict service owner (v0.5.2) ---
// 编排冲突事实处理、运行记录和回滚；不跑 AI，不写旧记忆，不接正式 prompt。
(function registerFactConflictService(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;
    function api() { return app.platform.memoryBrain.publicApi; }
    function core() { return app.core.memoryBrain.conflictResolutionSemantics; }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function recordOperation(label, data, level) {
        const trace = app.platform.observability && app.platform.observability.operationTraceService;
        if (trace && typeof trace.recordOperation === 'function') return trace.recordOperation({ source: 'features/memoryBrain/factConflictService', sourceModule: 'features/memoryBrain/factConflictService', label, level: level || 'event', data: data || {} });
        return null;
    }
    function resolveFactConflict(options = {}) {
        recordOperation('冲突事实处理输入', { conflictId: options.conflictId || '', action: options.action || '', preferredFactId: options.preferredFactId || '', formalPromptInjection: false, writesLegacyMemory: false });
        const plan = api().buildConflictResolutionPlan(options);
        if (!plan.ok) {
            recordOperation('冲突事实处理计划错误', { status: plan.status, errorMessage: plan.errorMessage }, 'error');
            throw new Error(plan.errorMessage || '冲突处理计划失败');
        }
        recordOperation('冲突事实处理计划', { conflictId: plan.conflictId, action: plan.action, factIds: plan.factIds, updates: plan.updates }, 'success');
        const stored = api().applyConflictResolutionPlan(plan, options);
        recordOperation('冲突事实处理应用结果', { batchId: stored.batch && stored.batch.id, runId: stored.run && stored.run.id, resolutionId: stored.resolution && stored.resolution.id, conflictId: plan.conflictId, action: plan.action, factCount: stored.factCount, formalPromptInjection: false }, 'success');
        return stored;
    }
    function rollbackLatestConflictResolutionBatch(options = {}) {
        const snapshot = api().getSnapshot(options);
        const batch = asArray(snapshot.batches).find(item => item && item.kind === 'fact-conflict-resolution' && item.status === 'applied');
        if (!batch) throw new Error('没有可撤回的冲突处理批次');
        const result = api().rollbackConflictResolutionBatch(batch.id, options);
        recordOperation('冲突事实处理批次回滚', { batchId: batch.id, result }, 'success');
        return result;
    }
    function getFactConflictCards(options = {}) {
        const snapshot = api().getFactConflictSnapshot(options);
        const groups = asArray(snapshot.conflictGroups).slice(0, 24);
        const resolutions = asArray(snapshot.factConflictResolutions).slice(0, 12).map(item => core().compactConflictResolutionForList(item));
        const runs = asArray(snapshot.factConflictRuns).slice(0, 10).map(item => core().compactConflictRunForList(item));
        const batches = asArray(snapshot.batches).slice(0, 8).map(batch => ({ id: batch.id, status: batch.status, conflictId: batch.conflictId, action: batch.action, factIds: batch.factIds || [], createdAt: batch.createdAt }));
        return { groups, resolutions, runs, batches, totalText: { groups: String(groups.length), resolutions: String(resolutions.length), runs: String(runs.length), batches: String(batches.length) }, nextVersion: 'v0.5.3：家族合并 / 拆分' };
    }
    function getRoutingReport() { return { owner: 'features/memoryBrain/factConflictService', release: 'v0.5.2', writes: ['memoryBrain.facts conflict resolution fields', 'memoryBrain.conflicts status', 'memoryBrain.factConflictResolutions', 'memoryBrain.factConflictRuns', 'memoryBrain.batches(kind=fact-conflict-resolution)'], usesAi: false, formalPromptInjection: false, writesLegacyMemory: false }; }
    feature.factConflictService = { resolveFactConflict, rollbackLatestConflictResolutionBatch, getFactConflictCards, recordOperation, getRoutingReport };
})(window);
