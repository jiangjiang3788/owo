// --- Memory Brain fact lifecycle service owner (v0.4.5) ---
// 编排事实去重 / 冲突 / 过时标记；不跑 AI，不改旧记忆，不接正式 prompt。
(function registerFactLifecycleService(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;

    function getPlatformApi() { return app.platform.memoryBrain.publicApi; }
    function getCoreApi() { return app.core && app.core.memoryBrain && app.core.memoryBrain.publicApi; }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function formatNumber(value) { return (Number(value) || 0).toLocaleString('zh-CN'); }
    function recordOperation(label, data, level) {
        const trace = app.platform.observability && app.platform.observability.operationTraceService;
        if (trace && typeof trace.recordOperation === 'function') return trace.recordOperation({ source: 'features/memoryBrain', sourceModule: 'features/memoryBrain/factLifecycleService', label, level: level || 'event', data: data || {} });
        return null;
    }
    function runFactLifecycleReview(options = {}) {
        recordOperation('事实生命周期整理输入', { duplicateThreshold: options.duplicateThreshold || 0.9, formalPromptInjection: false, writesLegacyMemory: false });
        const plan = getPlatformApi().buildFactLifecyclePlan({ duplicateThreshold: options.duplicateThreshold || 0.9, state: options.state });
        recordOperation('事实生命周期整理计划', { inputCount: plan.inputCount, updateCount: plan.updateCount, summary: plan.summary, duplicateGroups: asArray(plan.duplicateGroups).length, conflictPairs: asArray(plan.conflictPairs).length, obsoletePairs: asArray(plan.obsoletePairs).length }, plan.updateCount ? 'success' : 'event');
        const stored = getPlatformApi().applyFactLifecyclePlan(plan, { state: options.state });
        recordOperation('事实生命周期应用结果', { runId: stored.run && stored.run.id, batchId: stored.batch && stored.batch.id, updateCount: asArray(stored.updates).length, duplicateCount: stored.run && stored.run.duplicateCount, obsoleteCount: stored.run && stored.run.obsoleteCount, disputedCount: stored.run && stored.run.disputedCount }, 'success');
        return stored;
    }
    function rollbackLatestFactLifecycleBatch(options = {}) {
        const snapshot = getPlatformApi().getSnapshot(options);
        const batch = asArray(snapshot.batches).find(item => item && item.kind === 'fact-lifecycle' && item.status === 'applied');
        if (!batch) throw new Error('没有可撤回的事实生命周期批次');
        const result = getPlatformApi().rollbackFactLifecycleBatch(batch.id, options);
        recordOperation('事实生命周期批次回滚', { batchId: batch.id, restoredFacts: result.restoredFacts || 0 });
        return result;
    }
    function getFactLifecycleCards(options = {}) {
        const snapshot = getPlatformApi().getSnapshot(options);
        const lifecycle = getPlatformApi().getFactLifecycleSnapshot(options);
        const core = getCoreApi();
        const factsById = new Map(asArray(snapshot.facts).map(fact => [fact && fact.id, fact]));
        const runs = asArray(lifecycle.factLifecycleRuns).slice(0, 12).map(run => core.compactFactLifecycleRunForList(run));
        const batches = asArray(lifecycle.batches).slice(0, 8).map(batch => ({ id: batch.id, status: batch.status, createdAt: batch.createdAt, factCount: asArray(batch.factIds).length, duplicateCount: asArray(batch.duplicateGroups).length, conflictCount: asArray(batch.conflictPairs).length, obsoleteCount: asArray(batch.obsoletePairs).length }));
        const facts = asArray(snapshot.facts);
        const counts = facts.reduce((acc, fact) => {
            const status = fact && fact.status || 'active';
            if (status === 'duplicate') acc.duplicate += 1;
            else if (status === 'obsolete') acc.obsolete += 1;
            else if (status === 'disputed') acc.disputed += 1;
            else if (status !== 'retired') acc.active += 1;
            return acc;
        }, { active: 0, duplicate: 0, obsolete: 0, disputed: 0 });
        const issues = [];
        asArray(lifecycle.factMerges).slice(0, 8).forEach(item => issues.push(core.compactFactLifecycleIssueForList(Object.assign({ type: 'duplicate', factId: item.primaryFactId }, item), factsById)));
        asArray(lifecycle.conflicts).slice(0, 8).forEach(item => issues.push(core.compactFactLifecycleIssueForList(Object.assign({ type: 'disputed' }, item), factsById)));
        asArray(lifecycle.obsoleteFacts).slice(0, 8).forEach(item => issues.push(core.compactFactLifecycleIssueForList(Object.assign({ type: 'obsolete' }, item), factsById)));
        return {
            totalText: { runs: formatNumber(runs.length), active: formatNumber(counts.active), duplicate: formatNumber(counts.duplicate), obsolete: formatNumber(counts.obsolete), disputed: formatNumber(counts.disputed), batches: formatNumber(batches.length) },
            counts,
            runs,
            batches,
            issues,
            nextVersion: 'v0.4.6：全量家族 / graph 重建'
        };
    }
    function getRoutingReport() { return { owner: 'features/memoryBrain/factLifecycleService', release: 'v0.4.5', writes: ['memoryBrain.facts lifecycle fields', 'memoryBrain.factMerges', 'memoryBrain.conflicts', 'memoryBrain.obsoleteFacts', 'memoryBrain.factLifecycleRuns', 'memoryBrain.batches(kind=fact-lifecycle)'], usesAi: false, formalPromptInjection: false, writesLegacyMemory: false }; }

    feature.factLifecycleService = { runFactLifecycleReview, rollbackLatestFactLifecycleBatch, getFactLifecycleCards, recordOperation, getRoutingReport };
})(window);
