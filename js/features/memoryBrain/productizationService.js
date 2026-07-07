// --- Memory Brain productization service owner (v0.3.8) ---
// 编排记忆小屋、导出包和收口 safety gate；不接正式 prompt，不触碰旧记忆写入。
(function registerMemoryBrainProductizationService(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;

    function getPlatformApi() { return app.platform.memoryBrain.publicApi; }
    function getCoreApi() { return app.core.memoryBrain.publicApi; }
    function recordOperation(label, data, level) {
        const service = app.platform.observability && app.platform.observability.operationTraceService;
        if (service && typeof service.recordOperation === 'function') return service.recordOperation({ source: 'features/memoryBrain', sourceModule: 'features/memoryBrain/productizationService', label, level: level || 'event', data: data || {} });
        return null;
    }
    function stringifyBundle(bundle) { return JSON.stringify(bundle || {}, null, 2); }
    function copyText(text) {
        if (global.navigator && global.navigator.clipboard && global.navigator.clipboard.writeText) global.navigator.clipboard.writeText(text);
        return text;
    }
    function getMemoryPalace(options = {}) {
        const snapshot = getPlatformApi().getSnapshot(options);
        return getCoreApi().buildMemoryPalace(snapshot, options);
    }
    function createExportBundle(options = {}) {
        const bundle = getPlatformApi().createExportBundle(options);
        recordOperation('记忆脑导出包生成', { counts: bundle.manifest && bundle.manifest.counts, policy: bundle.policy, previewOnly: true });
        return bundle;
    }
    function copyExportBundle(options = {}) {
        const bundle = createExportBundle(options);
        const result = getPlatformApi().appendExportPreviewBatch({ input: { source: 'memory-brain-app', copy: true }, bundle }, options);
        const text = stringifyBundle(bundle);
        copyText(text);
        recordOperation('记忆脑导出包复制', { exportId: result.exportRecord && result.exportRecord.id, textLength: text.length, counts: bundle.manifest && bundle.manifest.counts, storedData: 'manifest-only' });
        return Object.assign({}, result, { textLength: text.length });
    }
    function getExportCards(options = {}) {
        return getPlatformApi().listExports(options).filter(item => item && item.status !== 'retired').slice(0, 8).map(item => ({
            id: item.id,
            createdAt: item.createdAt,
            mode: item.mode,
            counts: item.counts || {},
            safetySummary: item.manifest && item.manifest.safetySummary || '',
            storedData: item.storedData || 'manifest-only'
        }));
    }
    function rollbackLatestExportBatch(options = {}) {
        const snapshot = getPlatformApi().getSnapshot(options);
        const batch = (snapshot.batches || []).find(item => item && item.kind === 'memory-export-preview' && item.status === 'applied');
        if (!batch) throw new Error('没有可撤回的导出预览批次');
        const result = getPlatformApi().rollbackExportBatch(batch.id, options);
        recordOperation('记忆脑导出预览批次回滚', { batchId: batch.id, result });
        return result;
    }
    function getRoutingReport() {
        return {
            owner: 'features/memoryBrain/productizationService',
            release: 'v0.3.8',
            memoryPalace: true,
            exportPreview: true,
            formalPromptInjection: false,
            legacyMode: 'read-only-source'
        };
    }

    feature.productizationService = { getMemoryPalace, createExportBundle, copyExportBundle, getExportCards, rollbackLatestExportBatch, getRoutingReport };
})(window);
