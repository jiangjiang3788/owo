// --- Memory Brain export adapter owner (v0.3.8) ---
// 生成记忆脑导出包和导出预览批次；只写 memoryBrain.exports / memoryBrain.batches，不触碰旧记忆系统。
(function registerMemoryBrainExportAdapter(global) {
    const app = global.OwoApp;
    const platform = app.platform.memoryBrain;
    if (!platform || !platform.memoryBrainStore) throw new Error('[memoryExportAdapter] memoryBrainStore 尚未加载');

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
    function getCoreApi() {
        const api = app.core && app.core.memoryBrain && app.core.memoryBrain.publicApi;
        if (!api || typeof api.buildMemoryExportManifest !== 'function') throw new Error('[memoryExportAdapter] productSemantics public API 尚未加载');
        return api;
    }
    function scrubExportState(state) {
        const clone = safeClone(state);
        clone.lastLegacyScan = clone.lastLegacyScan ? {
            scannedAt: clone.lastLegacyScan.scannedAt,
            chatCount: clone.lastLegacyScan.chatCount,
            totals: clone.lastLegacyScan.totals,
            sources: clone.lastLegacyScan.sources
        } : null;
        return clone;
    }
    function createExportBundle(options = {}) {
        const state = ensureState(options);
        const exportedAt = nowIso();
        const manifest = getCoreApi().buildMemoryExportManifest(state, { exportedAt });
        return {
            manifest,
            memoryBrain: scrubExportState(state),
            readme: [
                'OWO Memory Brain v0.3.8 export bundle',
                '这个包只包含新记忆脑 memoryBrain 状态，不包含旧聊天原文迁移副本。',
                '旧 memory_table / vector_memory / journal 仍只是只读来源。',
                'v0.3.8 不正式注入 prompt；正式切换必须另走 v0.4 safety gate。'
            ],
            policy: { noLegacyWrite: true, formalPromptInjection: false, exportContainsMemoryBrainOnly: true }
        };
    }
    function appendExportPreviewBatch(payload = {}, options = {}) {
        const state = ensureState(options);
        const createdAt = nowIso();
        const batchId = payload.batchId || nextId('memory-brain-batch');
        const exportId = payload.exportId || nextId('memory-export');
        const bundle = payload.bundle || createExportBundle(options);
        const manifest = Object.assign({}, safeClone(bundle.manifest || {}), { id: exportId, createdAt });
        const record = {
            id: exportId,
            kind: 'memory-export-preview',
            status: 'active',
            createdAt,
            updatedAt: createdAt,
            batchId,
            mode: state.settings && state.settings.mode || 'shadow',
            manifest,
            counts: manifest.counts || {},
            storedData: 'manifest-only',
            policy: { noLegacyWrite: true, formalPromptInjection: false, noOldMemoryMigration: true }
        };
        const batch = {
            id: batchId,
            kind: 'memory-export-preview',
            status: 'applied',
            createdAt,
            updatedAt: createdAt,
            mode: 'shadow',
            input: safeClone(payload.input || {}),
            exportIds: [exportId],
            manifest,
            storedData: 'manifest-only',
            policy: record.policy
        };
        state.exports = asArray(state.exports).filter(item => item && item.id !== record.id);
        state.exports.unshift(record);
        state.exports = state.exports.slice(0, 24);
        state.batches = asArray(state.batches).filter(item => item && item.id !== batch.id);
        state.batches.unshift(batch);
        state.updatedAt = createdAt;
        saveRootState();
        return safeClone({ batch, exportRecord: record, bundle });
    }
    function rollbackExportBatch(batchId, options = {}) {
        const state = ensureState(options);
        const batch = asArray(state.batches).find(item => item && item.id === batchId);
        if (!batch || batch.kind !== 'memory-export-preview') return { ok: false, reason: 'batch_not_found_or_not_memory_export_preview' };
        const updatedAt = nowIso();
        const ids = asArray(batch.exportIds);
        state.exports = asArray(state.exports).map(record => ids.includes(record && record.id) ? Object.assign({}, record, { status: 'retired', retiredAt: updatedAt, updatedAt }) : record);
        batch.status = 'rolled-back';
        batch.rollbackAt = updatedAt;
        batch.updatedAt = updatedAt;
        state.updatedAt = updatedAt;
        saveRootState();
        return { ok: true, batchId, exportCount: ids.length };
    }
    function listExports(options = {}) {
        const state = ensureState(options);
        return asArray(state.exports).slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    }
    function getRoutingReport() {
        return {
            owner: 'platform/memoryBrain/memoryExportAdapter',
            release: 'v0.3.8',
            exportWrite: 'memoryBrain.exports + memoryBrain.batches only',
            storedData: 'manifest-only',
            formalPromptInjection: false,
            legacyMode: 'read-only-source',
            noDualWrite: true
        };
    }

    platform.memoryExportAdapter = { createExportBundle, appendExportPreviewBatch, rollbackExportBatch, listExports, getRoutingReport };
})(window);
