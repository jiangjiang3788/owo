// --- Memory Brain family / graph rebuild store owner (v0.4.6) ---
// 负责全量家族 / graph 重建前后的 reset snapshot 与 meta batch；不渲染 UI、不请求 AI、不接正式 prompt。
(function registerMemoryBrainFamilyGraphRebuildStore(global) {
    const app = global.OwoApp;
    const platform = app.platform.memoryBrain;
    if (!platform || !platform.memoryBrainStore) throw new Error('[familyGraphRebuildStore] memoryBrainStore 尚未加载');

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
    function isRetired(item) { return item && item.status === 'retired'; }
    function isEligibleFact(fact) {
        if (!fact || fact.status === 'retired') return false;
        const status = String(fact.lifecycleStatus || fact.status || 'active');
        return !['duplicate', 'obsolete', 'disputed', 'merged', 'retired'].includes(status);
    }
    function summarizeFacts(facts) {
        const activeFacts = asArray(facts).filter(fact => fact && fact.status !== 'retired');
        const eligibleFacts = activeFacts.filter(isEligibleFact);
        const excluded = activeFacts.length - eligibleFacts.length;
        return { activeFactCount: activeFacts.length, eligibleFactCount: eligibleFacts.length, excludedFactCount: excluded };
    }
    function resetFamilyGraphForRebuild(options = {}) {
        const state = ensureState(options);
        const resetAt = nowIso();
        const batchId = options.batchId || nextId('memory-brain-batch');
        const activeFamilies = asArray(state.families).filter(family => family && !isRetired(family));
        const activeEdges = asArray(state.edges).filter(edge => edge && !isRetired(edge));
        const touchedFacts = asArray(state.facts).filter(fact => fact && (asArray(fact.familyIds).length || asArray(fact.edgeIds).length));
        const beforeFamilies = Object.fromEntries(activeFamilies.map(family => [family.id, safeClone(family)]));
        const beforeEdges = Object.fromEntries(activeEdges.map(edge => [edge.id, safeClone(edge)]));
        const beforeFacts = Object.fromEntries(touchedFacts.map(fact => [fact.id, { familyIds: asArray(fact.familyIds), edgeIds: asArray(fact.edgeIds), updatedAt: fact.updatedAt || '' }]));
        activeFamilies.forEach(family => { family.status = 'retired'; family.retiredAt = resetAt; family.updatedAt = resetAt; family.rebuildRetiredBy = batchId; });
        activeEdges.forEach(edge => { edge.status = 'retired'; edge.retiredAt = resetAt; edge.updatedAt = resetAt; edge.rebuildRetiredBy = batchId; });
        asArray(state.facts).forEach(fact => {
            if (!fact) return;
            fact.familyIds = [];
            fact.edgeIds = [];
            if (Object.prototype.hasOwnProperty.call(beforeFacts, fact.id)) fact.updatedAt = resetAt;
        });
        const factSummary = summarizeFacts(state.facts);
        const batch = {
            id: batchId,
            kind: 'family-graph-rebuild-reset',
            status: 'applied',
            createdAt: resetAt,
            updatedAt: resetAt,
            mode: state.settings && state.settings.mode || 'shadow',
            familyIds: activeFamilies.map(family => family.id),
            edgeIds: activeEdges.map(edge => edge.id),
            factIds: touchedFacts.map(fact => fact.id),
            beforeFamilies,
            beforeEdges,
            beforeFacts,
            factSummary,
            reason: options.reason || 'full-family-graph-rebuild-reset'
        };
        state.batches = asArray(state.batches).filter(item => item && item.id !== batch.id);
        state.batches.unshift(batch);
        state.familyGraphRebuildRuns = asArray(state.familyGraphRebuildRuns);
        state.familyGraphRebuildRuns.unshift({ id: nextId('family-graph-rebuild-run'), resetBatchId: batchId, status: 'reset-applied', createdAt: resetAt, updatedAt: resetAt, factSummary });
        state.updatedAt = resetAt;
        saveRootState();
        return safeClone({ batch, resetBatchId: batchId, familyCount: activeFamilies.length, edgeCount: activeEdges.length, factCount: touchedFacts.length, factSummary });
    }
    function appendFamilyGraphRebuildBatch(payload = {}, options = {}) {
        const state = ensureState(options);
        const createdAt = nowIso();
        const batchId = payload.batchId || nextId('memory-brain-batch');
        const batch = {
            id: batchId,
            kind: 'family-graph-rebuild',
            status: payload.errorMessage ? 'error' : 'applied',
            createdAt,
            updatedAt: createdAt,
            mode: state.settings && state.settings.mode || 'shadow',
            resetBatchId: payload.resetBatchId || '',
            familyBatchId: payload.familyBatchId || '',
            graphBatchId: payload.graphBatchId || '',
            familyIds: asArray(payload.familyIds),
            edgeIds: asArray(payload.edgeIds),
            factSummary: safeClone(payload.factSummary || summarizeFacts(state.facts)),
            diagnostics: asArray(payload.diagnostics),
            errorMessage: payload.errorMessage || ''
        };
        state.batches = asArray(state.batches).filter(item => item && item.id !== batch.id);
        state.batches.unshift(batch);
        state.familyGraphRebuildRuns = asArray(state.familyGraphRebuildRuns);
        state.familyGraphRebuildRuns.unshift({ id: nextId('family-graph-rebuild-run'), batchId, status: batch.status, createdAt, updatedAt: createdAt, resetBatchId: batch.resetBatchId, familyBatchId: batch.familyBatchId, graphBatchId: batch.graphBatchId, factSummary: batch.factSummary, diagnostics: batch.diagnostics });
        state.updatedAt = createdAt;
        saveRootState();
        return safeClone({ batch });
    }
    function rollbackRebuildResetBatch(batchId, options = {}) {
        const state = ensureState(options);
        const batch = asArray(state.batches).find(item => item && item.id === batchId);
        if (!batch || batch.kind !== 'family-graph-rebuild-reset') return { ok: false, reason: 'batch_not_found_or_not_rebuild_reset' };
        const updatedAt = nowIso();
        const beforeFamilies = batch.beforeFamilies || {};
        const beforeEdges = batch.beforeEdges || {};
        const beforeFacts = batch.beforeFacts || {};
        state.families = asArray(state.families).filter(family => family && !Object.prototype.hasOwnProperty.call(beforeFamilies, family.id));
        Object.keys(beforeFamilies).forEach(id => state.families.unshift(Object.assign({}, beforeFamilies[id], { updatedAt })));
        state.edges = asArray(state.edges).filter(edge => edge && !Object.prototype.hasOwnProperty.call(beforeEdges, edge.id));
        Object.keys(beforeEdges).forEach(id => state.edges.unshift(Object.assign({}, beforeEdges[id], { updatedAt })));
        asArray(state.facts).forEach(fact => {
            if (!fact || !Object.prototype.hasOwnProperty.call(beforeFacts, fact.id)) return;
            fact.familyIds = asArray(beforeFacts[fact.id].familyIds);
            fact.edgeIds = asArray(beforeFacts[fact.id].edgeIds);
            fact.updatedAt = updatedAt;
        });
        batch.status = 'rolled-back';
        batch.rollbackAt = updatedAt;
        batch.updatedAt = updatedAt;
        state.updatedAt = updatedAt;
        saveRootState();
        return { ok: true, batchId, familyCount: asArray(batch.familyIds).length, edgeCount: asArray(batch.edgeIds).length, factCount: asArray(batch.factIds).length };
    }

    function rollbackFamilyGraphRebuildBatch(batchId, payload = {}, options = {}) {
        const state = ensureState(options);
        const batch = asArray(state.batches).find(item => item && item.id === batchId);
        if (!batch || batch.kind !== 'family-graph-rebuild') return { ok: false, reason: 'batch_not_found_or_not_family_graph_rebuild' };
        const updatedAt = nowIso();
        batch.status = 'rolled-back';
        batch.rollbackAt = updatedAt;
        batch.updatedAt = updatedAt;
        batch.rollbackResult = safeClone({ graph: payload.graph || null, family: payload.family || null, reset: payload.reset || null });
        state.familyGraphRebuildRuns = asArray(state.familyGraphRebuildRuns);
        state.familyGraphRebuildRuns.unshift({ id: nextId('family-graph-rebuild-run'), batchId, status: 'rolled-back', createdAt: updatedAt, updatedAt, resetBatchId: batch.resetBatchId || '', familyBatchId: batch.familyBatchId || '', graphBatchId: batch.graphBatchId || '', factSummary: batch.factSummary || {}, diagnostics: asArray(batch.diagnostics).concat(['rollback_applied']) });
        state.updatedAt = updatedAt;
        saveRootState();
        return { ok: true, batchId, familyBatchId: batch.familyBatchId || '', graphBatchId: batch.graphBatchId || '', resetBatchId: batch.resetBatchId || '' };
    }

    function rollbackFamilyGraphRebuildMetaBatch(batchId, options = {}) {
        const state = ensureState(options);
        const batch = asArray(state.batches).find(item => item && item.id === batchId);
        if (!batch || batch.kind !== 'family-graph-rebuild') return { ok: false, reason: 'batch_not_found_or_not_family_graph_rebuild' };
        const updatedAt = nowIso();
        batch.status = 'rolled-back';
        batch.rollbackAt = updatedAt;
        batch.updatedAt = updatedAt;
        state.updatedAt = updatedAt;
        saveRootState();
        return { ok: true, batchId };
    }

    function listFamilyGraphRebuildRuns(options = {}) {
        return asArray(ensureState(options).familyGraphRebuildRuns).slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    }
    function getFamilyGraphRebuildSnapshot(options = {}) {
        const state = ensureState(options);
        return safeClone({ runs: listFamilyGraphRebuildRuns(options), batches: asArray(state.batches).filter(batch => batch && (batch.kind === 'family-graph-rebuild' || batch.kind === 'family-graph-rebuild-reset')), factSummary: summarizeFacts(state.facts) });
    }
    function getRoutingReport() {
        return { owner: 'platform/memoryBrain/familyGraphRebuildStore', release: 'v0.4.6', writes: ['memoryBrain.familyGraphRebuildRuns', 'memoryBrain.batches', 'memoryBrain.families.status', 'memoryBrain.edges.status', 'fact.familyIds', 'fact.edgeIds'], legacyMode: 'read-only-source', formalPromptInjection: false };
    }
    platform.familyGraphRebuildStore = { resetFamilyGraphForRebuild, appendFamilyGraphRebuildBatch, rollbackRebuildResetBatch, rollbackFamilyGraphRebuildBatch, rollbackFamilyGraphRebuildMetaBatch, listFamilyGraphRebuildRuns, getFamilyGraphRebuildSnapshot, getRoutingReport };
})(window);
