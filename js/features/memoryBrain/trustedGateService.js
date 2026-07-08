// --- Memory Brain trusted gate service owner (v0.5.7) ---
// 编排可信记忆阶段收口 gate：审查、纠错、冲突、传播、信任分统一检查；不跑 AI，不接正式 prompt。
(function registerTrustedMemoryGateService(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;
    function api() { return app.platform.memoryBrain.publicApi; }
    function core() { return app.core.memoryBrain.trustedGateSemantics; }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function recordOperation(label, data, level) {
        const trace = app.platform.observability && app.platform.observability.operationTraceService;
        if (trace && typeof trace.recordOperation === 'function') return trace.recordOperation({ source: 'features/memoryBrain/trustedGateService', sourceModule: 'features/memoryBrain/trustedGateService', label, level: level || 'event', data: data || {} });
        return null;
    }
    function runTrustedMemoryGate(options = {}) {
        recordOperation('可信记忆 gate 输入', { options, formalPromptInjection: false, writesLegacyMemory: false, cutoverGate: 'blocked-until-v0.9' });
        const result = api().runTrustedMemoryGate(options);
        recordOperation('可信记忆 gate 应用结果', { reportId: result.report && result.report.id, runId: result.run && result.run.id, readinessScore: result.run && result.run.readinessScore, status: result.report && result.report.status, blockers: result.report && result.report.blockers, warnings: result.report && result.report.warnings, formalPromptInjection: false }, result.report && result.report.trustedReady ? 'success' : 'warning');
        return result;
    }
    function rollbackLatestTrustedMemoryGateBatch(options = {}) {
        const snapshot = api().getSnapshot(options);
        const batch = asArray(snapshot.batches).find(item => item && item.kind === 'trusted-memory-gate' && item.status === 'applied');
        if (!batch) throw new Error('没有可撤回的可信记忆 gate 批次');
        const result = api().rollbackTrustedMemoryGateBatch(batch.id, options);
        recordOperation('可信记忆 gate 批次回滚', { batchId: batch.id, result }, 'success');
        return result;
    }
    function getTrustedGateCards(options = {}) {
        const snapshot = api().getTrustedMemoryGateSnapshot(options);
        const plan = snapshot.plan || {};
        const latestReport = asArray(snapshot.reports).find(item => item && item.status !== 'rolled-back') || null;
        const displayReport = latestReport || plan;
        const compact = core().compactTrustedGateReportForList(displayReport || {});
        const runs = asArray(snapshot.runs).slice(0, 8).map(run => core().compactTrustedGateRunForList(run));
        const batches = asArray(snapshot.batches).slice(0, 8).map(batch => ({ id: batch.id, status: batch.status, readinessScore: batch.readinessScore || 0, blockerCount: batch.blockerCount || 0, warningCount: batch.warningCount || 0, createdAt: batch.createdAt }));
        return {
            planStatus: plan.status || 'unknown',
            readinessScore: compact.readinessScore || 0,
            trustedReady: !!compact.trustedReady,
            blockerCount: compact.blockerCount || 0,
            warningCount: compact.warningCount || 0,
            cutoverGate: compact.cutoverGate || 'blocked-until-v0.9',
            counts: compact.counts || {},
            checks: compact.checks || [],
            nextActions: asArray((displayReport || {}).nextActions).slice(0, 8),
            reports: asArray(snapshot.reports).filter(item => item && item.status !== 'rolled-back').slice(0, 6).map(item => core().compactTrustedGateReportForList(item)),
            runs,
            batches,
            totalText: { reports: String(asArray(snapshot.reports).length), runs: String(runs.length), batches: String(batches.length) },
            nextVersion: 'v0.6.0：正式注入 adapter（仍需 v0.9 总 gate 前不开启）'
        };
    }
    function getRoutingReport() { return { owner: 'features/memoryBrain/trustedGateService', release: 'v0.5.7', writes: ['memoryBrain.trustedMemoryGateReports', 'memoryBrain.trustedMemoryGateRuns', 'memoryBrain.batches(kind=trusted-memory-gate)'], usesAi: false, formalPromptInjection: false, writesLegacyMemory: false, cutoverGate: 'blocked-until-v0.9' }; }
    feature.trustedGateService = { runTrustedMemoryGate, rollbackLatestTrustedMemoryGateBatch, getTrustedGateCards, recordOperation, getRoutingReport };
})(window);
