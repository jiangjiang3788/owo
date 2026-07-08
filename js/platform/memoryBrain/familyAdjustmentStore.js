// --- Memory Brain family adjustment store owner (v0.5.3) ---
// 负责家族合并 / 拆分 / 改名写入与回滚；不渲染 UI，不请求 AI，不接正式 prompt。
(function registerMemoryBrainFamilyAdjustmentStore(global) {
    const app = global.OwoApp;
    const platform = app.platform.memoryBrain;
    if (!platform || !platform.memoryBrainStore) throw new Error('[familyAdjustmentStore] memoryBrainStore 尚未加载');

    function nowIso() { return new Date().toISOString(); }
    function nextId(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function ensureState(options) { return platform.memoryBrainStore.ensureState(options || {}); }
    function saveRootState() { return typeof platform.memoryBrainStore.saveRootState === 'function' ? platform.memoryBrainStore.saveRootState() : Promise.resolve(false); }
    function safeClone(value) { if (value === undefined) return undefined; try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; } }
    function unique(list) { const seen = new Set(); return asArray(list).map(item => String(item || '').trim()).filter(Boolean).filter(item => { if (seen.has(item)) return false; seen.add(item); return true; }); }
    function findFamily(state, id) { return asArray(state.families).find(family => family && family.id === id) || null; }
    function findFact(state, id) { return asArray(state.facts).find(fact => fact && fact.id === id) || null; }
    function getCore() { return app.core.memoryBrain.publicApi; }
    function rememberFacts(state, factIds) {
        const before = {};
        unique(factIds).forEach(id => {
            const fact = findFact(state, id);
            if (fact) before[id] = { familyIds: asArray(fact.familyIds), updatedAt: fact.updatedAt || '' };
        });
        return before;
    }
    function rememberFamilies(state, familyIds) {
        const before = {};
        unique(familyIds).forEach(id => { const family = findFamily(state, id); if (family) before[id] = safeClone(family); });
        return before;
    }
    function upsertFamily(state, family) {
        state.families = asArray(state.families).filter(item => item && item.id !== family.id);
        state.families.unshift(family);
    }
    function applyFactFamilyUpdate(state, update, familyIdMap, updatedAt) {
        const fact = findFact(state, update && update.factId);
        if (!fact) return false;
        const replaceIds = new Set(asArray(update.replaceFamilyIds));
        const addId = familyIdMap[update.addFamilyId] || update.addFamilyId;
        fact.familyIds = unique(asArray(fact.familyIds).filter(id => !replaceIds.has(id)).concat([addId]));
        fact.familyAdjustedAt = updatedAt;
        fact.updatedAt = updatedAt;
        return true;
    }
    function normalizeFamily(family, batchId, updatedAt) {
        return Object.assign({}, family, {
            kind: 'memory-family', layer: 'family', mode: family.mode || 'shadow',
            lastAdjustmentBatchId: batchId,
            updatedAt,
            createdAt: family.createdAt || updatedAt
        });
    }
    function applyFamilyAdjustmentPlan(plan = {}, options = {}) {
        const state = ensureState(options);
        if (!plan || !plan.ok) throw new Error(plan && plan.errorMessage || 'family adjustment plan invalid');
        const updatedAt = nowIso();
        const batchId = options.batchId || plan.batchId || nextId('memory-brain-batch');
        const action = plan.action || 'merge';
        const familyIds = unique(plan.familyIds || []);
        const factIds = unique(plan.factIds || plan.splitFactIds || []);
        const beforeFamilies = rememberFamilies(state, familyIds);
        const beforeFactFamilyIds = rememberFacts(state, factIds.concat(asArray(plan.factUpdates).map(item => item && item.factId)));
        const familyIdMap = { '__NEW_FAMILY_ID__': '' };
        let newFamilyId = '';
        let changedFacts = 0;
        if (action === 'split') {
            newFamilyId = plan.newFamilyDraft && plan.newFamilyDraft.id || nextId('memory-family');
            familyIdMap.__NEW_FAMILY_ID__ = newFamilyId;
            const source = normalizeFamily(Object.assign({}, plan.sourceAfter || {}, { updatedAt }), batchId, updatedAt);
            const newFamily = normalizeFamily(Object.assign({}, plan.newFamilyDraft || {}, { id: newFamilyId, status: 'active', familyAdjustmentStatus: 'split-new', splitFromFamilyId: plan.sourceFamilyId || '', adjustmentReason: plan.reason || '', createdAt: updatedAt, updatedAt }), batchId, updatedAt);
            upsertFamily(state, source);
            upsertFamily(state, newFamily);
            asArray(plan.factUpdates).forEach(update => { if (applyFactFamilyUpdate(state, update, familyIdMap, updatedAt)) changedFacts += 1; });
            familyIds.push(newFamilyId);
        } else {
            asArray(plan.afterFamilies).forEach(family => upsertFamily(state, normalizeFamily(family, batchId, updatedAt)));
            asArray(plan.factUpdates).forEach(update => { if (applyFactFamilyUpdate(state, update, familyIdMap, updatedAt)) changedFacts += 1; });
        }
        const adjustment = {
            id: nextId('family-adjustment'),
            action,
            status: 'applied',
            createdAt: updatedAt,
            updatedAt,
            batchId,
            familyIds: unique(familyIds),
            factIds: unique(Object.keys(beforeFactFamilyIds)),
            primaryFamilyId: plan.primaryFamilyId || plan.sourceFamilyId || (familyIds[0] || ''),
            newFamilyId,
            reason: plan.reason || '人工调整记忆家族',
            formalPromptInjection: false,
            writesLegacyMemory: false
        };
        const run = { id: nextId('family-adjustment-run'), status: 'applied', action, createdAt: updatedAt, updatedAt, batchId, familyIds: adjustment.familyIds, factIds: adjustment.factIds, newFamilyId, reason: adjustment.reason };
        const batch = {
            id: batchId,
            kind: 'family-adjustment',
            status: 'applied',
            createdAt: updatedAt,
            updatedAt,
            mode: state.settings && state.settings.mode || 'shadow',
            action,
            familyIds: adjustment.familyIds,
            factIds: adjustment.factIds,
            primaryFamilyId: adjustment.primaryFamilyId,
            newFamilyId,
            beforeFamilies,
            beforeFactFamilyIds,
            plan: safeClone(plan),
            adjustmentId: adjustment.id,
            runId: run.id,
            reason: adjustment.reason,
            formalPromptInjection: false,
            writesLegacyMemory: false
        };
        state.familyAdjustments = asArray(state.familyAdjustments).filter(item => item && item.id !== adjustment.id);
        state.familyAdjustments.unshift(adjustment);
        state.familyAdjustmentRuns = asArray(state.familyAdjustmentRuns).filter(item => item && item.id !== run.id);
        state.familyAdjustmentRuns.unshift(run);
        state.lastFamilyAdjustmentRun = run;
        state.batches = asArray(state.batches).filter(item => item && item.id !== batch.id);
        state.batches.unshift(batch);
        state.updatedAt = updatedAt;
        saveRootState();
        return safeClone({ adjustment, run, batch, changedFacts, familyCount: adjustment.familyIds.length, factCount: adjustment.factIds.length });
    }
    function rollbackFamilyAdjustmentBatch(batchId, options = {}) {
        const state = ensureState(options);
        const batch = asArray(state.batches).find(item => item && item.id === batchId);
        if (!batch || batch.kind !== 'family-adjustment') return { ok: false, reason: 'batch_not_found_or_not_family_adjustment' };
        const updatedAt = nowIso();
        const beforeFamilies = batch.beforeFamilies || {};
        const beforeFactFamilyIds = batch.beforeFactFamilyIds || {};
        asArray(batch.familyIds).forEach(id => { state.families = asArray(state.families).filter(family => family && family.id !== id); });
        Object.keys(beforeFamilies).forEach(id => upsertFamily(state, Object.assign({}, beforeFamilies[id], { updatedAt })));
        asArray(state.facts).forEach(fact => {
            if (!fact || !Object.prototype.hasOwnProperty.call(beforeFactFamilyIds, fact.id)) return;
            fact.familyIds = asArray(beforeFactFamilyIds[fact.id].familyIds);
            fact.updatedAt = updatedAt;
        });
        asArray(state.familyAdjustments).forEach(item => { if (item && item.id === batch.adjustmentId) { item.status = 'rolled-back'; item.rollbackAt = updatedAt; item.updatedAt = updatedAt; } });
        asArray(state.familyAdjustmentRuns).forEach(run => { if (run && run.id === batch.runId) { run.status = 'rolled-back'; run.rollbackAt = updatedAt; run.updatedAt = updatedAt; } });
        batch.status = 'rolled-back'; batch.rollbackAt = updatedAt; batch.updatedAt = updatedAt;
        state.updatedAt = updatedAt;
        saveRootState();
        return { ok: true, batchId, familyCount: asArray(batch.familyIds).length, factCount: Object.keys(beforeFactFamilyIds).length };
    }
    function getFamilyAdjustmentSnapshot(options = {}) {
        const state = ensureState(options);
        const snapshot = safeClone(state);
        const candidates = getCore().collectFamilyAdjustmentCandidates(snapshot, options);
        return safeClone({
            candidates,
            familyAdjustments: asArray(state.familyAdjustments).slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))),
            familyAdjustmentRuns: asArray(state.familyAdjustmentRuns).slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))),
            batches: asArray(state.batches).filter(batch => batch && batch.kind === 'family-adjustment'),
            families: asArray(state.families).filter(family => family && family.status !== 'retired'),
            facts: asArray(state.facts).filter(fact => fact && fact.status !== 'retired')
        });
    }
    function buildFamilyAdjustmentPlan(options = {}) { return getCore().buildFamilyAdjustmentPlan(ensureState(options), options || {}); }
    function getRoutingReport() { return { owner: 'platform/memoryBrain/familyAdjustmentStore', release: 'v0.5.3', writes: ['memoryBrain.families', 'memoryBrain.facts.familyIds', 'memoryBrain.familyAdjustments', 'memoryBrain.familyAdjustmentRuns', 'memoryBrain.batches(kind=family-adjustment)'], legacyMode: 'read-only-source', formalPromptInjection: false, writesLegacyMemory: false }; }

    platform.familyAdjustmentStore = { buildFamilyAdjustmentPlan, applyFamilyAdjustmentPlan, rollbackFamilyAdjustmentBatch, getFamilyAdjustmentSnapshot, getRoutingReport };
})(window);
