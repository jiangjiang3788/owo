// --- Memory Brain fact lifecycle store owner (v0.4.5) ---
// 应用事实去重 / 冲突 / 过时状态；只写 memoryBrain.*，可回滚，不改旧记忆系统。
(function registerFactLifecycleStore(global) {
    const app = global.OwoApp;
    const platform = app.platform.memoryBrain;
    if (!platform || !platform.memoryBrainStore) throw new Error('[factLifecycleStore] memoryBrainStore 尚未加载');

    function ensureState(options) { return platform.memoryBrainStore.ensureState(options || {}); }
    function saveRootState() { return typeof platform.memoryBrainStore.saveRootState === 'function' ? platform.memoryBrainStore.saveRootState() : Promise.resolve(false); }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; } }
    function nowIso() { return new Date().toISOString(); }
    function nextId(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
    function coreLifecycle() { return app.core && app.core.memoryBrain && app.core.memoryBrain.factLifecycleSemantics; }

    function buildFactLifecyclePlan(options = {}) {
        const state = ensureState(options);
        return coreLifecycle().buildFactLifecyclePlan(asArray(state.facts), options || {});
    }
    function applyFactLifecyclePlan(plan, options = {}) {
        const state = ensureState(options);
        const createdAt = nowIso();
        const batchId = options.batchId || nextId('memory-brain-batch');
        const updates = asArray(plan && plan.updates);
        const ids = new Set(updates.map(item => item && item.id).filter(Boolean));
        const beforeFacts = clone(asArray(state.facts).filter(fact => ids.has(fact && fact.id)));
        const updateById = new Map(updates.map(item => [item.id, item]));
        state.facts = asArray(state.facts).map(fact => {
            const update = updateById.get(fact && fact.id);
            if (!update) return fact;
            return Object.assign({}, fact, update, {
                updatedAt: createdAt,
                lifecycleBatchId: batchId,
                lifecycleUpdatedAt: createdAt
            });
        });
        const factMerges = asArray(plan && plan.duplicateGroups).map(group => Object.assign({}, group, { id: nextId('fact-merge'), type: 'duplicate', batchId, createdAt }));
        const conflicts = asArray(plan && plan.conflictPairs).map(pair => Object.assign({}, pair, { id: pair.id || nextId('fact-conflict'), type: 'disputed', batchId, createdAt, status: 'open' }));
        const obsoleteFacts = asArray(plan && plan.obsoletePairs).map(pair => Object.assign({}, pair, { id: nextId('fact-obsolete'), type: 'obsolete', batchId, createdAt }));
        state.factMerges = factMerges.concat(asArray(state.factMerges));
        state.conflicts = conflicts.concat(asArray(state.conflicts));
        state.obsoleteFacts = obsoleteFacts.concat(asArray(state.obsoleteFacts));
        const run = {
            id: nextId('fact-lifecycle-run'),
            kind: 'fact-lifecycle',
            status: updates.length ? 'completed' : 'clean',
            createdAt, updatedAt: createdAt,
            factCount: plan && plan.inputCount || 0,
            updateCount: updates.length,
            duplicateCount: updates.filter(item => item.status === 'duplicate').length,
            obsoleteCount: updates.filter(item => item.status === 'obsolete').length,
            disputedCount: updates.filter(item => item.status === 'disputed').length,
            mode: state.settings && state.settings.mode || 'shadow',
            formalPromptInjection: false,
            writesLegacyMemory: false
        };
        const batch = {
            id: batchId,
            kind: 'fact-lifecycle',
            status: updates.length ? 'applied' : 'skipped',
            createdAt, updatedAt: createdAt,
            mode: state.settings && state.settings.mode || 'shadow',
            runId: run.id,
            factIds: Array.from(ids),
            beforeFacts,
            updates: clone(updates),
            duplicateGroups: clone(plan && plan.duplicateGroups || []),
            conflictPairs: clone(plan && plan.conflictPairs || []),
            obsoletePairs: clone(plan && plan.obsoletePairs || []),
            factMergeIds: factMerges.map(item => item.id),
            conflictIds: conflicts.map(item => item.id),
            obsoleteFactRecordIds: obsoleteFacts.map(item => item.id),
            formalPromptInjection: false,
            writesLegacyMemory: false
        };
        state.factLifecycleRuns = [run].concat(asArray(state.factLifecycleRuns));
        state.batches = [batch].concat(asArray(state.batches).filter(item => item && item.id !== batch.id));
        state.updatedAt = createdAt;
        saveRootState();
        return clone({ run, batch, updates, factMerges, conflicts, obsoleteFacts });
    }
    function rollbackFactLifecycleBatch(batchId, options = {}) {
        const state = ensureState(options);
        const batch = asArray(state.batches).find(item => item && item.id === batchId && item.kind === 'fact-lifecycle');
        if (!batch) return { ok: false, reason: 'batch_not_found' };
        const beforeMap = new Map(asArray(batch.beforeFacts).map(fact => [fact && fact.id, fact]));
        state.facts = asArray(state.facts).map(fact => beforeMap.get(fact && fact.id) || fact);
        const mergeIds = new Set(asArray(batch.factMergeIds));
        const conflictIds = new Set(asArray(batch.conflictIds));
        const obsoleteIds = new Set(asArray(batch.obsoleteFactRecordIds));
        state.factMerges = asArray(state.factMerges).filter(item => !mergeIds.has(item && item.id));
        state.conflicts = asArray(state.conflicts).filter(item => !conflictIds.has(item && item.id));
        state.obsoleteFacts = asArray(state.obsoleteFacts).filter(item => !obsoleteIds.has(item && item.id));
        const updatedAt = nowIso();
        state.factLifecycleRuns = asArray(state.factLifecycleRuns).map(run => run && run.id === batch.runId ? Object.assign({}, run, { status: 'rolled-back', rolledBackAt: updatedAt }) : run);
        state.batches = asArray(state.batches).map(item => item && item.id === batch.id ? Object.assign({}, item, { status: 'rolled-back', rolledBackAt: updatedAt, updatedAt }) : item);
        state.updatedAt = updatedAt;
        saveRootState();
        return { ok: true, batchId: batch.id, restoredFacts: beforeMap.size };
    }
    function listFactLifecycleRuns(options = {}) { return asArray(ensureState(options).factLifecycleRuns).slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).map(clone); }
    function getFactLifecycleSnapshot(options = {}) {
        const state = ensureState(options);
        return clone({ factLifecycleRuns: asArray(state.factLifecycleRuns), factMerges: asArray(state.factMerges), conflicts: asArray(state.conflicts), obsoleteFacts: asArray(state.obsoleteFacts), batches: asArray(state.batches).filter(batch => batch && batch.kind === 'fact-lifecycle') });
    }
    function getRoutingReport() { return { owner: 'platform/memoryBrain/factLifecycleStore', release: 'v0.4.5', writes: ['memoryBrain.facts.lifecycle fields', 'memoryBrain.factMerges', 'memoryBrain.conflicts', 'memoryBrain.obsoleteFacts', 'memoryBrain.factLifecycleRuns', 'memoryBrain.batches(kind=fact-lifecycle)'], noLegacyMutation: true, formalPromptInjection: false }; }

    platform.factLifecycleStore = { buildFactLifecyclePlan, applyFactLifecyclePlan, rollbackFactLifecycleBatch, listFactLifecycleRuns, getFactLifecycleSnapshot, getRoutingReport };
})(window);
