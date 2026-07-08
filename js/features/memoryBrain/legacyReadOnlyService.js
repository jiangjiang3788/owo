// --- Memory Brain legacy read-only downgrade service (v0.6.3) ---
// 编排旧记忆降级为只读历史来源的演练报告；不改旧记忆、不接正式 prompt。
(function registerMemoryBrainLegacyReadOnlyService(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;

    function rootState(options) { return (options && options.state) || global.db || {}; }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function api() { return app.platform.memoryBrain.publicApi; }
    function core() { return app.core.memoryBrain.publicApi; }
    function record(label, data, level) {
        const service = app.platform.observability && app.platform.observability.operationTraceService;
        if (service && typeof service.recordOperation === 'function') return service.recordOperation({ source: 'features/memoryBrain/legacyReadOnlyService', sourceModule: 'features/memoryBrain/legacyReadOnlyService', label, level: level || 'event', data: data || {} });
        return null;
    }
    function findChat(state) {
        const id = global.currentChatId || '';
        const type = global.currentChatType === 'group' ? 'group' : 'private';
        const list = type === 'group' ? state.groups : state.characters;
        return asArray(list).find(chat => chat && chat.id === id) || asArray(state.characters).find(chat => chat && asArray(chat.history).length) || asArray(state.groups).find(chat => chat && asArray(chat.history).length) || null;
    }
    function getActiveLegacyOwner(state) {
        const owner = app.core && app.core.memory && app.core.memory.legacyMemoryOwnerSemantics;
        const chat = findChat(state);
        return owner && typeof owner.getActiveMemoryMode === 'function' ? owner.getActiveMemoryMode(chat) : 'legacy';
    }
    function runLegacyReadOnlyDowngrade(options = {}) {
        const state = rootState(options);
        const snapshot = api().getSnapshot({ state });
        const legacyScan = api().scanLegacySources({ state });
        const activeLegacyOwner = getActiveLegacyOwner(state);
        const input = { activeLegacyOwner, legacyTotals: legacyScan.totals, chatCount: legacyScan.chatCount, formalPromptInjection: false, promptHooked: false, blockedUntil: 'v0.9' };
        record('记忆脑旧系统只读降级输入', input);
        const report = core().buildLegacyReadOnlyPlan({ snapshot, legacyScan, activeLegacyOwner });
        const result = api().appendLegacyReadOnlyRun({ input, report }, { state });
        record('记忆脑旧系统只读降级应用结果', { reportId: result.report && result.report.id, runId: result.run && result.run.id, readinessScore: result.report && result.report.readinessScore, issueCount: result.report && result.report.issues && result.report.issues.length, finalOwner: result.report && result.report.legacyOwner && result.report.legacyOwner.finalOwner, formalPromptInjection: false, blockedUntil: 'v0.9' }, 'success');
        return result;
    }
    function rollbackLatestLegacyReadOnlyBatch(options = {}) {
        const result = api().rollbackLatestLegacyReadOnlyBatch(options);
        record('记忆脑旧系统只读降级批次回滚', { result, formalPromptInjection: false }, 'success');
        return result;
    }
    function getLegacyReadOnlyCards(options = {}) {
        const snapshot = api().getLegacyReadOnlySnapshot(options);
        const compact = app.core.memoryBrain.legacyReadOnlySemantics.compactLegacyReadOnlyPlanForList;
        return {
            reports: asArray(snapshot.reports).filter(item => item && item.status !== 'rolled-back').slice(0, 8).map(compact),
            rolledBackReports: asArray(snapshot.reports).filter(item => item && item.status === 'rolled-back').slice(0, 5).map(compact),
            runs: asArray(snapshot.runs).slice(0, 8),
            lastRun: snapshot.lastRun || null,
            ownerState: snapshot.ownerState || null,
            lastLegacyScan: snapshot.lastLegacyScan || null
        };
    }

    feature.legacyReadOnlyService = { runLegacyReadOnlyDowngrade, rollbackLatestLegacyReadOnlyBatch, getLegacyReadOnlyCards, record };
})(window);
