// --- Memory Brain history archive scanner owner (v0.4.0) ---
// 扫描全部聊天，建立 archiveSources / archiveScanRuns；不改旧聊天、不跑 AI、不做切片。
(function registerHistoryArchiveScanner(global) {
    const app = global.OwoApp;
    const platform = app.platform.memoryBrain;
    if (!platform || !platform.memoryBrainStore) throw new Error('[historyArchiveScanner] memoryBrainStore 尚未加载');

    function getCoreApi() { return app.core && app.core.memoryBrain && app.core.memoryBrain.publicApi; }
    function getRootState(options) { return (options && options.state) || global.db || {}; }
    function ensureState(options) { return platform.memoryBrainStore.ensureState(options || {}); }
    function saveRootState() { return typeof platform.memoryBrainStore.saveRootState === 'function' ? platform.memoryBrainStore.saveRootState() : Promise.resolve(false); }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function nowIso() { return new Date().toISOString(); }
    function nextId(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
    function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; } }

    function collectChats(rootState) {
        return asArray(rootState.characters).map((chat, index) => ({ chat, type: 'character', index }))
            .concat(asArray(rootState.groups).map((chat, index) => ({ chat, type: 'group', index })));
    }
    function createSources(rootState, options) {
        const api = getCoreApi();
        if (!api || typeof api.buildArchiveSourceFromChat !== 'function') throw new Error('[historyArchiveScanner] archiveSourceSemantics 尚未加载');
        return collectChats(rootState).map(item => api.buildArchiveSourceFromChat(item.chat, item.type, item.index, options || {}));
    }
    function filterSources(sources, options) {
        const opts = options || {};
        const minMessages = Number(opts.minMessages || 0);
        const sourceType = opts.sourceType && String(opts.sourceType) !== 'all' ? String(opts.sourceType) : '';
        const keyword = String(opts.keyword || '').trim().toLowerCase();
        return asArray(sources).filter(source => {
            if (minMessages && (source.messageCount || 0) < minMessages) return false;
            if (sourceType && source.sourceType !== sourceType) return false;
            if (keyword && String(source.name || '').toLowerCase().indexOf(keyword) === -1) return false;
            return true;
        });
    }
    function scanArchiveSources(options = {}) {
        const rootState = getRootState(options);
        const allSources = createSources(rootState, options);
        const filteredSources = filterSources(allSources, options);
        const api = getCoreApi();
        const scanId = options.scanId || nextId('archive-scan');
        const report = api.buildArchiveScanReport(filteredSources, { id: scanId, scannedAt: nowIso(), topLimit: options.topLimit || 12 });
        report.allSourceCount = allSources.length;
        report.filteredSourceCount = filteredSources.length;
        report.filter = { minMessages: Number(options.minMessages || 0), sourceType: options.sourceType || 'all', keyword: options.keyword || '' };
        return { scanId, report, sources: filteredSources };
    }
    function rememberArchiveSources(options = {}) {
        const state = ensureState(options);
        const createdAt = nowIso();
        const result = scanArchiveSources(Object.assign({}, options, { scanId: options.scanId || nextId('archive-scan') }));
        const run = Object.assign({}, result.report, {
            id: result.scanId,
            status: 'completed',
            createdAt,
            updatedAt: createdAt,
            sourceIds: result.sources.map(source => source.id),
            mode: state.settings && state.settings.mode || 'shadow',
            formalInjection: false
        });
        const batch = {
            id: nextId('memory-brain-batch'),
            kind: 'history-archive-scan',
            status: 'applied',
            createdAt,
            updatedAt: createdAt,
            mode: run.mode,
            archiveScanRunId: run.id,
            sourceCount: result.sources.length,
            totalMessages: run.totalMessages,
            estimatedChunkCount: run.estimatedChunkCount,
            input: { chunkPolicy: { messageLimit: Number(options.chunkSize) || 60, overlap: Number(options.overlap) || 8 }, filter: run.filter || {} },
            sourceIds: run.sourceIds,
            writesLegacyMemory: false,
            formalPromptInjection: false
        };
        state.archiveSources = result.sources.map(source => Object.assign({}, source, { scanRunId: run.id, scannedAt: createdAt }));
        state.archiveScanRuns = [run].concat(asArray(state.archiveScanRuns)).slice(0, 40);
        state.lastArchiveScan = run;
        state.batches = [batch].concat(asArray(state.batches));
        state.updatedAt = createdAt;
        saveRootState();
        return clone({ run, sources: state.archiveSources, batch });
    }
    function listArchiveSources(options = {}) {
        return asArray(ensureState(options).archiveSources).slice().sort((a, b) => (b.messageCount || 0) - (a.messageCount || 0)).map(item => clone(item));
    }
    function listArchiveScanRuns(options = {}) {
        return asArray(ensureState(options).archiveScanRuns).slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).map(item => clone(item));
    }
    function getArchiveSnapshot(options = {}) {
        const state = ensureState(options);
        return clone({ sources: asArray(state.archiveSources), runs: asArray(state.archiveScanRuns), lastScan: state.lastArchiveScan || null });
    }
    function getRoutingReport() {
        return {
            owner: 'platform/memoryBrain/historyArchiveScanner',
            release: 'v0.4.0',
            archiveWrite: 'memoryBrain.archiveSources + memoryBrain.archiveScanRuns + memoryBrain.batches only',
            noAiCall: true,
            noLegacyMutation: true,
            formalPromptInjection: false
        };
    }

    platform.historyArchiveScanner = {
        scanArchiveSources,
        rememberArchiveSources,
        listArchiveSources,
        listArchiveScanRuns,
        getArchiveSnapshot,
        getRoutingReport
    };
})(window);
