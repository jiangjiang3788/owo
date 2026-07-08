// --- Memory Brain legacy read-only downgrade store (v0.6.3) ---
// 保存旧记忆系统降为只读历史来源的演练报告；不修改旧记忆，不改正式 prompt owner。
(function registerMemoryBrainLegacyReadOnlyStore(global) {
    const app = global.OwoApp;
    const platform = app.platform.memoryBrain;
    if (!platform || !platform.memoryBrainStore) throw new Error('[memoryLegacyReadOnlyStore] memoryBrainStore 尚未加载');

    function nowIso() { return new Date().toISOString(); }
    function nextId(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
    function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; } }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function ensure(options) { return platform.memoryBrainStore.ensureState(options || {}); }
    function save() { return platform.memoryBrainStore.saveRootState ? platform.memoryBrainStore.saveRootState() : Promise.resolve(false); }
    function semantics() {
        const api = app.core && app.core.memoryBrain && app.core.memoryBrain.legacyReadOnlySemantics;
        if (!api || typeof api.buildLegacyReadOnlyPlan !== 'function') throw new Error('[memoryLegacyReadOnlyStore] legacyReadOnlySemantics 尚未加载');
        return api;
    }

    function getLegacyReadOnlySnapshot(options = {}) {
        const state = ensure(options);
        return clone({
            reports: asArray(state.legacyReadOnlyReports).slice(0, 20),
            runs: asArray(state.legacyReadOnlyRuns).slice(0, 20),
            lastRun: state.lastLegacyReadOnlyRun || null,
            ownerState: state.ownerState || null,
            lastLegacyScan: state.lastLegacyScan || null
        });
    }
    function appendLegacyReadOnlyRun(payload = {}, options = {}) {
        const state = ensure(options);
        const createdAt = nowIso();
        const reportId = payload.reportId || nextId('legacy-readonly-report');
        const runId = payload.runId || nextId('legacy-readonly-run');
        const batchId = payload.batchId || nextId('legacy-readonly-batch');
        const report = Object.assign({ id: reportId, createdAt, updatedAt: createdAt }, clone(payload.report || semantics().buildLegacyReadOnlyPlan(Object.assign({}, payload, { snapshot: state }))));
        report.id = reportId;
        report.createdAt = report.createdAt || createdAt;
        report.updatedAt = createdAt;
        report.batchId = batchId;
        report.runId = runId;
        const run = {
            id: runId,
            kind: 'legacy-readonly-downgrade',
            status: report.status || 'planned-only',
            reportId,
            batchId,
            createdAt,
            updatedAt: createdAt,
            activeOwner: report.legacyOwner && report.legacyOwner.activeOwner || 'legacy',
            finalOwner: report.legacyOwner && report.legacyOwner.finalOwner || 'legacy',
            readinessScore: report.readinessScore || 0,
            issueCount: asArray(report.issues).length,
            canApplyNow: false,
            formalPromptInjection: false,
            blockedUntil: 'v0.9'
        };
        const batch = {
            id: batchId,
            kind: 'legacy-readonly-downgrade',
            status: 'applied',
            mode: 'shadow-readonly-plan',
            createdAt,
            updatedAt: createdAt,
            reportId,
            runId,
            writes: ['memoryBrain.legacyReadOnlyReports', 'memoryBrain.legacyReadOnlyRuns', 'memoryBrain.batches(kind=legacy-readonly-downgrade)'],
            legacyWrites: [],
            formalPromptInjection: false,
            promptHooked: false,
            payload: clone({ input: payload.input || {}, report })
        };
        state.legacyReadOnlyReports = asArray(state.legacyReadOnlyReports).filter(item => item && item.id !== reportId);
        state.legacyReadOnlyReports.unshift(report);
        state.legacyReadOnlyRuns = asArray(state.legacyReadOnlyRuns).filter(item => item && item.id !== runId);
        state.legacyReadOnlyRuns.unshift(run);
        state.lastLegacyReadOnlyRun = clone(run);
        state.batches = asArray(state.batches).filter(item => item && item.id !== batchId);
        state.batches.unshift(batch);
        state.updatedAt = createdAt;
        save();
        return clone({ report, run, batch });
    }
    function rollbackLegacyReadOnlyBatch(batchId, options = {}) {
        const state = ensure(options);
        const target = asArray(state.batches).find(batch => batch && batch.id === batchId && batch.kind === 'legacy-readonly-downgrade');
        if (!target) throw new Error('找不到 legacy-readonly-downgrade 批次');
        const reportId = target.reportId;
        const runId = target.runId;
        const updatedAt = nowIso();
        state.legacyReadOnlyReports = asArray(state.legacyReadOnlyReports).map(item => item && item.id === reportId ? Object.assign({}, item, { status: 'rolled-back', updatedAt, rolledBackAt: updatedAt }) : item);
        state.legacyReadOnlyRuns = asArray(state.legacyReadOnlyRuns).map(item => item && item.id === runId ? Object.assign({}, item, { status: 'rolled-back', updatedAt, rolledBackAt: updatedAt }) : item);
        state.batches = asArray(state.batches).map(batch => batch && batch.id === batchId ? Object.assign({}, batch, { status: 'rolled-back', updatedAt, rolledBackAt: updatedAt }) : batch);
        state.lastLegacyReadOnlyRun = state.legacyReadOnlyRuns.find(item => item && item.id === runId) || null;
        state.updatedAt = updatedAt;
        save();
        return clone({ batchId, reportId, runId, status: 'rolled-back' });
    }
    function rollbackLatestLegacyReadOnlyBatch(options = {}) {
        const state = ensure(options);
        const batch = asArray(state.batches).find(item => item && item.kind === 'legacy-readonly-downgrade' && item.status !== 'rolled-back');
        if (!batch) throw new Error('没有可撤回的旧系统只读降级演练批次');
        return rollbackLegacyReadOnlyBatch(batch.id, options);
    }
    function getRoutingReport() {
        return { owner: 'platform/memoryBrain/memoryLegacyReadOnlyStore', release: 'v0.6.3', writes: ['memoryBrain.legacyReadOnlyReports', 'memoryBrain.legacyReadOnlyRuns', 'memoryBrain.batches(kind=legacy-readonly-downgrade)'], legacyWrites: [], formalPromptInjection: false, promptHooked: false, blockedUntil: 'v0.9' };
    }

    platform.memoryLegacyReadOnlyStore = { getLegacyReadOnlySnapshot, appendLegacyReadOnlyRun, rollbackLegacyReadOnlyBatch, rollbackLatestLegacyReadOnlyBatch, getRoutingReport };
})(window);
