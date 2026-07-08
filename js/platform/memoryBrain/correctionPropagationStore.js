// --- Memory Brain correction propagation store owner (v0.5.5) ---
// 负责把事实/冲突/家族/模型修正影响传播到下游标记；只写 memoryBrain，不写旧记忆，不接正式 prompt。
(function registerMemoryBrainCorrectionPropagationStore(global) {
    const app = global.OwoApp;
    const platform = app.platform.memoryBrain;
    function nowIso() { return new Date().toISOString(); }
    function nextId(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; } }
    function ensure(options) { return platform.memoryBrainStore.ensureState(options || {}); }
    function save() { if (platform.memoryBrainStore.saveRootState) return platform.memoryBrainStore.saveRootState(); return Promise.resolve(false); }
    function core() { return app.core.memoryBrain.correctionPropagationSemantics; }
    function beforeById(list, ids) { const set = new Set(asArray(ids)); return asArray(list).filter(item => item && set.has(item.id)).map(clone); }
    function applyUpdates(list, updates, stamp) {
        const updateById = new Map(asArray(updates).map(update => [update.id, update]));
        return asArray(list).map(item => {
            if (!item || !updateById.has(item.id)) return item;
            const update = clone(updateById.get(item.id));
            delete update.id;
            return Object.assign({}, item, update, { propagationAt: stamp, updatedAt: stamp });
        });
    }
    function markSources(state, sourceIds, propagationId, batchId, stamp) {
        const mark = item => Object.assign({}, item, { propagationId, propagationBatchId: batchId, propagatedAt: stamp, updatedAt: stamp });
        const sets = {
            factCorrections: new Set(asArray(sourceIds && sourceIds.factCorrectionIds)),
            factConflictResolutions: new Set(asArray(sourceIds && sourceIds.conflictResolutionIds)),
            familyAdjustments: new Set(asArray(sourceIds && sourceIds.familyAdjustmentIds)),
            modelCorrections: new Set(asArray(sourceIds && sourceIds.modelCorrectionIds))
        };
        state.factCorrections = asArray(state.factCorrections).map(item => item && sets.factCorrections.has(item.id) ? mark(item) : item);
        state.factConflictResolutions = asArray(state.factConflictResolutions).map(item => item && sets.factConflictResolutions.has(item.id) ? mark(item) : item);
        state.familyAdjustments = asArray(state.familyAdjustments).map(item => item && sets.familyAdjustments.has(item.id) ? mark(item) : item);
        state.modelCorrections = asArray(state.modelCorrections).map(item => item && sets.modelCorrections.has(item.id) ? mark(item) : item);
    }
    function buildCorrectionPropagationPlan(options = {}) { return core().buildCorrectionPropagationPlan(ensure(options), options || {}); }
    function applyCorrectionPropagationPlan(plan, options = {}) {
        const state = ensure(options);
        if (!plan || !plan.ok) throw new Error(plan && plan.errorMessage || '纠错影响传播计划不可应用');
        const now = nowIso();
        const batchId = options.batchId || nextId('memory-brain-batch');
        const runId = options.runId || nextId('correction-propagation-run');
        const propagationId = options.propagationId || nextId('correction-propagation');
        const impact = plan.impact || {};
        const before = {
            facts: beforeById(state.facts, impact.factIds),
            families: beforeById(state.families, impact.familyIds),
            edges: beforeById(state.edges, impact.edgeIds),
            models: beforeById(state.models, impact.modelIds),
            reviewInboxItems: beforeById(state.reviewInboxItems, impact.reviewItemIds),
            factCorrections: beforeById(state.factCorrections, plan.impact && plan.impact.sourceIds && plan.impact.sourceIds.factCorrectionIds),
            factConflictResolutions: beforeById(state.factConflictResolutions, plan.impact && plan.impact.sourceIds && plan.impact.sourceIds.conflictResolutionIds),
            familyAdjustments: beforeById(state.familyAdjustments, plan.impact && plan.impact.sourceIds && plan.impact.sourceIds.familyAdjustmentIds),
            modelCorrections: beforeById(state.modelCorrections, plan.impact && plan.impact.sourceIds && plan.impact.sourceIds.modelCorrectionIds)
        };
        state.facts = applyUpdates(state.facts, plan.factUpdates, now);
        state.families = applyUpdates(state.families, plan.familyUpdates, now);
        state.edges = applyUpdates(state.edges, plan.edgeUpdates, now);
        state.models = applyUpdates(state.models, plan.modelUpdates, now);
        state.reviewInboxItems = applyUpdates(state.reviewInboxItems, plan.reviewItemUpdates, now);
        markSources(state, plan.impact && plan.impact.sourceIds, propagationId, batchId, now);
        const counts = {
            factCount: asArray(impact.factIds).length,
            familyCount: asArray(impact.familyIds).length,
            edgeCount: asArray(impact.edgeIds).length,
            modelCount: asArray(impact.modelIds).length,
            reviewItemCount: asArray(impact.reviewItemIds).length
        };
        const propagation = Object.assign({ id: propagationId, kind: 'correction-propagation', status: 'applied', createdAt: now, updatedAt: now, batchId, runId, reason: plan.reason, sourceIds: clone(impact.sourceIds || {}) }, counts, { formalPromptInjection: false, writesLegacyMemory: false });
        const run = Object.assign({ id: runId, kind: 'correction-propagation', status: 'applied', createdAt: now, updatedAt: now, propagationId, batchId, reason: plan.reason }, counts, { formalPromptInjection: false, writesLegacyMemory: false });
        const batch = Object.assign({ id: batchId, kind: 'correction-propagation', status: 'applied', createdAt: now, updatedAt: now, propagationId, runId, reason: plan.reason, impact: clone(impact), updates: { facts: clone(plan.factUpdates), families: clone(plan.familyUpdates), edges: clone(plan.edgeUpdates), models: clone(plan.modelUpdates), reviewInboxItems: clone(plan.reviewItemUpdates) }, before, formalPromptInjection: false, writesLegacyMemory: false }, counts);
        state.correctionPropagations = [propagation].concat(asArray(state.correctionPropagations).filter(item => item && item.id !== propagation.id));
        state.correctionPropagationRuns = [run].concat(asArray(state.correctionPropagationRuns).filter(item => item && item.id !== run.id));
        state.lastCorrectionPropagationRun = run;
        state.batches = [batch].concat(asArray(state.batches).filter(item => item && item.id !== batch.id));
        state.updatedAt = now;
        save();
        return clone({ propagation, run, batch, impact, counts });
    }
    function restoreList(list, beforeItems) {
        const beforeByIdMap = new Map(asArray(beforeItems).map(item => [item && item.id, item]).filter(pair => pair[0]));
        const seen = new Set();
        const restored = asArray(list).map(item => {
            if (!item || !beforeByIdMap.has(item.id)) return item;
            seen.add(item.id);
            return clone(beforeByIdMap.get(item.id));
        });
        beforeByIdMap.forEach((item, id) => { if (!seen.has(id)) restored.unshift(clone(item)); });
        return restored;
    }
    function rollbackCorrectionPropagationBatch(batchId, options = {}) {
        const state = ensure(options);
        const batch = asArray(state.batches).find(item => item && item.id === batchId && item.kind === 'correction-propagation');
        if (!batch) throw new Error('找不到可撤回的纠错影响传播批次');
        const now = nowIso();
        const before = batch.before || {};
        state.facts = restoreList(state.facts, before.facts);
        state.families = restoreList(state.families, before.families);
        state.edges = restoreList(state.edges, before.edges);
        state.models = restoreList(state.models, before.models);
        state.reviewInboxItems = restoreList(state.reviewInboxItems, before.reviewInboxItems);
        state.factCorrections = restoreList(state.factCorrections, before.factCorrections);
        state.factConflictResolutions = restoreList(state.factConflictResolutions, before.factConflictResolutions);
        state.familyAdjustments = restoreList(state.familyAdjustments, before.familyAdjustments);
        state.modelCorrections = restoreList(state.modelCorrections, before.modelCorrections);
        state.correctionPropagations = asArray(state.correctionPropagations).map(item => item && item.id === batch.propagationId ? Object.assign({}, item, { status: 'rolled-back', rollbackAt: now, updatedAt: now }) : item);
        state.correctionPropagationRuns = asArray(state.correctionPropagationRuns).map(item => item && item.id === batch.runId ? Object.assign({}, item, { status: 'rolled-back', rollbackAt: now, updatedAt: now }) : item);
        state.batches = asArray(state.batches).map(item => item && item.id === batch.id ? Object.assign({}, item, { status: 'rolled-back', rollbackAt: now, updatedAt: now }) : item);
        state.lastCorrectionPropagationRun = state.correctionPropagationRuns[0] || null;
        state.updatedAt = now;
        save();
        return clone({ ok: true, batchId, propagationId: batch.propagationId, factCount: batch.factCount || 0, familyCount: batch.familyCount || 0, edgeCount: batch.edgeCount || 0, modelCount: batch.modelCount || 0, reviewItemCount: batch.reviewItemCount || 0 });
    }
    function getCorrectionPropagationSnapshot(options = {}) {
        const state = ensure(options);
        const plan = core().buildCorrectionPropagationPlan(state, options || {});
        return clone({ plan, correctionPropagations: asArray(state.correctionPropagations), correctionPropagationRuns: asArray(state.correctionPropagationRuns).slice(0, 20), batches: asArray(state.batches).filter(batch => batch && batch.kind === 'correction-propagation').slice(0, 20), lastCorrectionPropagationRun: state.lastCorrectionPropagationRun || null });
    }
    function getRoutingReport() { return { owner: 'platform/memoryBrain/correctionPropagationStore', release: 'v0.5.5', writes: ['memoryBrain.facts propagation fields', 'memoryBrain.families propagation fields', 'memoryBrain.edges validationStatus', 'memoryBrain.models propagation fields', 'memoryBrain.reviewInboxItems propagation fields', 'memoryBrain.correctionPropagations', 'memoryBrain.correctionPropagationRuns', 'memoryBrain.batches(kind=correction-propagation)'], formalPromptInjection: false, writesLegacyMemory: false }; }
    platform.correctionPropagationStore = { buildCorrectionPropagationPlan, applyCorrectionPropagationPlan, rollbackCorrectionPropagationBatch, getCorrectionPropagationSnapshot, getRoutingReport };
})(window);
