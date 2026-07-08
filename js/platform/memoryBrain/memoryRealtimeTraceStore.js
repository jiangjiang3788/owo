// --- Memory Brain realtime injection trace store (v0.6.2) ---
// 保存实时注入 trace 报告；不写旧记忆、不接正式 prompt。
(function registerMemoryBrainRealtimeTraceStore(global) {
    const app = global.OwoApp;
    const platform = app.platform.memoryBrain;
    if (!platform || !platform.memoryBrainStore) throw new Error('[memoryRealtimeTraceStore] memoryBrainStore 尚未加载');

    function nowIso() { return new Date().toISOString(); }
    function nextId(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
    function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; } }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function ensure(options) { return platform.memoryBrainStore.ensureState(options || {}); }
    function save() { return platform.memoryBrainStore.saveRootState ? platform.memoryBrainStore.saveRootState() : Promise.resolve(false); }
    function semantics() {
        const api = app.core && app.core.memoryBrain && app.core.memoryBrain.realtimeInjectionTraceSemantics;
        if (!api || typeof api.buildRealtimeInjectionTraceReport !== 'function') throw new Error('[memoryRealtimeTraceStore] realtimeInjectionTraceSemantics 尚未加载');
        return api;
    }

    function getRealtimeTraceSnapshot(options = {}) {
        const state = ensure(options);
        return clone({ reports: asArray(state.realtimeInjectionTraceReports).slice(0, 24), runs: asArray(state.realtimeInjectionTraceRuns).slice(0, 24), lastRun: state.lastRealtimeInjectionTraceRun || null });
    }
    function appendRealtimeTraceRun(payload = {}, options = {}) {
        const state = ensure(options);
        const createdAt = nowIso();
        const reportId = payload.reportId || nextId('realtime-trace-report');
        const runId = payload.runId || nextId('realtime-trace-run');
        const batchId = payload.batchId || nextId('realtime-trace-batch');
        const report = Object.assign({ id: reportId, createdAt, updatedAt: createdAt }, clone(payload.report || semantics().buildRealtimeInjectionTraceReport(Object.assign({}, payload, { snapshot: state }))));
        report.id = reportId;
        report.runId = runId;
        report.batchId = batchId;
        report.createdAt = report.createdAt || createdAt;
        report.updatedAt = createdAt;
        const run = {
            id: runId,
            kind: 'realtime-injection-trace',
            status: report.status || 'active',
            createdAt,
            updatedAt: createdAt,
            reportId,
            queryText: report.query && report.query.text || '',
            finalOwner: report.final && report.final.owner || 'legacy',
            brainBlockCharCount: report.memoryBrain && report.memoryBrain.blockCharCount || 0,
            legacyBlockCharCount: report.legacy && report.legacy.blockCharCount || 0,
            hitCount: report.trace && asArray(report.trace.whyHit).length || 0,
            missCount: report.trace && asArray(report.trace.whyMissed).length || 0,
            blockerCount: report.trace && asArray(report.trace.blockers).length || 0,
            formalPromptInjection: false,
            promptHooked: false,
            blockedUntil: 'v0.9'
        };
        const batch = {
            id: batchId,
            kind: 'realtime-injection-trace',
            status: 'applied-shadow-only',
            createdAt,
            updatedAt: createdAt,
            reportId,
            runId,
            finalOwner: run.finalOwner,
            formalPromptInjection: false,
            promptHooked: false,
            noDualInjection: true
        };
        state.realtimeInjectionTraceReports = [report].concat(asArray(state.realtimeInjectionTraceReports).filter(item => item && item.id !== report.id));
        state.realtimeInjectionTraceRuns = [run].concat(asArray(state.realtimeInjectionTraceRuns).filter(item => item && item.id !== run.id));
        state.lastRealtimeInjectionTraceRun = run;
        state.batches = [batch].concat(asArray(state.batches).filter(item => item && item.id !== batch.id));
        state.updatedAt = createdAt;
        save();
        return clone({ report, run, batch });
    }
    function rollbackRealtimeTraceBatch(batchId, options = {}) {
        const state = ensure(options);
        const batch = asArray(state.batches).find(item => item && item.id === batchId && item.kind === 'realtime-injection-trace');
        if (!batch) throw new Error('找不到可撤回的实时注入 trace 批次');
        const now = nowIso();
        state.realtimeInjectionTraceReports = asArray(state.realtimeInjectionTraceReports).map(report => report && report.id === batch.reportId ? Object.assign({}, report, { status: 'rolled-back', updatedAt: now }) : report);
        state.realtimeInjectionTraceRuns = asArray(state.realtimeInjectionTraceRuns).map(run => run && run.id === batch.runId ? Object.assign({}, run, { status: 'rolled-back', updatedAt: now }) : run);
        state.batches = asArray(state.batches).map(item => item && item.id === batch.id ? Object.assign({}, item, { status: 'rolled-back', updatedAt: now }) : item);
        state.lastRealtimeInjectionTraceRun = asArray(state.realtimeInjectionTraceRuns).find(run => run && run.status !== 'rolled-back') || null;
        state.updatedAt = now;
        save();
        return clone({ ok: true, batchId: batch.id, reportId: batch.reportId, runId: batch.runId });
    }
    function rollbackLatestRealtimeTraceBatch(options = {}) {
        const state = ensure(options);
        const batch = asArray(state.batches).find(item => item && item.kind === 'realtime-injection-trace' && item.status !== 'rolled-back');
        if (!batch) throw new Error('没有可撤回的实时注入 trace 批次');
        return rollbackRealtimeTraceBatch(batch.id, options);
    }
    function getRoutingReport() {
        return { owner: 'platform/memoryBrain/memoryRealtimeTraceStore', release: 'v0.6.2', writes: ['memoryBrain.realtimeInjectionTraceReports', 'memoryBrain.realtimeInjectionTraceRuns', 'memoryBrain.batches(kind=realtime-injection-trace)'], formalPromptInjection: false, promptHooked: false, blockedUntil: 'v0.9' };
    }

    platform.memoryRealtimeTraceStore = { getRealtimeTraceSnapshot, appendRealtimeTraceRun, rollbackRealtimeTraceBatch, rollbackLatestRealtimeTraceBatch, getRoutingReport };
})(window);
