// --- Memory Brain store owner (v0.4.1) ---
// 负责 memoryBrain 根状态、旧记忆来源扫描和事件批次保存入口；不渲染 UI，不生成模型内容。
(function registerMemoryBrainStore(global) {
    const app = global.OwoApp;
    if (!app || !app.platform || !app.platform.memoryBrain) {
        throw new Error('[memoryBrainStore] OwoApp.platform.memoryBrain 尚未初始化');
    }

    function getCoreTypes() {
        const types = app.core && app.core.memoryBrain && app.core.memoryBrain.types;
        if (!types || typeof types.normalizeMemoryBrainState !== 'function') throw new Error('[memoryBrainStore] core memoryBrain types 尚未加载');
        return types;
    }
    function getRootState(options) { return (options && options.state) || global.db || {}; }
    function nowIso() { return new Date().toISOString(); }
    function nextId(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
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
    function normalizeArray(value) { return Array.isArray(value) ? value : []; }

    function ensureState(options = {}) {
        const rootState = getRootState(options);
        const types = getCoreTypes();
        const normalized = types.normalizeMemoryBrainState(rootState.memoryBrain);
        if (!normalized.createdAt) normalized.createdAt = nowIso();
        normalized.updatedAt = normalized.updatedAt || normalized.createdAt;
        rootState.memoryBrain = normalized;
        return rootState.memoryBrain;
    }
    function saveRootState() {
        const repository = app.platform && app.platform.storage && app.platform.storage.repository;
        if (repository && typeof repository.saveGlobalSettings === 'function') return repository.saveGlobalSettings();
        return Promise.resolve(false);
    }

    function readChatName(chat) { return chat && (chat.remarkName || chat.name || chat.realName || chat.groupName || '未命名聊天'); }
    function countMemoryTableCells(chat) {
        const data = chat && chat.memoryTables && chat.memoryTables.data;
        if (!data || typeof data !== 'object') return 0;
        let count = 0;
        Object.keys(data).forEach(tableId => {
            const table = data[tableId];
            if (!table || typeof table !== 'object') return;
            if (Array.isArray(table.rows)) table.rows.forEach(row => { count += row && typeof row === 'object' ? Object.keys(row).length : 0; });
            else count += Object.keys(table).length;
        });
        return count;
    }
    function summarizeChat(chat, type) {
        const history = normalizeArray(chat && chat.history);
        const journals = normalizeArray(chat && chat.memoryJournals);
        const vectorEntries = chat && chat.vectorMemory && Array.isArray(chat.vectorMemory.entries) ? chat.vectorMemory.entries : [];
        const tableCells = countMemoryTableCells(chat);
        return {
            id: chat && chat.id,
            type,
            name: readChatName(chat),
            messageCount: history.length,
            journalCount: journals.length,
            vectorEntryCount: vectorEntries.length,
            tableCellCount: tableCells,
            lastMessageAt: history.length ? (history[history.length - 1].timestamp || history[history.length - 1].time || null) : null
        };
    }
    function scanLegacySources(options = {}) {
        const rootState = getRootState(options);
        const characters = normalizeArray(rootState.characters);
        const groups = normalizeArray(rootState.groups);
        const chats = characters.map(chat => summarizeChat(chat, 'character')).concat(groups.map(chat => summarizeChat(chat, 'group')));
        const totals = chats.reduce((acc, item) => {
            acc.messages += item.messageCount;
            acc.journals += item.journalCount;
            acc.vectorEntries += item.vectorEntryCount;
            acc.tableCells += item.tableCellCount;
            return acc;
        }, { messages: 0, journals: 0, vectorEntries: 0, tableCells: 0 });
        return {
            scannedAt: nowIso(), chatCount: chats.length, characterCount: characters.length, groupCount: groups.length,
            totals,
            topChats: chats.slice().sort((a, b) => b.messageCount - a.messageCount).slice(0, 12),
            sources: [
                { id: 'history', name: '聊天原文', mode: 'read-source', count: totals.messages },
                { id: 'journal', name: '回忆日记', mode: 'read-source', count: totals.journals },
                { id: 'memoryTable', name: '记忆表格', mode: 'read-source', count: totals.tableCells },
                { id: 'vectorMemory', name: '向量记忆', mode: 'read-source', count: totals.vectorEntries }
            ]
        };
    }
    function rememberLegacyScan(options = {}) {
        const state = ensureState(options);
        state.lastLegacyScan = scanLegacySources(options);
        state.updatedAt = nowIso();
        saveRootState();
        return state.lastLegacyScan;
    }

    function getReplacementPlan() { return getCoreTypes().MIGRATION_STAGES.map(stage => Object.assign({}, stage)); }
    function getSnapshot(options = {}) { return safeClone(ensureState(options)); }
    function listEvents(options = {}) {
        return normalizeArray(ensureState(options).events).slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    }

    function appendEventSummaryBatch(payload = {}, options = {}) {
        const state = ensureState(options);
        const createdAt = nowIso();
        const batchId = payload.batchId || nextId('memory-brain-batch');
        let event = null;
        if (payload.event) {
            event = Object.assign({
                id: payload.event.id || nextId('memory-event'),
                layer: 'event', kind: 'summary', status: 'active',
                mode: state.settings && state.settings.mode || 'shadow',
                createdAt, updatedAt: createdAt, batchId
            }, safeClone(payload.event));
            event.batchId = batchId;
            event.updatedAt = createdAt;
            state.events = normalizeArray(state.events).filter(item => item && item.id !== event.id);
            state.events.unshift(event);
        }
        const batch = {
            id: batchId,
            kind: 'event-summary',
            status: event ? 'applied' : 'error',
            createdAt,
            updatedAt: createdAt,
            mode: state.settings && state.settings.mode || 'shadow',
            input: safeClone(payload.input || {}),
            rawOutput: clipText(payload.rawOutput, 16000),
            parsedDraft: safeClone(payload.parsedDraft || null),
            parserDiagnostics: normalizeArray(payload.parserDiagnostics),
            eventIds: event ? [event.id] : [],
            errorMessage: payload.errorMessage || ''
        };
        state.batches = normalizeArray(state.batches).filter(item => item && item.id !== batch.id);
        state.batches.unshift(batch);
        state.updatedAt = createdAt;
        saveRootState();
        return safeClone({ batch, event });
    }

    function getRoutingReport() {
        return {
            owner: 'platform/memoryBrain/memoryBrainStore',
            release: 'v0.4.1',
            canonicalWrite: 'db.memoryBrain via storage.repository.saveGlobalSettings',
            eventWrite: 'memoryBrain.events + memoryBrain.batches only',
            archiveSourceWrite: 'handled by platform/memoryBrain/historyArchiveScanner',
            legacyMode: 'read-only-source',
            noDualWrite: true,
            legacySources: ['chat.history', 'memoryJournals', 'memoryTables', 'vectorMemory.entries']
        };
    }

    app.platform.memoryBrain.memoryBrainStore = {
        ensureState,
        saveRootState,
        getSnapshot,
        scanLegacySources,
        rememberLegacyScan,
        getReplacementPlan,
        listEvents,
        appendEventSummaryBatch,
        getRoutingReport
    };
})(window);
