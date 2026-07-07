// --- Memory Brain history chunk store owner (v0.4.1) ---
// 将 archiveSources 切成 archiveChunks / archiveCursors；不读取模型、不改旧聊天、不接正式 prompt。
(function registerHistoryChunkStore(global) {
    const app = global.OwoApp;
    const platform = app.platform.memoryBrain;
    if (!platform || !platform.memoryBrainStore) throw new Error('[historyChunkStore] memoryBrainStore 尚未加载');

    function getCoreApi() { return app.core && app.core.memoryBrain && app.core.memoryBrain.publicApi; }
    function getRootState(options) { return (options && options.state) || global.db || {}; }
    function ensureState(options) { return platform.memoryBrainStore.ensureState(options || {}); }
    function saveRootState() { return typeof platform.memoryBrainStore.saveRootState === 'function' ? platform.memoryBrainStore.saveRootState() : Promise.resolve(false); }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; } }
    function nowIso() { return new Date().toISOString(); }
    function nextId(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }

    function chatId(chat) { return chat && (chat.id || chat.contactId || chat.groupId || chat.uid || chat._id); }
    function collectChats(rootState) {
        const rows = [];
        asArray(rootState.characters).forEach((chat, index) => rows.push({ chat, type: 'character', index, id: String(chatId(chat) || `character-${index + 1}`) }));
        asArray(rootState.groups).forEach((chat, index) => rows.push({ chat, type: 'group', index, id: String(chatId(chat) || `group-${index + 1}`) }));
        return rows;
    }
    function findChatForSource(source, chatRows) {
        return asArray(chatRows).find(row => row.type === source.sourceType && row.id === String(source.sourceChatId)) || null;
    }
    function normalizeSources(state, options) {
        let sources = asArray(state.archiveSources);
        if (!sources.length && platform.historyArchiveScanner && typeof platform.historyArchiveScanner.rememberArchiveSources === 'function') {
            const scan = platform.historyArchiveScanner.rememberArchiveSources(Object.assign({}, options, { state: getRootState(options) }));
            sources = asArray(scan && scan.sources);
        }
        const sourceIds = asArray(options && options.sourceIds).map(String);
        const sourceType = options && options.sourceType && options.sourceType !== 'all' ? String(options.sourceType) : '';
        const limit = Number(options && options.sourceLimit) || 0;
        let filtered = sources.filter(source => source && source.status !== 'empty' && (source.messageCount || 0) > 0);
        if (sourceIds.length) filtered = filtered.filter(source => sourceIds.includes(String(source.id)));
        if (sourceType) filtered = filtered.filter(source => source.sourceType === sourceType);
        filtered = filtered.sort((a, b) => (b.messageCount || 0) - (a.messageCount || 0));
        return limit > 0 ? filtered.slice(0, limit) : filtered;
    }
    function buildChunksForSources(sources, chatRows, options) {
        const api = getCoreApi();
        if (!api || typeof api.buildArchiveChunks !== 'function') throw new Error('[historyChunkStore] archiveChunkSemantics 尚未加载');
        const chunks = [];
        const usableSources = [];
        asArray(sources).forEach(source => {
            const row = findChatForSource(source, chatRows);
            const history = row && row.chat ? asArray(row.chat.history) : [];
            const sourceChunks = api.buildArchiveChunks(source, history, options || {});
            if (!sourceChunks.length) return;
            usableSources.push(source);
            sourceChunks.forEach(chunk => chunks.push(chunk));
        });
        return { sources: usableSources, chunks };
    }
    function summarizeRun(run, chunks, cursors) {
        return Object.assign({}, run, {
            chunkIds: asArray(chunks).map(chunk => chunk.id),
            sourceIds: asArray(cursors).map(cursor => cursor.archiveSourceId),
            cursorIds: asArray(cursors).map(cursor => cursor.id)
        });
    }
    function applySourceChunkMetadata(sources, processedSources, cursors, createdAt, runId) {
        const cursorBySource = new Map(asArray(cursors).map(cursor => [cursor.archiveSourceId, cursor]));
        const processedIds = new Set(asArray(processedSources).map(source => source.id));
        return asArray(sources).map(source => {
            if (!processedIds.has(source.id)) return source;
            const cursor = cursorBySource.get(source.id);
            return Object.assign({}, source, {
                chunkStatus: cursor && cursor.totalChunks ? 'prepared' : 'empty',
                actualChunkCount: cursor ? cursor.totalChunks : 0,
                cursorId: cursor ? cursor.id : null,
                chunkRunId: runId,
                chunkedAt: createdAt,
                nextAction: cursor && cursor.totalChunks ? 'event-backfill-v0.4.3' : 'skip-empty'
            });
        });
    }
    function prepareArchiveChunks(options = {}) {
        const state = ensureState(options);
        const rootState = getRootState(options);
        const createdAt = nowIso();
        const runId = options.runId || nextId('archive-chunk-run');
        const api = getCoreApi();
        const selectedSources = normalizeSources(state, options);
        const chatRows = collectChats(rootState);
        const built = buildChunksForSources(selectedSources, chatRows, options);
        const cursors = api.buildArchiveCursors(built.sources, built.chunks, options || {}).map(cursor => Object.assign({}, cursor, { runId, createdAt, updatedAt: createdAt }));
        const chunks = built.chunks.map(chunk => Object.assign({}, chunk, { runId, createdAt, updatedAt: createdAt }));
        const report = api.buildArchiveChunkRunReport(chunks, cursors, Object.assign({}, options, { id: runId }));
        const run = summarizeRun(Object.assign({}, report, { id: runId, createdAt, updatedAt: createdAt, status: 'completed' }), chunks, cursors);
        const processedIds = new Set(built.sources.map(source => source.id));
        const beforeChunks = asArray(state.archiveChunks).filter(chunk => chunk && processedIds.has(chunk.archiveSourceId));
        const beforeCursors = asArray(state.archiveCursors).filter(cursor => cursor && processedIds.has(cursor.archiveSourceId));
        const beforeSources = asArray(state.archiveSources).filter(source => source && processedIds.has(source.id));
        const batch = {
            id: nextId('memory-brain-batch'),
            kind: 'history-archive-chunking',
            status: 'applied',
            createdAt,
            updatedAt: createdAt,
            mode: state.settings && state.settings.mode || 'shadow',
            archiveChunkRunId: run.id,
            sourceIds: run.sourceIds,
            cursorIds: run.cursorIds,
            chunkIds: run.chunkIds,
            chunkCount: chunks.length,
            cursorCount: cursors.length,
            input: { policy: report.policy, sourceLimit: Number(options.sourceLimit) || 0, sourceType: options.sourceType || 'all' },
            beforeChunks: clone(beforeChunks),
            beforeCursors: clone(beforeCursors),
            beforeSources: clone(beforeSources),
            writesLegacyMemory: false,
            formalPromptInjection: false
        };
        state.archiveChunks = asArray(state.archiveChunks).filter(chunk => !processedIds.has(chunk && chunk.archiveSourceId)).concat(chunks);
        state.archiveCursors = asArray(state.archiveCursors).filter(cursor => !processedIds.has(cursor && cursor.archiveSourceId)).concat(cursors);
        state.archiveSources = applySourceChunkMetadata(state.archiveSources, built.sources, cursors, createdAt, run.id);
        state.archiveChunkRuns = [run].concat(asArray(state.archiveChunkRuns)).slice(0, 40);
        state.lastArchiveChunkRun = run;
        state.batches = [batch].concat(asArray(state.batches));
        state.updatedAt = createdAt;
        saveRootState();
        return clone({ run, chunks, cursors, batch, sources: built.sources });
    }
    function listArchiveChunks(options = {}) {
        return asArray(ensureState(options).archiveChunks).filter(chunk => !options.status || chunk.status === options.status)
            .slice().sort((a, b) => String(a.sourceName || '').localeCompare(String(b.sourceName || '')) || (a.index || 0) - (b.index || 0)).map(clone);
    }
    function listArchiveCursors(options = {}) {
        return asArray(ensureState(options).archiveCursors).slice().sort((a, b) => (b.totalChunks || 0) - (a.totalChunks || 0)).map(clone);
    }
    function listArchiveChunkRuns(options = {}) {
        return asArray(ensureState(options).archiveChunkRuns).slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).map(clone);
    }
    function getArchiveChunkSnapshot(options = {}) {
        const state = ensureState(options);
        return clone({ chunks: asArray(state.archiveChunks), cursors: asArray(state.archiveCursors), runs: asArray(state.archiveChunkRuns), lastRun: state.lastArchiveChunkRun || null });
    }
    function rollbackArchiveChunkBatch(batchId, options = {}) {
        const state = ensureState(options);
        const batch = asArray(state.batches).find(item => item && item.id === batchId && item.kind === 'history-archive-chunking');
        if (!batch) throw new Error('找不到历史切片批次');
        const sourceIds = new Set(asArray(batch.sourceIds));
        const chunkIds = new Set(asArray(batch.chunkIds));
        const cursorIds = new Set(asArray(batch.cursorIds));
        state.archiveChunks = asArray(state.archiveChunks).filter(chunk => chunk && !chunkIds.has(chunk.id) && !sourceIds.has(chunk.archiveSourceId)).concat(asArray(batch.beforeChunks));
        state.archiveCursors = asArray(state.archiveCursors).filter(cursor => cursor && !cursorIds.has(cursor.id) && !sourceIds.has(cursor.archiveSourceId)).concat(asArray(batch.beforeCursors));
        const beforeSourceMap = new Map(asArray(batch.beforeSources).map(source => [source.id, source]));
        state.archiveSources = asArray(state.archiveSources).map(source => beforeSourceMap.get(source.id) || (sourceIds.has(source.id) ? Object.assign({}, source, { chunkStatus: 'rolled-back', actualChunkCount: 0, cursorId: null, chunkRunId: null, nextAction: 'prepare-chunks-v0.4.1' }) : source));
        state.archiveChunkRuns = asArray(state.archiveChunkRuns).map(run => run && run.id === batch.archiveChunkRunId ? Object.assign({}, run, { status: 'rolled-back', rolledBackAt: nowIso() }) : run);
        state.batches = asArray(state.batches).map(item => item && item.id === batch.id ? Object.assign({}, item, { status: 'rolled-back', rolledBackAt: nowIso() }) : item);
        state.lastArchiveChunkRun = asArray(state.archiveChunkRuns).find(run => run && run.status === 'completed') || null;
        state.updatedAt = nowIso();
        saveRootState();
        return clone({ ok: true, chunkCount: chunkIds.size, cursorCount: cursorIds.size, sourceCount: sourceIds.size, batchId: batch.id });
    }
    function getRoutingReport() {
        return {
            owner: 'platform/memoryBrain/historyChunkStore',
            release: 'v0.4.1',
            chunkWrite: 'memoryBrain.archiveChunks + memoryBrain.archiveCursors + memoryBrain.archiveChunkRuns + memoryBrain.batches only',
            noAiCall: true,
            noLegacyMutation: true,
            formalPromptInjection: false
        };
    }

    platform.historyChunkStore = {
        prepareArchiveChunks,
        listArchiveChunks,
        listArchiveCursors,
        listArchiveChunkRuns,
        getArchiveChunkSnapshot,
        rollbackArchiveChunkBatch,
        getRoutingReport
    };
})(window);
