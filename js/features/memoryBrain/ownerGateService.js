// --- Memory Brain owner gate service (v0.4.9) ---
// 编排单一 owner 切换门 UI/trace；不触碰正式 prompt，不写旧记忆系统。
(function registerMemoryBrainOwnerGateService(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;

    function api() { return app.platform.memoryBrain.publicApi; }
    function recordOperation(label, data, level) {
        const service = app.platform.observability && app.platform.observability.operationTraceService;
        if (service && typeof service.recordOperation === 'function') {
            return service.recordOperation({ source: 'features/memoryBrain/ownerGateService', sourceModule: 'features/memoryBrain/ownerGateService', label, level: level || 'event', data: data || {} });
        }
        return null;
    }
    function getOwnerGateCards(options = {}) {
        const snapshot = api().getOwnerGateSnapshot(options);
        const core = app.core && app.core.memoryBrain && app.core.memoryBrain.ownerSwitchSemantics;
        return core && typeof core.compactOwnerGateForList === 'function'
            ? core.compactOwnerGateForList(snapshot.ownerState, snapshot.ownerSwitchRuns)
            : snapshot;
    }
    function requestOwnerSwitch(requestedOwner, options = {}) {
        recordOperation('记忆脑 owner 切换门输入', { requestedOwner, formalPromptInjection: false, noDualInjection: true, blockedUntil: 'v0.9' });
        const result = api().appendOwnerSwitchRun({ requestedOwner }, options);
        recordOperation('记忆脑 owner 切换门应用结果', { requestedOwner: result.ownerState && result.ownerState.requestedOwner, effectiveOwner: result.ownerState && result.ownerState.effectiveOwner, cutoverGate: result.ownerState && result.ownerState.cutoverGate, issueCount: result.ownerState && result.ownerState.issues && result.ownerState.issues.length, formalPromptInjection: false });
        return result;
    }
    function rollbackLatestOwnerSwitchBatch(options = {}) {
        const result = api().rollbackLatestOwnerSwitchBatch(options);
        recordOperation('记忆脑 owner 切换门批次回滚', { result, formalPromptInjection: false });
        return result;
    }
    function updateUiGroupOpen(groupId, open, options = {}) {
        const result = api().updateUiGroupOpen(groupId, open, options);
        recordOperation('记忆脑 UI 分组折叠设置', { groupId, open: !!open });
        return result;
    }
    feature.ownerGateService = { getOwnerGateCards, requestOwnerSwitch, rollbackLatestOwnerSwitchBatch, updateUiGroupOpen, recordOperation };
})(window);
