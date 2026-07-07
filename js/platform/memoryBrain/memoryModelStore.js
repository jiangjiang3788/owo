// --- Memory Brain model store owner (v0.3.5) ---
// 负责 long-term models 的版本历史、批次写入和回滚；不渲染 UI、不接正式 prompt 注入。
(function registerMemoryBrainModelStore(global) {
    const app = global.OwoApp;
    const platform = app.platform.memoryBrain;
    if (!platform || !platform.memoryBrainStore) throw new Error('[memoryModelStore] memoryBrainStore 尚未加载');

    function nowIso() { return new Date().toISOString(); }
    function nextId(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function ensureState(options) { return platform.memoryBrainStore.ensureState(options || {}); }
    function saveRootState() { return typeof platform.memoryBrainStore.saveRootState === 'function' ? platform.memoryBrainStore.saveRootState() : Promise.resolve(false); }
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
        return asArray(list).filter(Boolean).filter(item => { const key = String(item); if (seen.has(key)) return false; seen.add(key); return true; });
    }
    function listModels(options = {}) {
        return asArray(ensureState(options).models).slice().sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
    }
    function activeModels(state) { return asArray(state.models).filter(model => model && model.status === 'active'); }
    function activeModelByType(state, type) { return activeModels(state).find(model => model.type === type) || null; }
    function maxVersionByType(state, type) {
        return asArray(state.models).filter(model => model && model.type === type).reduce((max, model) => Math.max(max, Number(model.version) || 0), 0);
    }
    function normalizeStoredModel(raw, previous, batchId, createdAt, state) {
        const model = Object.assign({}, safeClone(raw || {}));
        const type = model.type || 'user-profile';
        model.id = model.id || nextId('memory-model');
        model.layer = 'model';
        model.kind = 'long-term-model';
        model.type = type;
        model.status = 'active';
        model.mode = state.settings && state.settings.mode || 'shadow';
        model.version = Math.max(maxVersionByType(state, type) + 1, previous ? (Number(previous.version) || 0) + 1 : 1);
        model.previousModelId = previous && previous.id || model.previousModelId || '';
        model.batchId = batchId;
        model.createdAt = createdAt;
        model.updatedAt = createdAt;
        model.confidence = Math.max(0, Math.min(1, Number(model.confidence) || 0.72));
        model.evidenceFactIds = unique(model.evidenceFactIds);
        model.familyIds = unique(model.familyIds);
        model.edgeIds = unique(model.edgeIds);
        model.keywords = unique(model.keywords).slice(0, 18);
        model.labels = unique(model.labels).slice(0, 12);
        return model;
    }
    function appendLongTermModelBatch(payload = {}, options = {}) {
        const state = ensureState(options);
        const createdAt = nowIso();
        const batchId = payload.batchId || nextId('memory-brain-batch');
        const beforeModels = {};
        const supersededModelIds = [];
        const newModels = [];
        asArray(payload.models || payload.drafts).filter(model => model && model.type && model.summary).forEach(rawModel => {
            const previous = activeModelByType(state, rawModel.type);
            if (previous) {
                beforeModels[previous.id] = safeClone(previous);
                previous.status = 'superseded';
                previous.supersededAt = createdAt;
                previous.updatedAt = createdAt;
                previous.nextModelBatchId = batchId;
                supersededModelIds.push(previous.id);
            }
            const model = normalizeStoredModel(rawModel, previous, batchId, createdAt, state);
            newModels.push(model);
        });
        if (newModels.length) state.models = newModels.concat(asArray(state.models));
        const batch = {
            id: batchId,
            kind: 'long-term-model',
            status: newModels.length ? 'applied' : (payload.errorMessage ? 'error' : 'skipped'),
            createdAt, updatedAt: createdAt,
            mode: state.settings && state.settings.mode || 'shadow',
            input: safeClone(payload.input || {}),
            rawOutput: clipText(payload.rawOutput, 24000),
            parsedDrafts: safeClone(payload.parsedDrafts || payload.models || []),
            parserDiagnostics: asArray(payload.parserDiagnostics),
            modelIds: newModels.map(model => model.id),
            modelTypes: newModels.map(model => model.type),
            supersededModelIds,
            beforeModels,
            errorMessage: payload.errorMessage || ''
        };
        state.batches = asArray(state.batches).filter(item => item && item.id !== batch.id);
        state.batches.unshift(batch);
        state.updatedAt = createdAt;
        saveRootState();
        return safeClone({ batch, models: newModels });
    }
    function rollbackModelBatch(batchId, options = {}) {
        const state = ensureState(options);
        const batch = asArray(state.batches).find(item => item && item.id === batchId);
        if (!batch || batch.kind !== 'long-term-model') return { ok: false, reason: 'batch_not_found_or_not_long_term_model' };
        const updatedAt = nowIso();
        const modelIds = new Set(asArray(batch.modelIds));
        asArray(state.models).forEach(model => {
            if (model && modelIds.has(model.id)) { model.status = 'retired'; model.retiredAt = updatedAt; model.updatedAt = updatedAt; model.reviewStatus = 'batch-rolled-back'; }
        });
        Object.keys(batch.beforeModels || {}).forEach(id => {
            const current = asArray(state.models).find(model => model && model.id === id);
            const restored = Object.assign({}, batch.beforeModels[id], { status: 'active', restoredAt: updatedAt, updatedAt });
            if (current) Object.assign(current, restored);
            else state.models.unshift(restored);
        });
        batch.status = 'rolled-back';
        batch.rollbackAt = updatedAt;
        batch.updatedAt = updatedAt;
        state.updatedAt = updatedAt;
        saveRootState();
        return { ok: true, batchId, modelCount: modelIds.size, restoredCount: Object.keys(batch.beforeModels || {}).length };
    }
    function retireModel(modelId, reason = 'user-retired-model', options = {}) {
        const state = ensureState(options);
        const model = asArray(state.models).find(item => item && item.id === modelId);
        if (!model) return null;
        const updatedAt = nowIso();
        model.status = 'retired'; model.retiredAt = updatedAt; model.updatedAt = updatedAt; model.reviewStatus = reason;
        state.batches.unshift({ id: nextId('memory-brain-batch'), kind: 'long-term-model-retire', status: 'applied', createdAt: updatedAt, updatedAt, mode: state.settings && state.settings.mode || 'shadow', modelIds: [modelId], reason });
        state.updatedAt = updatedAt;
        saveRootState();
        return safeClone(model);
    }
    function getRoutingReport() {
        return {
            owner: 'platform/memoryBrain/memoryModelStore',
            release: 'v0.3.7',
            modelWrite: 'memoryBrain.models + memoryBrain.batches only',
            injectionMode: 'shadow-preview-v0.3.7',
            legacyMode: 'read-only-source',
            noDualWrite: true
        };
    }

    platform.memoryModelStore = { listModels, appendLongTermModelBatch, rollbackModelBatch, retireModel, getRoutingReport };
})(window);
