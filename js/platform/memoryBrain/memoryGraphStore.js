// --- Memory Brain graph store owner (v0.3.5) ---
// 负责 graph edges 和 graph-linking batch 写入/撤回；不渲染 UI、不做长期模型、不接 prompt 注入。
(function registerMemoryBrainGraphStore(global) {
    const app = global.OwoApp;
    const platform = app.platform.memoryBrain;
    if (!platform || !platform.memoryBrainStore) throw new Error('[memoryGraphStore] memoryBrainStore 尚未加载');

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
    function unique(list) {
        const seen = new Set();
        return asArray(list).filter(Boolean).filter(item => {
            const key = String(item);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }
    function edgeKey(edge) { return edge && (edge.key || [edge.relation, edge.sourceId, edge.targetId].join('::')); }
    function listEdges(options = {}) {
        return asArray(ensureState(options).edges).slice().sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
    }
    function findEdgeById(state, id) { return asArray(state.edges).find(edge => edge && edge.id === id) || null; }
    function findActiveEdgeByKey(state, key) { return asArray(state.edges).find(edge => edge && edge.status !== 'retired' && edgeKey(edge) === key) || null; }
    function rememberNodeEdgeIds(state, edgeDrafts) {
        const factIds = new Set();
        const familyIds = new Set();
        asArray(edgeDrafts).forEach(edge => {
            [[edge.sourceType, edge.sourceId], [edge.targetType, edge.targetId]].forEach(([type, id]) => {
                if (type === 'fact') factIds.add(id);
                if (type === 'family') familyIds.add(id);
            });
        });
        const beforeFacts = {};
        const beforeFamilies = {};
        asArray(state.facts).forEach(fact => { if (fact && factIds.has(fact.id)) beforeFacts[fact.id] = asArray(fact.edgeIds); });
        asArray(state.families).forEach(family => { if (family && familyIds.has(family.id)) beforeFamilies[family.id] = asArray(family.edgeIds); });
        return { beforeFactEdgeIds: beforeFacts, beforeFamilyEdgeIds: beforeFamilies };
    }
    function normalizeStoredEdge(raw, existing, batchId, createdAt, state) {
        const edge = Object.assign({}, safeClone(existing || {}), safeClone(raw || {}));
        edge.id = existing && existing.id || edge.id || nextId('memory-edge');
        edge.layer = 'graph';
        edge.kind = 'memory-graph-edge';
        edge.status = 'active';
        edge.mode = state.settings && state.settings.mode || 'shadow';
        edge.key = edgeKey(edge);
        edge.relationLabel = edge.relationLabel || edge.relation || '关系';
        edge.weight = Math.max(0, Math.min(1, Number(edge.weight) || 0.7));
        edge.evidenceFactIds = unique(edge.evidenceFactIds);
        edge.familyIds = unique(edge.familyIds);
        edge.keywords = unique(edge.keywords).slice(0, 18);
        edge.labels = unique(edge.labels).slice(0, 12);
        edge.lastBatchId = batchId;
        edge.createdAt = existing && existing.createdAt || edge.createdAt || createdAt;
        edge.updatedAt = createdAt;
        return edge;
    }
    function applyEdgeMembership(state, edge, updatedAt) {
        let changed = 0;
        function addTo(list, id) {
            const item = asArray(list).find(entry => entry && entry.id === id);
            if (!item) return;
            item.edgeIds = unique(asArray(item.edgeIds).concat([edge.id]));
            item.graphUpdatedAt = updatedAt;
            item.updatedAt = updatedAt;
            changed += 1;
        }
        [[edge.sourceType, edge.sourceId], [edge.targetType, edge.targetId]].forEach(([type, id]) => {
            if (type === 'fact') addTo(state.facts, id);
            if (type === 'family') addTo(state.families, id);
        });
        return changed;
    }
    function appendGraphLinkingBatch(payload = {}, options = {}) {
        const state = ensureState(options);
        const createdAt = nowIso();
        const batchId = payload.batchId || nextId('memory-brain-batch');
        const drafts = asArray(payload.edges || payload.drafts).filter(edge => edge && edge.sourceId && edge.targetId && edge.relation);
        const beforeEdges = {};
        const newEdgeIds = [];
        const edgeIds = [];
        const nodeSnapshots = rememberNodeEdgeIds(state, drafts);
        let changedNodes = 0;
        drafts.forEach(draft => {
            const key = edgeKey(draft);
            const existing = findActiveEdgeByKey(state, key);
            if (existing) beforeEdges[existing.id] = safeClone(existing);
            const edge = normalizeStoredEdge(draft, existing, batchId, createdAt, state);
            state.edges = asArray(state.edges).filter(item => item && item.id !== edge.id);
            state.edges.unshift(edge);
            edgeIds.push(edge.id);
            if (!existing) newEdgeIds.push(edge.id);
            changedNodes += applyEdgeMembership(state, edge, createdAt);
        });
        const batch = {
            id: batchId,
            kind: 'graph-linking',
            status: drafts.length ? 'applied' : (payload.errorMessage ? 'error' : 'skipped'),
            createdAt, updatedAt: createdAt,
            mode: state.settings && state.settings.mode || 'shadow',
            input: safeClone(payload.input || {}),
            rawOutput: clipText(payload.rawOutput, 16000),
            parsedDrafts: safeClone(payload.parsedDrafts || drafts),
            parserDiagnostics: asArray(payload.parserDiagnostics),
            edgeIds,
            newEdgeIds,
            factIds: unique(drafts.flatMap(edge => asArray(edge.evidenceFactIds).concat(edge.sourceType === 'fact' ? [edge.sourceId] : [], edge.targetType === 'fact' ? [edge.targetId] : []))),
            familyIds: unique(drafts.flatMap(edge => asArray(edge.familyIds).concat(edge.sourceType === 'family' ? [edge.sourceId] : [], edge.targetType === 'family' ? [edge.targetId] : []))),
            beforeEdges,
            beforeFactEdgeIds: nodeSnapshots.beforeFactEdgeIds,
            beforeFamilyEdgeIds: nodeSnapshots.beforeFamilyEdgeIds,
            changedNodes,
            errorMessage: payload.errorMessage || ''
        };
        state.batches = asArray(state.batches).filter(item => item && item.id !== batch.id);
        state.batches.unshift(batch);
        state.updatedAt = createdAt;
        saveRootState();
        return safeClone({ batch, edges: edgeIds.map(id => findEdgeById(state, id)).filter(Boolean), changedNodes });
    }
    function rollbackGraphBatch(batchId, options = {}) {
        const state = ensureState(options);
        const batch = asArray(state.batches).find(item => item && item.id === batchId);
        if (!batch || batch.kind !== 'graph-linking') return { ok: false, reason: 'batch_not_found_or_not_graph_linking' };
        const updatedAt = nowIso();
        const beforeEdges = batch.beforeEdges || {};
        const newIds = new Set(asArray(batch.newEdgeIds));
        asArray(batch.edgeIds).forEach(id => {
            const current = findEdgeById(state, id);
            state.edges = asArray(state.edges).filter(edge => edge && edge.id !== id);
            if (beforeEdges[id]) state.edges.unshift(Object.assign({}, beforeEdges[id], { updatedAt }));
            else if (current || newIds.has(id)) state.edges.unshift(Object.assign({}, current || { id }, { status: 'retired', retiredAt: updatedAt, updatedAt }));
        });
        asArray(state.facts).forEach(fact => {
            if (fact && Object.prototype.hasOwnProperty.call(batch.beforeFactEdgeIds || {}, fact.id)) {
                fact.edgeIds = asArray(batch.beforeFactEdgeIds[fact.id]);
                fact.updatedAt = updatedAt;
            }
        });
        asArray(state.families).forEach(family => {
            if (family && Object.prototype.hasOwnProperty.call(batch.beforeFamilyEdgeIds || {}, family.id)) {
                family.edgeIds = asArray(batch.beforeFamilyEdgeIds[family.id]);
                family.updatedAt = updatedAt;
            }
        });
        batch.status = 'rolled-back';
        batch.rollbackAt = updatedAt;
        batch.updatedAt = updatedAt;
        state.updatedAt = updatedAt;
        saveRootState();
        return { ok: true, batchId, edgeCount: asArray(batch.edgeIds).length, factCount: asArray(batch.factIds).length, familyCount: asArray(batch.familyIds).length };
    }
    function retireEdge(edgeId, reason = 'user-retired-edge', options = {}) {
        const state = ensureState(options);
        const edge = findEdgeById(state, edgeId);
        if (!edge) return null;
        const updatedAt = nowIso();
        edge.status = 'retired'; edge.retiredAt = updatedAt; edge.updatedAt = updatedAt; edge.reviewStatus = reason;
        asArray(state.facts).forEach(fact => { if (fact && Array.isArray(fact.edgeIds)) fact.edgeIds = fact.edgeIds.filter(id => id !== edgeId); });
        asArray(state.families).forEach(family => { if (family && Array.isArray(family.edgeIds)) family.edgeIds = family.edgeIds.filter(id => id !== edgeId); });
        state.batches.unshift({ id: nextId('memory-brain-batch'), kind: 'graph-edge-retire', status: 'applied', createdAt: updatedAt, updatedAt, mode: state.settings && state.settings.mode || 'shadow', edgeIds: [edgeId], reason });
        state.updatedAt = updatedAt;
        saveRootState();
        return safeClone(edge);
    }
    function getRoutingReport() {
        return {
            owner: 'platform/memoryBrain/memoryGraphStore',
            release: 'v0.3.7',
            graphWrite: 'memoryBrain.edges + fact.edgeIds + family.edgeIds + memoryBrain.batches only',
            modelMode: 'not-yet-v0.3.5',
            injectionMode: 'shadow-preview-v0.3.7',
            legacyMode: 'read-only-source',
            noDualWrite: true
        };
    }

    platform.memoryGraphStore = { listEdges, appendGraphLinkingBatch, rollbackGraphBatch, retireEdge, getRoutingReport };
})(window);
