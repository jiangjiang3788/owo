// --- Memory Brain trusted gate store owner (v0.5.7) ---
// 写入 trustedMemoryGateReports / runs / batch；只做可信阶段 gate 记录，不写旧记忆，不接正式 prompt。
(function registerTrustedMemoryGateStore(global) {
    const app = global.OwoApp;
    const platform = app.platform.memoryBrain;
    function store() { return platform.memoryBrainStore; }
    function core() { return app.core.memoryBrain.trustedGateSemantics; }
    function ensure(options) { return store().ensureState(options || {}); }
    function save() { return store().saveRootState(); }
    function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; } }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function nowIso() { return new Date().toISOString(); }
    function nextId(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
    function buildTrustedMemoryGateReport(options = {}) {
        const state = ensure(options);
        return core().buildTrustedMemoryGateReport(state, options || {});
    }
    function applyTrustedMemoryGateReport(report, options = {}) {
        if (!report || !report.status) throw new Error('可信记忆 gate 报告不可应用');
        const state = ensure(options);
        const now = nowIso();
        const runId = nextId('trusted-memory-gate-run');
        const reportId = nextId('trusted-memory-gate-report');
        const batchId = nextId('trusted-memory-gate-batch');
        const storedReport = Object.assign({}, clone(report), { id: reportId, runId, batchId, status: report.status || 'blocked', createdAt: now, updatedAt: now, formalPromptInjection: false, writesLegacyMemory: false, readyForFormalCutover: false, cutoverGate: 'blocked-until-v0.9' });
        const run = { id: runId, kind: 'trusted-memory-gate', status: storedReport.status, reportId, batchId, readinessScore: storedReport.readinessScore || 0, trustedReady: !!storedReport.trustedReady, blockerCount: asArray(storedReport.blockers).length, warningCount: asArray(storedReport.warnings).length, createdAt: now, updatedAt: now, formalPromptInjection: false, writesLegacyMemory: false, readyForFormalCutover: false, cutoverGate: 'blocked-until-v0.9' };
        const batch = { id: batchId, kind: 'trusted-memory-gate', status: 'applied', reportId, runId, createdAt: now, updatedAt: now, readinessScore: run.readinessScore, blockerCount: run.blockerCount, warningCount: run.warningCount, trustedReady: run.trustedReady, formalPromptInjection: false, writesLegacyMemory: false, readyForFormalCutover: false, cutoverGate: 'blocked-until-v0.9' };
        state.trustedMemoryGateReports = [storedReport].concat(asArray(state.trustedMemoryGateReports)).slice(0, 80);
        state.trustedMemoryGateRuns = [run].concat(asArray(state.trustedMemoryGateRuns)).slice(0, 80);
        state.lastTrustedMemoryGateRun = run;
        state.batches = [batch].concat(asArray(state.batches));
        state.updatedAt = now;
        save();
        return clone({ report: storedReport, run, batch });
    }
    function runTrustedMemoryGate(options = {}) {
        const report = buildTrustedMemoryGateReport(options);
        return applyTrustedMemoryGateReport(report, options);
    }
    function rollbackTrustedMemoryGateBatch(batchId, options = {}) {
        const state = ensure(options);
        const batch = asArray(state.batches).find(item => item && item.id === batchId && item.kind === 'trusted-memory-gate');
        if (!batch) throw new Error('找不到可撤回的可信记忆 gate 批次');
        const now = nowIso();
        state.trustedMemoryGateReports = asArray(state.trustedMemoryGateReports).map(item => item && item.id === batch.reportId ? Object.assign({}, item, { status: 'rolled-back', rollbackAt: now, updatedAt: now }) : item);
        state.trustedMemoryGateRuns = asArray(state.trustedMemoryGateRuns).map(item => item && item.id === batch.runId ? Object.assign({}, item, { status: 'rolled-back', rollbackAt: now, updatedAt: now }) : item);
        state.batches = asArray(state.batches).map(item => item && item.id === batch.id ? Object.assign({}, item, { status: 'rolled-back', rollbackAt: now, updatedAt: now }) : item);
        state.lastTrustedMemoryGateRun = asArray(state.trustedMemoryGateRuns).find(item => item && item.status !== 'rolled-back') || null;
        state.updatedAt = now;
        save();
        return clone({ ok: true, batchId, reportId: batch.reportId, runId: batch.runId, readinessScore: batch.readinessScore || 0 });
    }
    function getTrustedMemoryGateSnapshot(options = {}) {
        const state = ensure(options);
        const plan = buildTrustedMemoryGateReport(options);
        return clone({ plan, reports: asArray(state.trustedMemoryGateReports), runs: asArray(state.trustedMemoryGateRuns).slice(0, 20), batches: asArray(state.batches).filter(batch => batch && batch.kind === 'trusted-memory-gate').slice(0, 20), lastTrustedMemoryGateRun: state.lastTrustedMemoryGateRun || null });
    }
    function getRoutingReport() { return { owner: 'platform/memoryBrain/trustedGateStore', release: 'v0.5.7', writes: ['memoryBrain.trustedMemoryGateReports', 'memoryBrain.trustedMemoryGateRuns', 'memoryBrain.batches(kind=trusted-memory-gate)'], formalPromptInjection: false, writesLegacyMemory: false, cutoverGate: 'blocked-until-v0.9' }; }
    platform.trustedGateStore = { buildTrustedMemoryGateReport, applyTrustedMemoryGateReport, runTrustedMemoryGate, rollbackTrustedMemoryGateBatch, getTrustedMemoryGateSnapshot, getRoutingReport };
})(window);
