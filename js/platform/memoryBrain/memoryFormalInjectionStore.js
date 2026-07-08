// --- Memory Brain formal injection adapter store (v0.6.0) ---
// 保存唯一正式记忆入口 adapter 的演练报告；不接 chat_ai / 正式提示词语义，不改变正式 prompt。
(function registerMemoryBrainFormalInjectionStore(global) {
    const app = global.OwoApp;
    const platform = app.platform.memoryBrain;
    if (!platform || !platform.memoryBrainStore) throw new Error('[memoryFormalInjectionStore] memoryBrainStore 尚未加载');

    function nowIso() { return new Date().toISOString(); }
    function nextId(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
    function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; } }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function ensure(options) { return platform.memoryBrainStore.ensureState(options || {}); }
    function save() { return platform.memoryBrainStore.saveRootState ? platform.memoryBrainStore.saveRootState() : Promise.resolve(false); }
    function semantics() {
        const api = app.core && app.core.memoryBrain && app.core.memoryBrain.formalInjectionAdapterSemantics;
        if (!api || typeof api.buildFormalInjectionAdapterPackage !== 'function') throw new Error('[memoryFormalInjectionStore] formalInjectionAdapterSemantics 尚未加载');
        return api;
    }

    function getFormalInjectionAdapterSnapshot(options = {}) {
        const state = ensure(options);
        return clone({
            reports: asArray(state.formalInjectionAdapterReports).slice(0, 20),
            runs: asArray(state.formalInjectionAdapterRuns).slice(0, 20),
            lastRun: state.lastFormalInjectionAdapterRun || null,
            ownerState: state.ownerState || null
        });
    }
    function appendFormalInjectionAdapterRun(payload = {}, options = {}) {
        const state = ensure(options);
        const createdAt = nowIso();
        const reportId = payload.reportId || nextId('formal-adapter-report');
        const runId = payload.runId || nextId('formal-adapter-run');
        const batchId = payload.batchId || nextId('formal-adapter-batch');
        const report = Object.assign({ id: reportId, createdAt, updatedAt: createdAt }, clone(payload.report || semantics().buildFormalInjectionAdapterPackage(Object.assign({}, payload, { snapshot: state }))));
        report.id = reportId;
        report.createdAt = report.createdAt || createdAt;
        report.updatedAt = createdAt;
        report.batchId = batchId;
        report.runId = runId;
        const run = {
            id: runId,
            kind: 'formal-injection-adapter',
            status: report.status || 'blocked-shadow-only',
            createdAt,
            updatedAt: createdAt,
            reportId,
            requestedOwner: report.owner && report.owner.requestedOwner || 'legacy',
            finalOwner: report.final && report.final.owner || 'legacy',
            cutoverGate: report.owner && report.owner.cutoverGate || 'blocked-until-v0.9',
            finalBlockCharCount: report.final && report.final.blockCharCount || 0,
            memoryBrainCandidateChars: report.memoryBrain && report.memoryBrain.candidateBlockCharCount || 0,
            issueCount: asArray(report.issues).length,
            formalPromptInjection: false,
            promptHooked: false,
            noDualInjection: true
        };
        const batch = {
            id: batchId,
            kind: 'formal-injection-adapter',
            status: 'applied-shadow-only',
            createdAt,
            updatedAt: createdAt,
            reportId,
            runId,
            requestedOwner: run.requestedOwner,
            finalOwner: run.finalOwner,
            cutoverGate: run.cutoverGate,
            formalPromptInjection: false,
            promptHooked: false,
            noDualInjection: true
        };
        state.formalInjectionAdapterReports = [report].concat(asArray(state.formalInjectionAdapterReports).filter(item => item && item.id !== report.id));
        state.formalInjectionAdapterRuns = [run].concat(asArray(state.formalInjectionAdapterRuns).filter(item => item && item.id !== run.id));
        state.lastFormalInjectionAdapterRun = run;
        state.batches = [batch].concat(asArray(state.batches).filter(item => item && item.id !== batch.id));
        state.updatedAt = createdAt;
        save();
        return clone({ report, run, batch });
    }
    function rollbackFormalInjectionAdapterBatch(batchId, options = {}) {
        const state = ensure(options);
        const batch = asArray(state.batches).find(item => item && item.id === batchId && item.kind === 'formal-injection-adapter');
        if (!batch) throw new Error('找不到可撤回的正式注入 adapter 批次');
        const now = nowIso();
        state.formalInjectionAdapterReports = asArray(state.formalInjectionAdapterReports).map(report => report && report.id === batch.reportId ? Object.assign({}, report, { status: 'rolled-back', updatedAt: now }) : report);
        state.formalInjectionAdapterRuns = asArray(state.formalInjectionAdapterRuns).map(run => run && run.id === batch.runId ? Object.assign({}, run, { status: 'rolled-back', updatedAt: now }) : run);
        state.batches = asArray(state.batches).map(item => item && item.id === batch.id ? Object.assign({}, item, { status: 'rolled-back', updatedAt: now }) : item);
        state.lastFormalInjectionAdapterRun = state.formalInjectionAdapterRuns[0] || null;
        state.updatedAt = now;
        save();
        return clone({ ok: true, batchId: batch.id, reportId: batch.reportId, runId: batch.runId });
    }
    function rollbackLatestFormalInjectionAdapterBatch(options = {}) {
        const state = ensure(options);
        const batch = asArray(state.batches).find(item => item && item.kind === 'formal-injection-adapter' && item.status !== 'rolled-back');
        if (!batch) throw new Error('没有可撤回的正式注入 adapter 批次');
        return rollbackFormalInjectionAdapterBatch(batch.id, options);
    }
    function getRoutingReport() {
        return { owner: 'platform/memoryBrain/memoryFormalInjectionStore', release: 'v0.6.0', writes: ['memoryBrain.formalInjectionAdapterReports', 'memoryBrain.formalInjectionAdapterRuns', 'memoryBrain.batches(kind=formal-injection-adapter)'], formalPromptInjection: false, promptHooked: false, noDualInjection: true, blockedUntil: 'v0.9' };
    }

    platform.memoryFormalInjectionStore = { getFormalInjectionAdapterSnapshot, appendFormalInjectionAdapterRun, rollbackFormalInjectionAdapterBatch, rollbackLatestFormalInjectionAdapterBatch, getRoutingReport };
})(window);
