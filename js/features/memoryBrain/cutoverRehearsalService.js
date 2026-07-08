// --- Memory Brain cutover rehearsal service owner (v0.4.8) ---
// 编排旧正式记忆注入块 vs Memory Brain shadow 注入包对照；只生成报告，不正式接管 prompt。
(function registerMemoryBrainCutoverRehearsalService(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;

    function rootState(options) { return (options && options.state) || global.db || {}; }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function asText(value) { return String(value == null ? '' : value).trim(); }
    function clip(value, max) { const text = asText(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n'); return text.length > max ? text.slice(0, max - 1) + '…' : text; }
    function getCoreApi() { return app.core.memoryBrain.publicApi; }
    function getPlatformApi() { return app.platform.memoryBrain.publicApi; }
    function record(label, data, level) {
        if (feature.service && typeof feature.service.recordOperation === 'function') return feature.service.recordOperation(label, data || {}, level || 'event');
        return null;
    }
    function chatName(chat) { return chat && (chat.remarkName || chat.name || chat.realName || chat.groupName || '未命名聊天'); }
    function getPrivateChat(state, id) { return asArray(state.characters).find(item => item && item.id === id) || null; }
    function getGroupChat(state, id) { return asArray(state.groups).find(item => item && item.id === id) || null; }
    function findFallbackChat(state) {
        return asArray(state.characters).map(chat => ({ chat, chatType: 'private' })).concat(asArray(state.groups).map(chat => ({ chat, chatType: 'group' })))
            .filter(item => asArray(item.chat && item.chat.history).length)
            .sort((a, b) => asArray(b.chat.history).length - asArray(a.chat.history).length)[0] || null;
    }
    function resolveActiveChat(options = {}) {
        const state = rootState(options);
        const currentType = options.chatType || global.currentChatType;
        const currentId = options.chatId || global.currentChatId;
        let chat = currentType === 'group' ? getGroupChat(state, currentId) : currentType === 'private' ? getPrivateChat(state, currentId) : null;
        let chatType = currentType;
        if (!chat) { const fallback = findFallbackChat(state); chat = fallback && fallback.chat; chatType = fallback && fallback.chatType; }
        return chat ? { chat, chatType: chatType || 'private', chatId: chat.id, chatName: chatName(chat) } : { chat: null, chatType: '', chatId: '', chatName: '' };
    }
    function messageText(message) {
        const msg = message || {};
        if (msg.isVoice && msg.voiceText) return msg.voiceText;
        const parts = asArray(msg.parts).map(part => part && (part.text || part.content) || '').filter(Boolean).join('\n');
        return parts || msg.content || msg.text || '';
    }
    function latestUserMessage(chat) {
        return asArray(chat && chat.history).slice().reverse().find(message => message && message.role === 'user' && messageText(message)) || null;
    }
    function resolveQuery(options, chatInfo) {
        const direct = asText(options.query || options.userInput || options.text);
        if (direct) return direct;
        const message = latestUserMessage(chatInfo && chatInfo.chat);
        return message ? clip(messageText(message), 1200) : '';
    }
    function getOwnerSnapshot(chat) {
        const owner = app.core && app.core.memory && app.core.memory.legacyMemoryOwnerSemantics;
        return owner && typeof owner.buildOwnerSnapshot === 'function' ? owner.buildOwnerSnapshot(chat) : { formalOwner: chat && chat.memoryMode || 'journal', memoryBrainFormalInjection: false };
    }
    function buildLegacyBlock(chatInfo) {
        if (typeof global.buildActiveLegacyMemoryContextBlock === 'function') return global.buildActiveLegacyMemoryContextBlock(chatInfo.chat, { wrapJournalTag: true }) || '';
        return '';
    }
    function buildFallbackLegacyComparison(chatInfo, query) {
        if (feature.injectionPreviewService && typeof feature.injectionPreviewService.buildLegacyShadowComparison === 'function') return feature.injectionPreviewService.buildLegacyShadowComparison(chatInfo, query);
        return { mode: 'read-only-comparison', chatId: chatInfo.chatId, chatType: chatInfo.chatType, chatName: chatInfo.chatName, queryPreview: clip(query, 160), totals: { journals: 0, vectorEntries: 0, tableCells: 0 }, snippets: [], note: '旧记忆只读对照。' };
    }
    function runCutoverRehearsal(options = {}) {
        const state = rootState(options);
        const platformApi = getPlatformApi();
        const coreApi = getCoreApi();
        const snapshot = platformApi.getSnapshot({ state });
        const chatInfo = resolveActiveChat(options);
        const query = resolveQuery(options, chatInfo);
        const input = {
            query: clip(query, 1000),
            chatId: chatInfo.chatId,
            chatType: chatInfo.chatType,
            chatName: chatInfo.chatName,
            formalPromptInjection: false,
            writesLegacyMemory: false,
            comparesOfficialLegacyOwner: true
        };
        record('记忆脑接管演练输入', input);
        const memoryBrainPreview = coreApi.buildMemoryInjectionPackage(query, snapshot, {
            maxModels: Number(options.maxModels) || 6,
            maxFacts: Number(options.maxFacts) || 12,
            maxFamilies: Number(options.maxFamilies) || 8,
            maxEdges: Number(options.maxEdges) || 16,
            maxEvents: Number(options.maxEvents) || 6,
            maxBlockChars: Number(options.maxBlockChars) || 4200
        });
        memoryBrainPreview.query = Object.assign({}, memoryBrainPreview.query || {}, { chatId: chatInfo.chatId, chatType: chatInfo.chatType, chatName: chatInfo.chatName });
        const legacyBlock = buildLegacyBlock(chatInfo);
        const legacyComparison = buildFallbackLegacyComparison(chatInfo, query);
        const ownerSnapshot = getOwnerSnapshot(chatInfo.chat);
        const report = coreApi.buildCutoverComparisonReport({ query, chatId: chatInfo.chatId, chatType: chatInfo.chatType, chatName: chatInfo.chatName, legacyBlock, legacyComparison, ownerSnapshot, memoryBrainPreview });
        const stored = platformApi.appendCutoverRehearsalBatch({ input, report, diagnostics: asArray(report.issues).map(issue => issue.kind) }, { state });
        record('记忆脑接管演练应用结果', { batchId: stored.batch && stored.batch.id, reportId: stored.report && stored.report.id, metrics: stored.report && stored.report.metrics, readiness: stored.report && stored.report.readiness, issueCount: stored.report && asArray(stored.report.issues).length }, 'success');
        return stored;
    }
    function getCutoverRehearsalCards(options = {}) {
        const snapshot = getPlatformApi().getSnapshot(options);
        const api = getCoreApi();
        return {
            totalText: {
                reports: asArray(snapshot.cutoverReports).filter(item => item && item.status !== 'retired').length,
                runs: asArray(snapshot.cutoverRehearsalRuns).length,
                batches: asArray(snapshot.batches).filter(batch => batch && batch.kind === 'cutover-rehearsal').length
            },
            reports: asArray(snapshot.cutoverReports).filter(report => options.includeRetired || report.status !== 'retired')
                .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, Number(options.limit) || 8)
                .map(report => api.compactCutoverReportForList(report)),
            runs: asArray(snapshot.cutoverRehearsalRuns).slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, 8),
            batches: asArray(snapshot.batches).filter(batch => batch && batch.kind === 'cutover-rehearsal').slice(0, 8)
        };
    }
    function rollbackLatestCutoverRehearsalBatch(options = {}) {
        const snapshot = getPlatformApi().getSnapshot(options);
        const batch = asArray(snapshot.batches).find(item => item && item.kind === 'cutover-rehearsal' && item.status !== 'rolled-back');
        if (!batch) throw new Error('没有可撤回的接管演练批次');
        const result = getPlatformApi().rollbackCutoverRehearsalBatch(batch.id, options);
        record('记忆脑接管演练批次回滚', result, result.ok ? 'success' : 'error');
        return result;
    }
    feature.cutoverRehearsalService = { runCutoverRehearsal, getCutoverRehearsalCards, rollbackLatestCutoverRehearsalBatch };
})(window);
