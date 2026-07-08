// --- Memory Brain fact conflict store owner (v0.5.2) ---
// 负责冲突事实处理记录、facts 状态更新和回滚；只写 memoryBrain，不写旧记忆，不接正式 prompt。
(function registerMemoryBrainFactConflictStore(global) {
    const app = global.OwoApp;
    const platform = app.platform.memoryBrain;
    function nowIso() { return new Date().toISOString(); }
    function nextId(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; } }
    function ensure(options) { return platform.memoryBrainStore.ensureState(options || {}); }
    function save() { return platform.memoryBrainStore.saveRootState ? platform.memoryBrainStore.saveRootState() : Promise.resolve(false); }
    function core() { return app.core.memoryBrain.conflictResolutionSemantics; }

    function buildConflictResolutionPlan(options = {}) {
        const state = ensure(options);
        return core().buildConflictResolutionPlan(state, options || {});
    }
    function applyConflictResolutionPlan(plan, options = {}) {
        const state = ensure(options);
        if (!plan || !plan.ok) throw new Error(plan && plan.errorMessage || '冲突处理计划不可应用');
        const now = nowIso();
        const batchId = options.batchId || nextId('memory-brain-batch');
        const runId = options.runId || nextId('fact-conflict-run');
        const resolutionId = options.resolutionId || nextId('fact-conflict-resolution');
        const updateById = new Map(asArray(plan.updates).map(update => [update.id, update]));
        state.facts = asArray(state.facts).map(fact => {
            const update = updateById.get(fact && fact.id);
            if (!update) return fact;
            return Object.assign({}, fact, update, {
                updatedAt: now,
                conflictResolvedAt: now,
                conflictResolutionBatchId: batchId,
                conflictResolutionRunId: runId,
                conflictResolutionId: resolutionId
            });
        });
        let conflictMatched = false;
        state.conflicts = asArray(state.conflicts).map(conflict => {
            if (!conflict || conflict.id !== plan.conflictId) return conflict;
            conflictMatched = true;
            return Object.assign({}, conflict, plan.conflictAfter, { updatedAt: now, resolvedAt: now, batchId: conflict.batchId || batchId, resolutionBatchId: batchId, resolutionId });
        });
        if (!conflictMatched && plan.conflictAfter && plan.conflictAfter.id) {
            state.conflicts = [Object.assign({}, plan.conflictAfter, { createdAt: now, updatedAt: now, resolvedAt: now, resolutionBatchId: batchId, resolutionId })].concat(asArray(state.conflicts));
        }
        const affectedReviewItems = [];
        const factIdSet = new Set(asArray(plan.factIds));
        state.reviewInboxItems = asArray(state.reviewInboxItems).map(item => {
            if (!item || item.targetType !== 'fact' || !factIdSet.has(item.targetId) || item.status === 'dismissed' || item.status === 'confirmed') return item;
            affectedReviewItems.push(clone(item));
            return Object.assign({}, item, { status: 'resolved-conflict', resolvedAt: now, updatedAt: now, resolutionId, resolutionBatchId: batchId });
        });
        const resolution = { id: resolutionId, kind: 'fact-conflict-resolution', status: 'applied', conflictId: plan.conflictId, action: plan.action, factIds: asArray(plan.factIds), reason: plan.resolutionReason || '', createdAt: now, updatedAt: now, batchId, runId, formalPromptInjection: false, writesLegacyMemory: false };
        const run = { id: runId, kind: 'fact-conflict-resolution', status: 'applied', conflictId: plan.conflictId, action: plan.action, factCount: asArray(plan.factIds).length, resolutionId, batchId, createdAt: now, updatedAt: now, formalPromptInjection: false, writesLegacyMemory: false };
        const batch = { id: batchId, kind: 'fact-conflict-resolution', status: 'applied', conflictId: plan.conflictId, action: plan.action, factIds: asArray(plan.factIds), resolutionId, runId, createdAt: now, updatedAt: now, beforeFacts: clone(plan.beforeFacts), updates: clone(plan.updates), conflictBefore: clone(plan.conflictBefore), conflictAfter: clone(plan.conflictAfter), affectedReviewItems, formalPromptInjection: false, writesLegacyMemory: false };
        state.factConflictResolutions = [resolution].concat(asArray(state.factConflictResolutions).filter(item => item && item.id !== resolution.id));
        state.factConflictRuns = [run].concat(asArray(state.factConflictRuns).filter(item => item && item.id !== run.id));
        state.lastFactConflictRun = run;
        state.batches = [batch].concat(asArray(state.batches).filter(item => item && item.id !== batch.id));
        state.updatedAt = now;
        save();
        return clone({ resolution, run, batch, factCount: asArray(plan.factIds).length });
    }
    function rollbackConflictResolutionBatch(batchId, options = {}) {
        const state = ensure(options);
        const batch = asArray(state.batches).find(item => item && item.id === batchId && item.kind === 'fact-conflict-resolution');
        if (!batch) throw new Error('找不到可撤回的冲突处理批次');
        const now = nowIso();
        const beforeMap = new Map(asArray(batch.beforeFacts).map(fact => [fact && fact.id, fact]).filter(pair => pair[0]));
        state.facts = asArray(state.facts).map(fact => beforeMap.get(fact && fact.id) ? Object.assign({}, beforeMap.get(fact.id), { updatedAt: now }) : fact);
        if (batch.conflictBefore && batch.conflictBefore.id) {
            let restored = false;
            state.conflicts = asArray(state.conflicts).map(conflict => {
                if (!conflict || conflict.id !== batch.conflictBefore.id) return conflict;
                restored = true;
                return Object.assign({}, batch.conflictBefore, { updatedAt: now });
            });
            if (!restored) state.conflicts.unshift(Object.assign({}, batch.conflictBefore, { updatedAt: now }));
        }
        const reviewMap = new Map(asArray(batch.affectedReviewItems).map(item => [item && item.id, item]).filter(pair => pair[0]));
        if (reviewMap.size) state.reviewInboxItems = asArray(state.reviewInboxItems).map(item => reviewMap.get(item && item.id) || item);
        state.factConflictResolutions = asArray(state.factConflictResolutions).map(item => item && item.id === batch.resolutionId ? Object.assign({}, item, { status: 'rolled-back', updatedAt: now }) : item);
        state.factConflictRuns = asArray(state.factConflictRuns).map(run => run && run.id === batch.runId ? Object.assign({}, run, { status: 'rolled-back', updatedAt: now }) : run);
        state.batches = asArray(state.batches).map(item => item && item.id === batch.id ? Object.assign({}, item, { status: 'rolled-back', updatedAt: now, rolledBackAt: now }) : item);
        state.lastFactConflictRun = state.factConflictRuns[0] || null;
        state.updatedAt = now;
        save();
        return clone({ ok: true, batchId: batch.id, conflictId: batch.conflictId, restoredFacts: beforeMap.size });
    }
    function getFactConflictSnapshot(options = {}) {
        const state = ensure(options);
        const groups = core().collectConflictGroups(state).map(core().compactConflictGroupForList);
        return clone({ facts: asArray(state.facts), conflicts: asArray(state.conflicts), conflictGroups: groups, factConflictResolutions: asArray(state.factConflictResolutions), factConflictRuns: asArray(state.factConflictRuns).slice(0, 20), batches: asArray(state.batches).filter(batch => batch && batch.kind === 'fact-conflict-resolution').slice(0, 20), lastFactConflictRun: state.lastFactConflictRun || null });
    }
    function getRoutingReport() { return { owner: 'platform/memoryBrain/factConflictStore', release: 'v0.5.2', writes: ['memoryBrain.facts conflict resolution fields', 'memoryBrain.conflicts status', 'memoryBrain.factConflictResolutions', 'memoryBrain.factConflictRuns', 'memoryBrain.batches(kind=fact-conflict-resolution)', 'memoryBrain.reviewInboxItems status'], formalPromptInjection: false, writesLegacyMemory: false }; }
    platform.factConflictStore = { buildConflictResolutionPlan, applyConflictResolutionPlan, rollbackConflictResolutionBatch, getFactConflictSnapshot, getRoutingReport };
})(window);
