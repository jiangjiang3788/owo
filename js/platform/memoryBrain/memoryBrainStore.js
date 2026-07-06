// --- Memory Brain store owner (v0.3.0) ---
// 负责 memoryBrain 根状态、旧记忆来源扫描和保存入口；不渲染 UI，不生成模型内容。
(function registerMemoryBrainStore(global) {
    const app = global.OwoApp;
    if (!app || !app.platform || !app.platform.memoryBrain) {
        throw new Error('[memoryBrainStore] OwoApp.platform.memoryBrain 尚未初始化');
    }

    function getCoreTypes() {
        const types = app.core && app.core.memoryBrain && app.core.memoryBrain.types;
        if (!types || typeof types.normalizeMemoryBrainState !== 'function') {
            throw new Error('[memoryBrainStore] core memoryBrain types 尚未加载');
        }
        return types;
    }

    function getRootState(options) {
        return (options && options.state) || global.db || {};
    }

    function nowIso() {
        return new Date().toISOString();
    }

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
        if (repository && typeof repository.saveGlobalSettings === 'function') {
            return repository.saveGlobalSettings();
        }
        return Promise.resolve(false);
    }

    function safeLength(value) {
        return Array.isArray(value) ? value.length : 0;
    }

    function readChatName(chat) {
        return chat && (chat.remarkName || chat.name || chat.realName || chat.groupName || '未命名聊天');
    }

    function countMemoryTableCells(chat) {
        const data = chat && chat.memoryTables && chat.memoryTables.data;
        if (!data || typeof data !== 'object') return 0;
        let count = 0;
        Object.keys(data).forEach(tableId => {
            const table = data[tableId];
            if (!table || typeof table !== 'object') return;
            if (Array.isArray(table.rows)) {
                table.rows.forEach(row => { count += row && typeof row === 'object' ? Object.keys(row).length : 0; });
            } else {
                count += Object.keys(table).length;
            }
        });
        return count;
    }

    function summarizeChat(chat, type) {
        const history = Array.isArray(chat && chat.history) ? chat.history : [];
        const journals = Array.isArray(chat && chat.memoryJournals) ? chat.memoryJournals : [];
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
        const characters = Array.isArray(rootState.characters) ? rootState.characters : [];
        const groups = Array.isArray(rootState.groups) ? rootState.groups : [];
        const chats = characters.map(chat => summarizeChat(chat, 'character')).concat(groups.map(chat => summarizeChat(chat, 'group')));
        const totals = chats.reduce((acc, item) => {
            acc.messages += item.messageCount;
            acc.journals += item.journalCount;
            acc.vectorEntries += item.vectorEntryCount;
            acc.tableCells += item.tableCellCount;
            return acc;
        }, { messages: 0, journals: 0, vectorEntries: 0, tableCells: 0 });
        return {
            scannedAt: nowIso(),
            chatCount: chats.length,
            characterCount: characters.length,
            groupCount: groups.length,
            totals,
            topChats: chats
                .slice()
                .sort((a, b) => b.messageCount - a.messageCount)
                .slice(0, 12),
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

    function getReplacementPlan() {
        const types = getCoreTypes();
        return types.MIGRATION_STAGES.map(stage => Object.assign({}, stage));
    }

    function getSnapshot(options = {}) {
        const state = ensureState(options);
        return JSON.parse(JSON.stringify(state));
    }

    function getRoutingReport() {
        return {
            owner: 'platform/memoryBrain/memoryBrainStore',
            release: 'v0.3.0',
            canonicalWrite: 'db.memoryBrain via storage.repository.saveGlobalSettings',
            legacyMode: 'read-only-source',
            noDualWrite: true,
            legacySources: ['chat.history', 'memoryJournals', 'memoryTables', 'vectorMemory.entries']
        };
    }

    app.platform.memoryBrain.memoryBrainStore = {
        ensureState,
        getSnapshot,
        scanLegacySources,
        rememberLegacyScan,
        getReplacementPlan,
        getRoutingReport
    };
})(window);
