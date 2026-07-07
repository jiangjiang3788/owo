// --- Memory Brain family store owner (v0.3.5) ---
// 负责记忆家族和 family-clustering batch 写入/撤回；不渲染 UI、不做 graph、不接 prompt 注入。
(function registerMemoryBrainFamilyStore(global) {
    const app = global.OwoApp;
    const platform = app.platform.memoryBrain;
    if (!platform || !platform.memoryBrainStore) throw new Error('[memoryFamilyStore] memoryBrainStore 尚未加载');

    function nowIso() { return new Date().toISOString(); }
    function nextId(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function ensureState(options) { return platform.memoryBrainStore.ensureState(options || {}); }
    function saveRootState() {
        if (typeof platform.memoryBrainStore.saveRootState === 'function') return platform.memoryBrainStore.saveRootState();
        return Promise.resolve(false);
    }
    function safeClone(value) {
        if (value === undefined) return undefined;
        if (value === null) return null;
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
        try { return JSON.parse(JSON.stringify(value)); } catch (error) { return String(value); }
    }
    function clipText(value, max) {
        const text = String(value == null ? '' : value);
        return text.length > max ? text.slice(0, max) + `\n… truncated ${text.length - max} chars` : text;
    }
    function listFamilies(options = {}) {
        return asArray(ensureState(options).families).slice().sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
    }
    function unique(list) {
        const seen = new Set();
        return asArray(list).filter(Boolean).filter(item => {
            const key = String(item);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }
    function mergeTextList(left, right, max) { return unique(asArray(left).concat(asArray(right))).slice(0, max || 18); }
    function findFamily(state, id) { return asArray(state.families).find(family => family && family.id === id) || null; }
    function rememberBeforeFactIds(state, factIds) {
        const ids = new Set(asArray(factIds));
        const before = {};
        asArray(state.facts).forEach(fact => {
            if (fact && ids.has(fact.id)) before[fact.id] = asArray(fact.familyIds);
        });
        return before;
    }
    function normalizeFamilyFromDraft(draft, existing, batchId, createdAt, state) {
        const factIds = unique(asArray(existing && existing.factIds).concat(asArray(draft.factIds)));
        return Object.assign({}, safeClone(existing || {}), {
            id: existing && existing.id || draft.familyId || nextId('memory-family'),
            layer: 'family', kind: 'memory-family', status: 'active',
            mode: state.settings && state.settings.mode || 'shadow',
            title: draft.title || existing && existing.title || '新的记忆家族',
            summary: draft.summary || existing && existing.summary || '',
            labels: mergeTextList(existing && existing.labels, draft.labels, 16),
            keywords: mergeTextList(existing && existing.keywords, draft.keywords, 18),
            memoryTone: draft.memoryTone || existing && existing.memoryTone || '',
            sourceReason: draft.sourceReason || existing && existing.sourceReason || '',
            factIds,
            confidence: draft.confidence || existing && existing.confidence || 0.7,
            lastBatchId: batchId,
            createdAt: existing && existing.createdAt || createdAt,
            updatedAt: createdAt
        });
    }
    function applyFactMembership(state, factIds, familyId, updatedAt) {
        const ids = new Set(asArray(factIds));
        let changed = 0;
        asArray(state.facts).forEach(fact => {
            if (!fact || !ids.has(fact.id)) return;
            fact.familyIds = unique(asArray(fact.familyIds).concat([familyId]));
            fact.familyUpdatedAt = updatedAt;
            fact.updatedAt = updatedAt;
            changed += 1;
        });
        return changed;
    }
    function appendFamilyClusteringBatch(payload = {}, options = {}) {
        const state = ensureState(options);
        const createdAt = nowIso();
        const batchId = payload.batchId || nextId('memory-brain-batch');
        const drafts = asArray(payload.families || payload.drafts).filter(draft => draft && asArray(draft.factIds).length);
        const beforeFamilies = {};
        const touchedFactIds = unique(drafts.flatMap(draft => draft.factIds));
        const beforeFactFamilyIds = rememberBeforeFactIds(state, touchedFactIds);
        const familyIds = [];
        let changedFacts = 0;
        drafts.forEach(draft => {
            const existing = draft.familyId ? findFamily(state, draft.familyId) : null;
            if (existing) beforeFamilies[existing.id] = safeClone(existing);
            const family = normalizeFamilyFromDraft(draft, existing, batchId, createdAt, state);
            state.families = asArray(state.families).filter(item => item && item.id !== family.id);
            state.families.unshift(family);
            familyIds.push(family.id);
            changedFacts += applyFactMembership(state, draft.factIds, family.id, createdAt);
        });
        const batch = {
            id: batchId,
            kind: 'family-clustering',
            status: drafts.length ? 'applied' : (payload.errorMessage ? 'error' : 'skipped'),
            createdAt, updatedAt: createdAt,
            mode: state.settings && state.settings.mode || 'shadow',
            input: safeClone(payload.input || {}),
            rawOutput: clipText(payload.rawOutput, 16000),
            parsedDrafts: safeClone(payload.parsedDrafts || []),
            parserDiagnostics: asArray(payload.parserDiagnostics),
            familyIds,
            factIds: touchedFactIds,
            beforeFamilies,
            beforeFactFamilyIds,
            errorMessage: payload.errorMessage || ''
        };
        state.batches = asArray(state.batches).filter(item => item && item.id !== batch.id);
        state.batches.unshift(batch);
        state.updatedAt = createdAt;
        saveRootState();
        return safeClone({ batch, families: familyIds.map(id => findFamily(state, id)).filter(Boolean), changedFacts });
    }
    function rollbackFamilyBatch(batchId, options = {}) {
        const state = ensureState(options);
        const batch = asArray(state.batches).find(item => item && item.id === batchId);
        if (!batch || batch.kind !== 'family-clustering') return { ok: false, reason: 'batch_not_found_or_not_family_clustering' };
        const updatedAt = nowIso();
        const beforeFamilies = batch.beforeFamilies || {};
        const beforeFactFamilyIds = batch.beforeFactFamilyIds || {};
        asArray(batch.familyIds).forEach(id => {
            const before = beforeFamilies[id];
            const current = findFamily(state, id);
            state.families = asArray(state.families).filter(item => item && item.id !== id);
            if (before) state.families.unshift(Object.assign({}, before, { updatedAt }));
            else if (current) state.families.unshift(Object.assign({}, current, { status: 'retired', retiredAt: updatedAt, updatedAt }));
        });
        asArray(state.facts).forEach(fact => {
            if (fact && Object.prototype.hasOwnProperty.call(beforeFactFamilyIds, fact.id)) {
                fact.familyIds = asArray(beforeFactFamilyIds[fact.id]);
                fact.updatedAt = updatedAt;
            }
        });
        batch.status = 'rolled-back';
        batch.rollbackAt = updatedAt;
        batch.updatedAt = updatedAt;
        state.updatedAt = updatedAt;
        saveRootState();
        return { ok: true, batchId, familyCount: asArray(batch.familyIds).length, factCount: asArray(batch.factIds).length };
    }
    function retireFamily(familyId, reason = 'user-retired-family', options = {}) {
        const state = ensureState(options);
        const family = findFamily(state, familyId);
        if (!family) return null;
        const updatedAt = nowIso();
        family.status = 'retired'; family.retiredAt = updatedAt; family.updatedAt = updatedAt; family.reviewStatus = reason;
        asArray(state.facts).forEach(fact => {
            if (!fact || !Array.isArray(fact.familyIds)) return;
            fact.familyIds = fact.familyIds.filter(id => id !== familyId);
        });
        state.batches.unshift({ id: nextId('memory-brain-batch'), kind: 'family-retire', status: 'applied', createdAt: updatedAt, updatedAt, mode: state.settings && state.settings.mode || 'shadow', familyIds: [familyId], reason });
        state.updatedAt = updatedAt;
        saveRootState();
        return safeClone(family);
    }
    function getRoutingReport() {
        return {
            owner: 'platform/memoryBrain/memoryFamilyStore',
            release: 'v0.3.7',
            familyWrite: 'memoryBrain.families + fact.familyIds + memoryBrain.batches only',
            graphHandledBy: 'platform/memoryBrain/memoryGraphStore',
            legacyMode: 'read-only-source',
            noDualWrite: true
        };
    }

    platform.memoryFamilyStore = { listFamilies, appendFamilyClusteringBatch, rollbackFamilyBatch, retireFamily, getRoutingReport };
})(window);
