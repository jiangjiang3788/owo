// --- Memory Brain history archive service owner (v0.4.1) ---
// 编排历史源扫描、控制台记录和 UI 卡片；不生成事件、不调用 AI、不正式注入 prompt。
(function registerHistoryArchiveService(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;

    function getPlatformApi() { return app.platform.memoryBrain.publicApi; }
    function recordOperation(label, data, level) {
        const trace = app.platform.observability && app.platform.observability.operationTraceService;
        if (trace && typeof trace.recordOperation === 'function') return trace.recordOperation({ source: 'features/memoryBrain', sourceModule: 'features/memoryBrain/historyArchiveService', label, level: level || 'event', data: data || {} });
        return null;
    }
    function formatNumber(value) { return (Number(value) || 0).toLocaleString('zh-CN'); }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function compactSource(source) {
        const api = app.core && app.core.memoryBrain && app.core.memoryBrain.publicApi;
        return api && typeof api.compactArchiveSourceForList === 'function' ? api.compactArchiveSourceForList(source) : source;
    }
    function scanHistoryArchive(options = {}) {
        recordOperation('历史归档扫描输入', { chunkSize: options.chunkSize || 60, overlap: options.overlap || 8, minMessages: options.minMessages || 0, sourceType: options.sourceType || 'all' });
        const result = getPlatformApi().rememberArchiveSources(options);
        recordOperation('历史归档扫描应用结果', {
            scanRunId: result.run && result.run.id,
            sourceCount: result.sources && result.sources.length || 0,
            totalMessages: result.run && result.run.totalMessages || 0,
            estimatedChunkCount: result.run && result.run.estimatedChunkCount || 0,
            formalPromptInjection: false,
            writesLegacyMemory: false
        });
        return result;
    }
    function getArchiveCards(options = {}) {
        const platform = getPlatformApi();
        const snapshot = platform.getArchiveSnapshot(options);
        const run = snapshot.lastScan || null;
        const sources = asArray(snapshot.sources).map(compactSource).sort((a, b) => (b.messageCount || 0) - (a.messageCount || 0));
        const totals = asArray(snapshot.sources).reduce((acc, source) => {
            acc.sources += 1;
            acc.messages += source.messageCount || 0;
            acc.estimatedChunks += source.estimatedChunkCount || 0;
            if (source.status === 'ready') acc.readySources += 1;
            if (source.priority === 'huge') acc.hugeSources += 1;
            return acc;
        }, { sources: 0, readySources: 0, hugeSources: 0, messages: 0, estimatedChunks: 0 });
        return {
            lastScan: run,
            totals,
            totalText: {
                sources: formatNumber(totals.sources),
                readySources: formatNumber(totals.readySources),
                messages: formatNumber(totals.messages),
                estimatedChunks: formatNumber(totals.estimatedChunks),
                hugeSources: formatNumber(totals.hugeSources)
            },
            sources: sources.slice(0, options.limit || 24),
            runs: asArray(snapshot.runs).slice(0, 10),
            nextVersion: 'v0.4.1：历史切片 / 游标已可准备'
        };
    }
    function getRoutingReport() {
        return {
            owner: 'features/memoryBrain/historyArchiveService',
            release: 'v0.4.1',
            writes: ['memoryBrain.archiveSources', 'memoryBrain.archiveScanRuns', 'memoryBrain.batches(kind=history-archive-scan)'],
            noAiCall: true,
            noLegacyMutation: true,
            formalPromptInjection: false
        };
    }

    feature.historyArchiveService = { scanHistoryArchive, getArchiveCards, recordOperation, getRoutingReport };
})(window);
