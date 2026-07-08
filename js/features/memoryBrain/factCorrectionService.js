// --- Memory Brain fact correction service owner (v0.5.1) ---
// 编排事实人工改写、版本记录和回滚；不跑 AI，不写旧记忆，不接正式 prompt。
(function registerFactCorrectionService(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;
    function api() { return app.platform.memoryBrain.publicApi; }
    function core() { return app.core.memoryBrain.factCorrectionSemantics; }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function recordOperation(label, data, level) {
        const trace = app.platform.observability && app.platform.observability.operationTraceService;
        if (trace && typeof trace.recordOperation === 'function') return trace.recordOperation({ source: 'features/memoryBrain/factCorrectionService', sourceModule: 'features/memoryBrain/factCorrectionService', label, level: level || 'event', data: data || {} });
        return null;
    }
    function correctFact(options = {}) {
        recordOperation('事实改写输入', { factId: options.factId || '', reviewItemId: options.reviewItemId || '', formalPromptInjection: false, writesLegacyMemory: false });
        const plan = api().buildFactCorrectionPlan(options);
        if (!plan.ok) {
            recordOperation('事实改写计划错误', { errorMessage: plan.errorMessage, status: plan.status }, 'error');
            throw new Error(plan.errorMessage || '事实改写计划失败');
        }
        recordOperation('事实改写计划', { factId: plan.factId, reviewItemId: plan.reviewItemId, changedFields: plan.changedFields, version: plan.version, status: plan.status }, 'success');
        const stored = api().applyFactCorrectionPlan(plan, options);
        recordOperation('事实改写应用结果', { batchId: stored.batch && stored.batch.id, runId: stored.run && stored.run.id, correctionId: stored.correction && stored.correction.id, factId: stored.fact && stored.fact.id, changedFields: plan.changedFields, formalPromptInjection: false }, 'success');
        return stored;
    }
    function rollbackLatestFactCorrectionBatch(options = {}) {
        const snapshot = api().getSnapshot(options);
        const batch = asArray(snapshot.batches).find(item => item && item.kind === 'fact-correction' && item.status === 'applied');
        if (!batch) throw new Error('没有可撤回的事实改写批次');
        const result = api().rollbackFactCorrectionBatch(batch.id, options);
        recordOperation('事实改写批次回滚', { batchId: batch.id, result }, 'success');
        return result;
    }
    function compactFact(fact) {
        const apiCore = app.core.memoryBrain.publicApi;
        return apiCore && apiCore.compactFactForList ? apiCore.compactFactForList(fact || {}) : fact;
    }
    function getFactCorrectionCards(options = {}) {
        const snapshot = api().getFactCorrectionSnapshot(options);
        const needsEditItems = asArray(snapshot.reviewInboxItems).filter(item => item && item.targetType === 'fact' && item.status === 'needs-edit').slice(0, 24);
        const factById = new Map(asArray(snapshot.facts).map(fact => [fact && fact.id, fact]).filter(pair => pair[0]));
        const candidates = needsEditItems.map(item => {
            const fact = factById.get(item.targetId) || {};
            const compact = compactFact(fact);
            return {
                reviewItemId: item.id,
                factId: item.targetId,
                issueType: item.issueType,
                severity: item.severity,
                title: item.title,
                reason: item.reason,
                content: compact.content || fact.content || '',
                subject: fact.subject || 'user',
                predicate: fact.predicate || 'relates_to',
                object: fact.object || '',
                factType: fact.factType || 'natural',
                labelsText: asArray(fact.labels).join('，'),
                keywordsText: asArray(fact.keywords).join('，'),
                confidence: fact.confidence || 0.8,
                sourceRangeText: compact.sourceRangeText || ''
            };
        });
        const corrections = asArray(snapshot.factCorrections).slice(0, 12).map(item => core().compactFactCorrectionForList(item));
        const runs = asArray(snapshot.factCorrectionRuns).slice(0, 10).map(run => core().compactFactCorrectionRunForList(run));
        const batches = asArray(snapshot.batches).slice(0, 8).map(batch => ({ id: batch.id, status: batch.status, factId: batch.factId, reviewItemId: batch.reviewItemId, version: batch.version, changedFields: batch.changedFields || [], createdAt: batch.createdAt }));
        return { candidates, corrections, runs, batches, totalText: { candidates: String(candidates.length), corrections: String(corrections.length), runs: String(runs.length), batches: String(batches.length) }, nextVersion: 'v0.5.2：冲突事实处理' };
    }
    function getRoutingReport() { return { owner: 'features/memoryBrain/factCorrectionService', release: 'v0.5.1', writes: ['memoryBrain.facts corrected fields', 'memoryBrain.factCorrections', 'memoryBrain.factCorrectionRuns', 'memoryBrain.batches(kind=fact-correction)'], usesAi: false, formalPromptInjection: false, writesLegacyMemory: false }; }
    feature.factCorrectionService = { correctFact, rollbackLatestFactCorrectionBatch, getFactCorrectionCards, recordOperation, getRoutingReport };
})(window);
