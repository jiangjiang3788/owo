// --- Memory Brain owner gate store (v0.4.9) ---
// 负责记录单一正式记忆 owner 安全门状态；不接 chat_ai / promptSemantics，不改变正式 prompt。
(function registerMemoryBrainOwnerGateStore(global) {
    const app = global.OwoApp;
    const platform = app.platform.memoryBrain;
    if (!platform || !platform.memoryBrainStore) throw new Error('[memoryOwnerGateStore] memoryBrainStore 尚未加载');

    function nowIso() { return new Date().toISOString(); }
    function nextId(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
    function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; } }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function getSemantics() {
        const semantics = app.core && app.core.memoryBrain && app.core.memoryBrain.ownerSwitchSemantics;
        if (!semantics || typeof semantics.evaluateOwnerSwitch !== 'function') throw new Error('[memoryOwnerGateStore] ownerSwitchSemantics 尚未加载');
        return semantics;
    }
    function getUiSemantics() {
        const semantics = app.core && app.core.memoryBrain && app.core.memoryBrain.uiGroupSemantics;
        if (!semantics || typeof semantics.normalizeGroupPrefs !== 'function') throw new Error('[memoryOwnerGateStore] uiGroupSemantics 尚未加载');
        return semantics;
    }
    function ensure(options) { return platform.memoryBrainStore.ensureState(options || {}); }
    function save() { return platform.memoryBrainStore.saveRootState ? platform.memoryBrainStore.saveRootState() : Promise.resolve(false); }

    function getOwnerGateSnapshot(options = {}) {
        const state = ensure(options);
        const semantics = getSemantics();
        state.ownerState = semantics.normalizeOwnerState(state.ownerState);
        state.ownerSwitchRuns = asArray(state.ownerSwitchRuns);
        return clone({ ownerState: state.ownerState, ownerSwitchRuns: state.ownerSwitchRuns.slice(0, 20), lastOwnerSwitchRun: state.lastOwnerSwitchRun || null });
    }

    function appendOwnerSwitchRun(payload = {}, options = {}) {
        const state = ensure(options);
        const semantics = getSemantics();
        const createdAt = nowIso();
        const previousOwnerState = semantics.normalizeOwnerState(state.ownerState);
        const evaluation = semantics.evaluateOwnerSwitch(previousOwnerState, payload.requestedOwner || previousOwnerState.requestedOwner, { now: createdAt });
        const run = {
            id: payload.runId || nextId('owner-switch-run'),
            kind: 'owner-switch-gate',
            status: 'blocked-shadow-only',
            createdAt,
            updatedAt: createdAt,
            requestedOwner: evaluation.requestedOwner,
            effectiveOwner: evaluation.effectiveOwner,
            formalOwner: evaluation.formalOwner,
            cutoverGate: evaluation.cutoverGate,
            issues: evaluation.issues,
            previousOwnerState,
            ownerState: evaluation,
            formalPromptInjection: false,
            noDualInjection: true,
            writesLegacyMemory: false
        };
        const batch = {
            id: payload.batchId || nextId('owner-switch-batch'),
            kind: 'owner-switch-gate',
            status: 'applied-shadow-only',
            createdAt,
            updatedAt: createdAt,
            runId: run.id,
            requestedOwner: evaluation.requestedOwner,
            effectiveOwner: evaluation.effectiveOwner,
            formalOwner: evaluation.formalOwner,
            previousOwnerState,
            ownerState: evaluation,
            formalPromptInjection: false,
            noDualInjection: true,
            canApplyToPrompt: false,
            cutoverGate: evaluation.cutoverGate
        };
        state.ownerState = Object.assign({}, evaluation, { updatedAt: createdAt });
        state.ownerSwitchRuns = [run].concat(asArray(state.ownerSwitchRuns).filter(item => item && item.id !== run.id));
        state.lastOwnerSwitchRun = run;
        state.batches = [batch].concat(asArray(state.batches).filter(item => item && item.id !== batch.id));
        state.updatedAt = createdAt;
        save();
        return clone({ run, batch, ownerState: state.ownerState });
    }

    function rollbackOwnerSwitchBatch(batchId, options = {}) {
        const state = ensure(options);
        const batches = asArray(state.batches);
        const batch = batches.find(item => item && item.id === batchId && item.kind === 'owner-switch-gate');
        if (!batch) throw new Error('找不到可撤回的 owner 切换门批次');
        const now = nowIso();
        state.ownerState = getSemantics().normalizeOwnerState(batch.previousOwnerState);
        state.ownerState.updatedAt = now;
        state.batches = batches.map(item => item && item.id === batch.id ? Object.assign({}, item, { status: 'rolled-back', updatedAt: now }) : item);
        state.ownerSwitchRuns = asArray(state.ownerSwitchRuns).map(run => run && run.id === batch.runId ? Object.assign({}, run, { status: 'rolled-back', updatedAt: now }) : run);
        state.lastOwnerSwitchRun = state.ownerSwitchRuns[0] || null;
        state.updatedAt = now;
        save();
        return clone({ ok: true, ownerState: state.ownerState, batchId: batch.id });
    }

    function rollbackLatestOwnerSwitchBatch(options = {}) {
        const state = ensure(options);
        const batch = asArray(state.batches).find(item => item && item.kind === 'owner-switch-gate' && item.status !== 'rolled-back');
        if (!batch) throw new Error('没有可撤回的 owner 切换门批次');
        return rollbackOwnerSwitchBatch(batch.id, options);
    }

    function updateUiGroupOpen(groupId, open, options = {}) {
        const state = ensure(options);
        const ui = getUiSemantics();
        const prefs = ui.normalizeGroupPrefs(state.settings && state.settings.uiGroupsOpen);
        if (!Object.prototype.hasOwnProperty.call(prefs, groupId)) throw new Error('未知的记忆脑 UI 分组：' + groupId);
        prefs[groupId] = !!open;
        state.settings = state.settings || {};
        state.settings.uiGroupsOpen = prefs;
        state.updatedAt = nowIso();
        save();
        return clone(prefs);
    }

    function getUiGroupCards(options = {}) {
        const state = ensure(options);
        return getUiSemantics().buildGroupCards(state.settings && state.settings.uiGroupsOpen);
    }

    function getRoutingReport() {
        return { owner: 'platform/memoryBrain/memoryOwnerGateStore', release: 'v0.4.9', writes: ['memoryBrain.ownerState', 'memoryBrain.ownerSwitchRuns', 'memoryBrain.batches(kind=owner-switch-gate)', 'memoryBrain.settings.uiGroupsOpen'], formalPromptInjection: false, noDualInjection: true, blockedUntil: 'v0.9' };
    }

    platform.memoryOwnerGateStore = { getOwnerGateSnapshot, appendOwnerSwitchRun, rollbackOwnerSwitchBatch, rollbackLatestOwnerSwitchBatch, updateUiGroupOpen, getUiGroupCards, getRoutingReport };
})(window);
