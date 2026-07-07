// --- Memory Brain history model rebuild store owner (v0.4.7) ---
// 负责全历史长期模型重建运行记录；模型版本写入仍复用 memoryModelStore。
(function registerHistoryModelRebuildStore(global) {
    const app = global.OwoApp;
    const platform = app.platform.memoryBrain;
    if (!platform || !platform.memoryBrainStore) throw new Error('[historyModelRebuildStore] memoryBrainStore 尚未加载');
    function nowIso() { return new Date().toISOString(); }
    function nextId(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function ensureState(options) { return platform.memoryBrainStore.ensureState(options || {}); }
    function saveRootState() { return typeof platform.memoryBrainStore.saveRootState === 'function' ? platform.memoryBrainStore.saveRootState() : Promise.resolve(false); }
    function safeClone(value) { if (value === undefined) return undefined; if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value; try { return JSON.parse(JSON.stringify(value)); } catch (error) { return String(value); } }
    function appendHistoryModelRebuildRun(payload = {}, options = {}) {
        const state = ensureState(options);
        const createdAt = nowIso();
        const run = {
            id: payload.runId || nextId('history-model-rebuild-run'),
            status: payload.status || (payload.errorMessage ? 'error' : 'applied'),
            createdAt,
            updatedAt: createdAt,
            mode: state.settings && state.settings.mode || 'shadow',
            modelBatchId: payload.modelBatchId || '',
            modelIds: asArray(payload.modelIds),
            modelTypes: asArray(payload.modelTypes),
            evidenceSummary: safeClone(payload.evidenceSummary || {}),
            input: safeClone(payload.input || {}),
            diagnostics: asArray(payload.diagnostics),
            rawOutputLength: Number(payload.rawOutputLength) || 0,
            fallbackApplied: Boolean(payload.fallbackApplied),
            errorMessage: payload.errorMessage || ''
        };
        state.historyModelRebuildRuns = asArray(state.historyModelRebuildRuns);
        state.historyModelRebuildRuns.unshift(run);
        state.lastHistoryModelRebuildRun = run;
        state.updatedAt = createdAt;
        saveRootState();
        return safeClone({ run });
    }
    function listHistoryModelRebuildRuns(options = {}) {
        return asArray(ensureState(options).historyModelRebuildRuns).slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    }
    function getHistoryModelRebuildSnapshot(options = {}) {
        const state = ensureState(options);
        const semantics = app.core && app.core.memoryBrain && app.core.memoryBrain.historyModelRebuildSemantics;
        const evidence = semantics && typeof semantics.buildHistoryModelEvidence === 'function' ? semantics.buildHistoryModelEvidence(state, options) : { summary: {}, snapshot: {} };
        return safeClone({ runs: listHistoryModelRebuildRuns(options), batches: asArray(state.batches).filter(batch => batch && batch.kind === 'history-long-term-model'), evidenceSummary: evidence.summary || {}, activeModelCount: asArray(state.models).filter(model => model && model.status === 'active').length });
    }
    function rollbackHistoryModelRebuildRun(runId, options = {}) {
        const state = ensureState(options);
        const run = asArray(state.historyModelRebuildRuns).find(item => item && item.id === runId);
        if (!run) return { ok: false, reason: 'run_not_found' };
        const updatedAt = nowIso();
        let modelRollback = { ok: true, skipped: true };
        if (run.modelBatchId && platform.memoryModelStore && typeof platform.memoryModelStore.rollbackModelBatch === 'function') modelRollback = platform.memoryModelStore.rollbackModelBatch(run.modelBatchId, options);
        run.status = modelRollback.ok ? 'rolled-back' : 'rollback-failed';
        run.rollbackAt = updatedAt;
        run.updatedAt = updatedAt;
        run.rollbackResult = safeClone(modelRollback);
        state.updatedAt = updatedAt;
        saveRootState();
        return { ok: !!modelRollback.ok, runId, modelBatchId: run.modelBatchId || '', modelRollback };
    }
    function getRoutingReport() { return { owner: 'platform/memoryBrain/historyModelRebuildStore', release: 'v0.4.7', writes: ['memoryBrain.historyModelRebuildRuns', 'memoryBrain.models via memoryModelStore', 'memoryBrain.batches(kind=history-long-term-model)'], formalPromptInjection: false, legacyMode: 'read-only-source' }; }
    platform.historyModelRebuildStore = { appendHistoryModelRebuildRun, listHistoryModelRebuildRuns, getHistoryModelRebuildSnapshot, rollbackHistoryModelRebuildRun, getRoutingReport };
})(window);
