// --- Journal service owner (V25 canonical owner) ---
// 只负责回忆日记的状态服务和运行时绑定；不渲染界面，不改聊天提示词主编排，不碰向量记忆。
(function registerJournalService(global) {
    const OwoApp = global.OwoApp;
    const feature = OwoApp.features.journal = OwoApp.features.journal || {};
    const semantics = OwoApp.core.memory.journalSemantics;

    function ensureJournalList(chat) {
        if (!chat) return [];
        if (!Array.isArray(chat.memoryJournals)) chat.memoryJournals = [];
        return chat.memoryJournals;
    }

    function getChatByContext(context) {
        const ctx = context || {};
        const state = ctx.state || global.db || {};
        const chatId = ctx.currentChatId || global.currentChatId;
        const chatType = ctx.currentChatType || global.currentChatType || 'private';
        const list = chatType === 'private' ? (state.characters || []) : (state.groups || []);
        return list.find(item => item && item.id === chatId) || null;
    }

    function getJournalDisplayItems(chat, searchQuery) {
        const journals = ensureJournalList(chat);
        const favoriteTop = chat ? chat.journalFavoriteTop !== false : true;
        return semantics.getJournalsForDisplay(journals, searchQuery, { favoriteTop });
    }

    function addManualJournal(chat, input, context) {
        const journal = semantics.createManualJournal(input, context || {});
        if (!journal) return null;
        ensureJournalList(chat).push(journal);
        return journal;
    }

    function importJournals(chat, rawItems, context) {
        const journals = semantics.normalizeImportedJournals(rawItems, context || {});
        if (!journals.length) return [];
        ensureJournalList(chat).push(...journals);
        return journals;
    }

    function deleteJournal(chat, journalId) {
        if (!chat || !Array.isArray(chat.memoryJournals)) return false;
        const before = chat.memoryJournals.length;
        chat.memoryJournals = chat.memoryJournals.filter(item => item && item.id !== journalId);
        return chat.memoryJournals.length !== before;
    }

    function deleteJournals(chat, journalIds) {
        if (!chat || !Array.isArray(chat.memoryJournals)) return 0;
        const idSet = new Set(Array.isArray(journalIds) ? journalIds : []);
        const before = chat.memoryJournals.length;
        chat.memoryJournals = chat.memoryJournals.filter(item => !item || !idSet.has(item.id));
        return before - chat.memoryJournals.length;
    }

    function toggleJournalFavorite(chat, journalId) {
        const journal = ensureJournalList(chat).find(item => item && item.id === journalId);
        if (!journal) return null;
        journal.isFavorited = !journal.isFavorited;
        return journal.isFavorited;
    }

    function updateJournalDetail(chat, journalId, title, content) {
        const journal = ensureJournalList(chat).find(item => item && item.id === journalId);
        if (!journal) return null;
        journal.title = String(title || '').trim();
        journal.content = String(content || '').trim();
        return journal;
    }

    function createMergedJournalDraft(chat, journalIds, context) {
        const selected = semantics.selectJournalsByIds(ensureJournalList(chat), journalIds);
        if (!selected.length) return null;
        const first = selected[0];
        const last = selected[selected.length - 1];
        return {
            selectedJournals: selected,
            mergedStart: semantics.getJournalRangeStart(first),
            mergedEnd: semantics.getJournalRangeEnd(last),
            summaryPrompt: semantics.buildMergeJournalPrompt(selected, { realName: chat && chat.realName })
        };
    }

    function addGeneratedJournal(chat, journalData, context) {
        const journal = semantics.normalizeJournal(Object.assign({}, journalData || {}, {
            id: semantics.createJournalId('journal'),
            createdAt: Date.now(),
            isFavorited: false
        }), context || {});
        if (!journal) return null;
        ensureJournalList(chat).push(journal);
        return journal;
    }

    function migrateJournalSettings(chat) {
        if (!chat || chat.journalStyleSettings) return null;
        const oldJournalIds = chat.journalWorldBookIds || [];
        let isOfflineNode = false;
        if (chat.activeNodeId && chat.nodes) {
            const activeNode = chat.nodes.find(item => item.id === chat.activeNodeId);
            if (activeNode) {
                const baseMode = activeNode.customConfig && activeNode.customConfig.baseMode
                    ? activeNode.customConfig.baseMode
                    : (activeNode.type === 'offline' || (activeNode.type === 'spinoff' && activeNode.spinoffMode === 'offline') ? 'offline' : 'online');
                isOfflineNode = baseMode === 'offline';
            }
        }
        let chatCommonIds = chat.worldBookIds || [];
        if (isOfflineNode) {
            chatCommonIds = (chat.offlineWorldBookIds && chat.offlineWorldBookIds.length > 0)
                ? chat.offlineWorldBookIds
                : (chat.worldBookIds || []);
        }
        const uniqueCustomIds = oldJournalIds.filter(id => !chatCommonIds.includes(id));
        let newMode = 'default';
        let migrationMsg = '';
        if (oldJournalIds.length > 0) {
            if (uniqueCustomIds.length === 0) {
                migrationMsg = '日记功能升级：已自动关联聊天室背景，您的旧设置已合并到“默认风格”。';
            } else {
                newMode = 'custom';
                migrationMsg = `日记功能升级：已自动关联聊天室背景，剩余 ${uniqueCustomIds.length} 个特殊设定已保留在“自定义风格”中。`;
            }
        }
        chat.journalStyleSettings = {
            mode: newMode,
            customWorldBookIds: uniqueCustomIds
        };
        return migrationMsg;
    }

    function ensureAutoJournalState(chat, runtime) {
        if (!chat) return;
        const history = Array.isArray(chat.history) ? chat.history : [];
        const legacyIndex = parseInt(chat.lastAutoJournalIndex, 10);
        if (chat.journalIncludeFavorited === undefined) chat.journalIncludeFavorited = false;
        if (!chat.autoJournalState) chat.autoJournalState = 'idle';
        if (chat.autoJournalPending === undefined) chat.autoJournalPending = false;
        const ctx = runtime || {};
        if (chat.autoJournalState === 'running' && (!ctx.isGenerating || ctx.generatingChatId !== chat.id)) {
            chat.autoJournalState = 'idle';
        }
        if (chat.lastSummarizedMsgId === undefined) {
            if (!isNaN(legacyIndex) && legacyIndex > 0 && legacyIndex <= history.length) {
                const legacyMessage = history[legacyIndex - 1];
                chat.lastSummarizedMsgId = legacyMessage ? legacyMessage.id : null;
                chat.lastSummarizedMsgTimestamp = legacyMessage ? legacyMessage.timestamp || null : null;
            } else {
                chat.lastSummarizedMsgId = null;
                if (chat.lastSummarizedMsgTimestamp === undefined) chat.lastSummarizedMsgTimestamp = null;
            }
        }
    }

    function getAutoJournalCursorInfo(chat, runtime) {
        ensureAutoJournalState(chat, runtime);
        const history = Array.isArray(chat && chat.history) ? chat.history : [];
        const interval = Math.max(10, parseInt(chat && chat.autoJournalInterval, 10) || 100);
        let nextStartIndex = 0;
        if (chat) {
            let foundIndex = -1;
            if (chat.lastSummarizedMsgId) {
                foundIndex = history.findIndex(message => message.id === chat.lastSummarizedMsgId);
            }
            if (foundIndex !== -1) {
                nextStartIndex = foundIndex + 1;
            } else {
                let maxEnd = 0;
                ensureJournalList(chat).forEach(item => {
                    if (item.range && typeof item.range.end === 'number') maxEnd = Math.max(maxEnd, item.range.end);
                });
                if (maxEnd > 0) {
                    nextStartIndex = Math.min(maxEnd, history.length);
                } else if (chat.lastAutoJournalIndex !== undefined && !isNaN(parseInt(chat.lastAutoJournalIndex, 10))) {
                    nextStartIndex = Math.max(0, Math.min(parseInt(chat.lastAutoJournalIndex, 10), history.length));
                }
            }
        }
        const unsummarizedCount = Math.max(0, history.length - nextStartIndex);
        const completedBatchCount = Math.floor(unsummarizedCount / interval);
        return { history, interval, cursorIndex: nextStartIndex - 1, nextStartIndex, unsummarizedCount, completedBatchCount };
    }

    function getNextAutoJournalRange(chat, runtime) {
        const info = getAutoJournalCursorInfo(chat, runtime);
        if (info.completedBatchCount <= 0) return null;
        return { start: info.nextStartIndex + 1, end: info.nextStartIndex + info.interval, info };
    }

    function setAutoJournalCursorByMessage(chat, message, runtime) {
        ensureAutoJournalState(chat, runtime);
        chat.lastSummarizedMsgId = message ? message.id : null;
        chat.lastSummarizedMsgTimestamp = message ? (message.timestamp || null) : null;
        chat.autoJournalState = 'idle';
    }

    function setAutoJournalCursorByEndIndex(chat, endIndex, runtime) {
        const history = Array.isArray(chat && chat.history) ? chat.history : [];
        const message = history[endIndex - 1] || null;
        setAutoJournalCursorByMessage(chat, message, runtime);
        chat.lastAutoJournalIndex = endIndex;
    }

    function resetAutoJournalCursorToLatest(chat, runtime) {
        const history = Array.isArray(chat && chat.history) ? chat.history : [];
        setAutoJournalCursorByMessage(chat, history.length ? history[history.length - 1] : null, runtime);
        chat.lastAutoJournalIndex = history.length;
        chat.autoJournalPending = false;
    }

    function syncAutoJournalCursorAfterManualSummary(chat, start, end, runtime) {
        ensureAutoJournalState(chat, runtime);
        if (!chat || !chat.autoJournalEnabled) return;
        const info = getAutoJournalCursorInfo(chat, runtime);
        const nextPendingStart = info.nextStartIndex + 1;
        if (start > nextPendingStart) return;
        setAutoJournalCursorByEndIndex(chat, Math.max(end, nextPendingStart - 1), runtime);
        chat.autoJournalPending = false;
    }

    function getAutoJournalChatType(chat, options) {
        const state = options && options.state || global.db || {};
        if ((state.characters || []).some(character => character.id === chat.id)) return 'private';
        return 'group';
    }

    feature.service = {
        ensureJournalList,
        getChatByContext,
        getJournalDisplayItems,
        addManualJournal,
        importJournals,
        deleteJournal,
        deleteJournals,
        toggleJournalFavorite,
        updateJournalDetail,
        createMergedJournalDraft,
        addGeneratedJournal,
        migrateJournalSettings,
        ensureAutoJournalState,
        getAutoJournalCursorInfo,
        getNextAutoJournalRange,
        setAutoJournalCursorByMessage,
        setAutoJournalCursorByEndIndex,
        resetAutoJournalCursorToLatest,
        syncAutoJournalCursorAfterManualSummary,
        getAutoJournalChatType
    };
})(window);
