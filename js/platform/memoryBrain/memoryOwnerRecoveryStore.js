// --- Memory Brain owner recovery store (v0.6.4) ---
// 记录一键关闭 Memory Brain 影子候选 / 回退 legacy owner 的演练状态；不接正式 prompt，不写旧记忆。
(function registerMemoryBrainOwnerRecoveryStore(global) {
    const app = global.OwoApp;
    const platform = app.platform.memoryBrain;
    if (!platform || !platform.memoryBrainStore) throw new Error('[memoryOwnerRecoveryStore] memoryBrainStore 尚未加载');
    function nowIso() { return new Date().toISOString(); }
    function nextId(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
    function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; } }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function ensure(options) { return platform.memoryBrainStore.ensureState(options || {}); }
    function save() { return platform.memoryBrainStore.saveRootState ? platform.memoryBrainStore.saveRootState() : Promise.resolve(false); }
    function semantics() { const api = app.core && app.core.memoryBrain && app.core.memoryBrain.ownerRecoverySemantics; if (!api || typeof api.buildOwnerRecoveryPlan !== 'function') throw new Error('[memoryOwnerRecoveryStore] ownerRecoverySemantics 尚未加载'); return api; }
    function getOwnerRecoverySnapshot(options = {}) {
        const state = ensure(options);
        state.ownerRecoveryReports = asArray(state.ownerRecoveryReports);
        state.ownerRecoveryRuns = asArray(state.ownerRecoveryRuns);
        return clone({ settings: state.settings || {}, ownerState: state.ownerState || null, ownerRecoveryReports: state.ownerRecoveryReports.slice(0, 20), ownerRecoveryRuns: state.ownerRecoveryRuns.slice(0, 20), lastOwnerRecoveryRun: state.lastOwnerRecoveryRun || null });
    }
    function appendOwnerRecoveryRun(payload = {}, options = {}) {
        const state = ensure(options);
        const createdAt = nowIso();
        const previousOwnerState = clone(state.ownerState || null);
        const previousSettings = clone(state.settings || {});
        const plan = semantics().buildOwnerRecoveryPlan({ action: payload.action, ownerState: state.ownerState, settings: state.settings, activeLegacyMemoryMode: payload.activeLegacyMemoryMode || payload.legacyMemoryMode });
        const report = Object.assign({}, plan, { id: payload.reportId || nextId('owner-recovery-report'), status: 'applied-shadow-only', createdAt, updatedAt: createdAt, previousOwnerState, previousSettings, formalPromptInjection: false, writesLegacyMemory: false });
        const run = { id: payload.runId || nextId('owner-recovery-run'), kind: 'owner-recovery', status: 'applied-shadow-only', createdAt, updatedAt: createdAt, action: plan.action, reportId: report.id, requestedOwner: plan.requestedOwner, effectiveOwner: plan.effectiveOwner, nextShadowInjectionEnabled: plan.nextShadowInjectionEnabled, activeLegacyMemoryMode: plan.legacyRuntime && plan.legacyRuntime.activeLegacyMemoryMode, formalPromptInjection: false, writesLegacyMemory: false };
        const batch = { id: payload.batchId || nextId('owner-recovery-batch'), kind: 'owner-recovery', status: 'applied-shadow-only', createdAt, updatedAt: createdAt, runId: run.id, reportId: report.id, action: plan.action, previousOwnerState, previousSettings, nextSettings: Object.assign({}, previousSettings, plan.settingsPatch), nextOwnerState: plan.ownerState, formalPromptInjection: false, canApplyToPrompt: false, writesLegacyMemory: false, cutoverGate: plan.cutoverGate };
        state.settings = Object.assign({}, state.settings || {}, plan.settingsPatch);
        state.ownerState = plan.ownerState;
        state.ownerRecoveryReports = [report].concat(asArray(state.ownerRecoveryReports).filter(item => item && item.id !== report.id));
        state.ownerRecoveryRuns = [run].concat(asArray(state.ownerRecoveryRuns).filter(item => item && item.id !== run.id));
        state.lastOwnerRecoveryRun = run;
        state.batches = [batch].concat(asArray(state.batches).filter(item => item && item.id !== batch.id));
        state.updatedAt = createdAt;
        save();
        return clone({ report, run, batch, ownerState: state.ownerState, settings: state.settings });
    }
    function rollbackOwnerRecoveryBatch(batchId, options = {}) {
        const state = ensure(options);
        const batch = asArray(state.batches).find(item => item && item.id === batchId && item.kind === 'owner-recovery');
        if (!batch) throw new Error('找不到可撤回的 owner 回退批次');
        const now = nowIso();
        state.settings = Object.assign({}, state.settings || {}, batch.previousSettings || {});
        state.ownerState = batch.previousOwnerState || null;
        state.ownerRecoveryReports = asArray(state.ownerRecoveryReports).map(item => item && item.id === batch.reportId ? Object.assign({}, item, { status: 'rolled-back', updatedAt: now }) : item);
        state.ownerRecoveryRuns = asArray(state.ownerRecoveryRuns).map(item => item && item.id === batch.runId ? Object.assign({}, item, { status: 'rolled-back', updatedAt: now }) : item);
        state.batches = asArray(state.batches).map(item => item && item.id === batch.id ? Object.assign({}, item, { status: 'rolled-back', updatedAt: now }) : item);
        state.lastOwnerRecoveryRun = state.ownerRecoveryRuns.find(item => item && item.status !== 'rolled-back') || null;
        state.updatedAt = now;
        save();
        return clone({ ok: true, status: 'rolled-back', batchId: batch.id, reportId: batch.reportId, ownerState: state.ownerState, settings: state.settings });
    }
    function rollbackLatestOwnerRecoveryBatch(options = {}) { const state = ensure(options); const batch = asArray(state.batches).find(item => item && item.kind === 'owner-recovery' && item.status !== 'rolled-back'); if (!batch) throw new Error('没有可撤回的 owner 回退批次'); return rollbackOwnerRecoveryBatch(batch.id, options); }
    function getRoutingReport() { return { owner: 'platform/memoryBrain/memoryOwnerRecoveryStore', release: 'v0.6.4', writes: ['memoryBrain.settings.shadowInjectionEnabled', 'memoryBrain.ownerState', 'memoryBrain.ownerRecoveryReports', 'memoryBrain.ownerRecoveryRuns', 'memoryBrain.batches(kind=owner-recovery)'], formalPromptInjection: false, writesLegacyMemory: false, keepsLegacyTableSummary: true, blockedUntil: 'v0.9' }; }
    platform.memoryOwnerRecoveryStore = { getOwnerRecoverySnapshot, appendOwnerRecoveryRun, rollbackOwnerRecoveryBatch, rollbackLatestOwnerRecoveryBatch, getRoutingReport };
})(window);
