// --- Legacy memory owner semantics (v0.3.10) ---
// 只负责旧记忆三件套的 owner 判断：journal / table / vector 三选一。
// 不访问 DOM，不请求网络，不读写存储状态；v0.8.13 仅维持日记 / 档案 / 向量三套旧记忆的兼容选择。
(function registerLegacyMemoryOwnerSemantics(app) {
    const core = app.core = app.core || {};
    core.memory = core.memory || {};

    const MEMORY_MODES = Object.freeze(['journal', 'table', 'vector']);
    const MODE_LABELS = Object.freeze({
        journal: '日记记忆',
        table: '档案/表格记忆',
        vector: '向量记忆'
    });

    function normalizeMemoryMode(mode) {
        const value = String(mode || '').trim().toLowerCase();
        if (value === 'table' || value === 'structured' || value === 'archive') return 'table';
        if (value === 'vector' || value === 'embedding') return 'vector';
        return 'journal';
    }

    function getActiveMemoryMode(chat) {
        return normalizeMemoryMode(chat && chat.memoryMode);
    }

    function isMemoryMode(chat, mode) {
        return getActiveMemoryMode(chat) === normalizeMemoryMode(mode);
    }

    function isJournalOwner(chat) { return isMemoryMode(chat, 'journal'); }
    function isTableOwner(chat) { return isMemoryMode(chat, 'table'); }
    function isVectorOwner(chat) { return isMemoryMode(chat, 'vector'); }

    function getModeLabel(mode) {
        const normalized = normalizeMemoryMode(mode);
        return MODE_LABELS[normalized] || MODE_LABELS.journal;
    }

    function shouldInjectJournalMemory(chat) { return isJournalOwner(chat); }
    function shouldInjectTableMemory(chat) { return isTableOwner(chat); }
    function shouldInjectVectorMemory(chat) { return isVectorOwner(chat); }

    function shouldRunAutoJournal(chat) {
        return !!(chat && chat.autoJournalEnabled && isJournalOwner(chat));
    }

    function shouldRunAutoTableUpdate(chat) {
        return !!(chat && chat.memoryTables && chat.memoryTables.autoUpdateEnabled && isTableOwner(chat));
    }

    function shouldRunVectorAutoSummary(chat) {
        return !!(chat && chat.vectorMemory && chat.vectorMemory.autoSummaryEnabled && isVectorOwner(chat));
    }

    function getOwnerMismatchReason(chat, expectedMode) {
        const activeMode = getActiveMemoryMode(chat);
        const expected = normalizeMemoryMode(expectedMode);
        if (activeMode === expected) return '';
        return `当前正式记忆 owner 是${getModeLabel(activeMode)}，${getModeLabel(expected)}已暂停自动注入/自动整理。`;
    }

    function ensureRuntimeOwnerState(chat) {
        if (!chat) return null;
        const mode = getActiveMemoryMode(chat);
        if (mode !== 'journal') {
            chat.autoJournalPending = false;
            if (chat.autoJournalState === 'running' || chat.autoJournalState === 'queued') chat.autoJournalState = 'idle';
        }
        if (mode !== 'table' && chat.memoryTables) {
            chat.memoryTables.autoUpdatePending = false;
            if (chat.memoryTables.autoUpdateState === 'running' || chat.memoryTables.autoUpdateState === 'queued') chat.memoryTables.autoUpdateState = 'idle';
        }
        if (mode !== 'vector' && chat.vectorMemory) {
            chat.vectorMemory.autoSummaryPending = false;
            if (chat.vectorMemory.autoSummaryState === 'running' || chat.vectorMemory.autoSummaryState === 'queued') chat.vectorMemory.autoSummaryState = 'idle';
        }
        return mode;
    }

    function buildOwnerSnapshot(chat) {
        const mode = getActiveMemoryMode(chat);
        return {
            formalOwner: mode,
            formalOwnerLabel: getModeLabel(mode),
            journalCanInject: mode === 'journal',
            tableCanInject: mode === 'table',
            vectorCanInject: mode === 'vector',
            journalAutoAllowed: shouldRunAutoJournal(chat),
            tableAutoAllowed: shouldRunAutoTableUpdate(chat),
            vectorAutoAllowed: shouldRunVectorAutoSummary(chat)
        };
    }

    core.memory.legacyMemoryOwnerSemantics = {
        MEMORY_MODES,
        MODE_LABELS,
        normalizeMemoryMode,
        getActiveMemoryMode,
        isMemoryMode,
        isJournalOwner,
        isTableOwner,
        isVectorOwner,
        getModeLabel,
        shouldInjectJournalMemory,
        shouldInjectTableMemory,
        shouldInjectVectorMemory,
        shouldRunAutoJournal,
        shouldRunAutoTableUpdate,
        shouldRunVectorAutoSummary,
        getOwnerMismatchReason,
        ensureRuntimeOwnerState,
        buildOwnerSnapshot
    };
})(OwoApp);
