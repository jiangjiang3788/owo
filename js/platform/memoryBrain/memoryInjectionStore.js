// --- Memory Brain injection preview store owner (v0.3.7) ---
// 负责 shadow injection previews 的批次保存和回滚；只写 memoryBrain.injectionPreviews / batches，不接正式 prompt。
(function registerMemoryBrainInjectionStore(global) {
    const app = global.OwoApp;
    const platform = app.platform.memoryBrain;
    if (!platform || !platform.memoryBrainStore) throw new Error('[memoryInjectionStore] memoryBrainStore 尚未加载');

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
    function selectedIds(preview, key) { return unique(preview && preview.selected && preview.selected[key]); }
    function normalizeStoredPreview(raw, batchId, createdAt, state) {
        const preview = Object.assign({}, safeClone(raw || {}));
        preview.id = preview.id || nextId('memory-injection-preview');
        preview.layer = 'injection';
        preview.kind = 'shadow-injection-preview';
        preview.status = 'active';
        preview.mode = 'shadow';
        preview.batchId = batchId;
        preview.createdAt = createdAt;
        preview.updatedAt = createdAt;
        preview.policy = Object.assign({ previewOnly: true, formalPromptInjection: false }, preview.policy || {});
        preview.selected = Object.assign({ modelIds: [], factIds: [], familyIds: [], edgeIds: [], eventIds: [] }, preview.selected || {});
        preview.blockCharCount = Number(preview.blockCharCount) || String(preview.memoryBlock || '').length;
        preview.release = state.release || 'v0.3.7';
        return preview;
    }
    function listInjectionPreviews(options = {}) {
        return asArray(ensureState(options).injectionPreviews).slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    }
    function appendInjectionPreviewBatch(payload = {}, options = {}) {
        const state = ensureState(options);
        const createdAt = nowIso();
        const batchId = payload.batchId || nextId('memory-brain-batch');
        let preview = null;
        if (payload.preview) {
            preview = normalizeStoredPreview(payload.preview, batchId, createdAt, state);
            state.injectionPreviews = [preview].concat(asArray(state.injectionPreviews).filter(item => item && item.id !== preview.id)).slice(0, 80);
        }
        const batch = {
            id: batchId,
            kind: 'injection-preview',
            status: preview ? 'applied' : (payload.errorMessage ? 'error' : 'skipped'),
            createdAt, updatedAt: createdAt,
            mode: 'shadow',
            input: safeClone(payload.input || {}),
            previewIds: preview ? [preview.id] : [],
            selected: preview ? safeClone(preview.selected) : { modelIds: [], factIds: [], familyIds: [], edgeIds: [], eventIds: [] },
            legacyComparison: safeClone(payload.legacyComparison || preview && preview.legacyComparison || null),
            memoryBlock: clipText(preview && preview.memoryBlock, 12000),
            parserDiagnostics: asArray(payload.parserDiagnostics || preview && preview.diagnostics),
            errorMessage: payload.errorMessage || ''
        };
        state.batches = asArray(state.batches).filter(item => item && item.id !== batch.id);
        state.batches.unshift(batch);
        state.updatedAt = createdAt;
        saveRootState();
        return safeClone({ batch, preview });
    }
    function rollbackInjectionPreviewBatch(batchId, options = {}) {
        const state = ensureState(options);
        const batch = asArray(state.batches).find(item => item && item.id === batchId);
        if (!batch || batch.kind !== 'injection-preview') return { ok: false, reason: 'batch_not_found_or_not_injection_preview' };
        const updatedAt = nowIso();
        const ids = new Set(asArray(batch.previewIds));
        asArray(state.injectionPreviews).forEach(preview => {
            if (preview && ids.has(preview.id)) { preview.status = 'retired'; preview.retiredAt = updatedAt; preview.updatedAt = updatedAt; preview.reviewStatus = 'batch-rolled-back'; }
        });
        batch.status = 'rolled-back';
        batch.rollbackAt = updatedAt;
        batch.updatedAt = updatedAt;
        state.updatedAt = updatedAt;
        saveRootState();
        return { ok: true, batchId, previewCount: ids.size };
    }
    function retireInjectionPreview(previewId, reason = 'user-retired-injection-preview', options = {}) {
        const state = ensureState(options);
        const preview = asArray(state.injectionPreviews).find(item => item && item.id === previewId);
        if (!preview) return null;
        const updatedAt = nowIso();
        preview.status = 'retired';
        preview.retiredAt = updatedAt;
        preview.updatedAt = updatedAt;
        preview.reviewStatus = reason;
        state.batches.unshift({ id: nextId('memory-brain-batch'), kind: 'injection-preview-retire', status: 'applied', createdAt: updatedAt, updatedAt, mode: 'shadow', previewIds: [previewId], reason });
        state.updatedAt = updatedAt;
        saveRootState();
        return safeClone(preview);
    }
    function getRoutingReport() {
        return {
            owner: 'platform/memoryBrain/memoryInjectionStore',
            release: 'v0.3.7',
            injectionPreviewWrite: 'memoryBrain.injectionPreviews + memoryBrain.batches only',
            formalPromptInjection: false,
            legacyMode: 'read-only-comparison',
            noDualInjection: true,
            selectedIdFields: ['modelIds', 'factIds', 'familyIds', 'edgeIds', 'eventIds']
        };
    }

    platform.memoryInjectionStore = { listInjectionPreviews, appendInjectionPreviewBatch, rollbackInjectionPreviewBatch, retireInjectionPreview, getRoutingReport };
})(window);
