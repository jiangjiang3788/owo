// --- Memory Brain history chunk service owner (v0.4.1) ---
// 编排历史切片、游标和回滚；不跑 AI、不生成事件、不接正式 prompt。
(function registerHistoryChunkService(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;

    function getPlatformApi() { return app.platform.memoryBrain.publicApi; }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function formatNumber(value) { return (Number(value) || 0).toLocaleString('zh-CN'); }
    function recordOperation(label, data, level) {
        const trace = app.platform.observability && app.platform.observability.operationTraceService;
        if (trace && typeof trace.recordOperation === 'function') return trace.recordOperation({ source: 'features/memoryBrain', sourceModule: 'features/memoryBrain/historyChunkService', label, level: level || 'event', data: data || {} });
        return null;
    }
    function compactChunk(chunk) {
        const api = app.core && app.core.memoryBrain && app.core.memoryBrain.publicApi;
        return api && typeof api.compactArchiveChunkForList === 'function' ? api.compactArchiveChunkForList(chunk) : chunk;
    }
    function compactCursor(cursor) {
        const api = app.core && app.core.memoryBrain && app.core.memoryBrain.publicApi;
        return api && typeof api.compactArchiveCursorForList === 'function' ? api.compactArchiveCursorForList(cursor) : cursor;
    }
    function prepareArchiveChunks(options = {}) {
        recordOperation('历史切片准备输入', { chunkSize: options.chunkSize || options.messageLimit || 60, overlap: options.overlap || 8, sourceLimit: options.sourceLimit || 0, sourceType: options.sourceType || 'all' });
        const result = getPlatformApi().prepareArchiveChunks(options);
        recordOperation('历史切片准备应用结果', {
            chunkRunId: result.run && result.run.id,
            sourceCount: result.run && result.run.sourceCount || 0,
            chunkCount: result.chunks && result.chunks.length || 0,
            cursorCount: result.cursors && result.cursors.length || 0,
            formalPromptInjection: false,
            writesLegacyMemory: false
        });
        return result;
    }
    function getArchiveChunkCards(options = {}) {
        const snapshot = getPlatformApi().getArchiveChunkSnapshot(options);
        const chunks = asArray(snapshot.chunks).filter(chunk => chunk && chunk.status !== 'retired');
        const cursors = asArray(snapshot.cursors).filter(cursor => cursor && cursor.status !== 'retired');
        const totals = chunks.reduce((acc, chunk) => {
            acc.chunks += 1;
            acc.messages += chunk.messageCount || 0;
            acc.estimatedChars += chunk.estimatedCharCount || 0;
            if (chunk.status === 'pending') acc.pending += 1;
            if (chunk.status === 'done') acc.done += 1;
            if (chunk.status === 'failed') acc.failed += 1;
            return acc;
        }, { chunks: 0, messages: 0, estimatedChars: 0, pending: 0, done: 0, failed: 0 });
        return {
            lastRun: snapshot.lastRun || null,
            totals,
            totalText: {
                chunks: formatNumber(totals.chunks),
                messages: formatNumber(totals.messages),
                pending: formatNumber(totals.pending),
                done: formatNumber(totals.done),
                failed: formatNumber(totals.failed)
            },
            cursors: cursors.map(compactCursor).slice(0, options.cursorLimit || 18),
            chunks: chunks.slice().sort((a, b) => String(a.sourceName || '').localeCompare(String(b.sourceName || '')) || (a.index || 0) - (b.index || 0)).slice(0, options.chunkLimit || 28).map(compactChunk),
            runs: asArray(snapshot.runs).slice(0, 10),
            nextVersion: 'v0.4.2：回填队列 / 断点续跑'
        };
    }
    function rollbackLatestArchiveChunkBatch(options = {}) {
        const snapshot = getPlatformApi().getSnapshot(options);
        const batch = asArray(snapshot.batches).find(item => item && item.kind === 'history-archive-chunking' && item.status === 'applied');
        if (!batch) throw new Error('没有可撤回的历史切片批次');
        const result = getPlatformApi().rollbackArchiveChunkBatch(batch.id, options);
        recordOperation('历史切片批次回滚', { batchId: batch.id, chunkCount: result.chunkCount || 0, cursorCount: result.cursorCount || 0, sourceCount: result.sourceCount || 0 });
        return result;
    }
    function getRoutingReport() {
        return {
            owner: 'features/memoryBrain/historyChunkService',
            release: 'v0.4.1',
            writes: ['memoryBrain.archiveChunks', 'memoryBrain.archiveCursors', 'memoryBrain.archiveChunkRuns', 'memoryBrain.batches(kind=history-archive-chunking)'],
            noAiCall: true,
            noLegacyMutation: true,
            formalPromptInjection: false
        };
    }

    feature.historyChunkService = { prepareArchiveChunks, getArchiveChunkCards, rollbackLatestArchiveChunkBatch, recordOperation, getRoutingReport };
})(window);
