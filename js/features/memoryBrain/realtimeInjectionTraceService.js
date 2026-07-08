// --- Memory Brain realtime injection trace service (v0.6.2) ---
// 生成“为什么命中/未命中/裁剪/阻断”的实时注入 trace；不接正式聊天管线。
(function registerMemoryBrainRealtimeInjectionTraceService(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;

    function rootState(options) { return (options && options.state) || global.db || {}; }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function asText(value) { return String(value == null ? '' : value).trim(); }
    function clip(value, max) { const text = asText(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n'); return text.length > max ? text.slice(0, max - 1) + '…' : text; }
    function api() { return app.platform.memoryBrain.publicApi; }
    function core() { return app.core.memoryBrain.publicApi; }
    function record(label, data, level) {
        const service = app.platform.observability && app.platform.observability.operationTraceService;
        if (service && typeof service.recordOperation === 'function') return service.recordOperation({ source: 'features/memoryBrain/realtimeInjectionTraceService', sourceModule: 'features/memoryBrain/realtimeInjectionTraceService', label, level: level || 'event', data: data || {} });
        return null;
    }
    function chatName(chat) { return chat && (chat.remarkName || chat.name || chat.realName || chat.groupName || '未命名聊天'); }
    function findChat(state, id, type) {
        const list = type === 'group' ? state.groups : state.characters;
        return asArray(list).find(item => item && item.id === id) || null;
    }
    function findFallbackChat(state) {
        return asArray(state.characters).map(chat => ({ chat, chatType: 'private' })).concat(asArray(state.groups).map(chat => ({ chat, chatType: 'group' })))
            .filter(item => asArray(item.chat && item.chat.history).length)
            .sort((a, b) => asArray(b.chat.history).length - asArray(a.chat.history).length)[0] || null;
    }
    function resolveChat(options = {}) {
        const state = rootState(options);
        const type = options.chatType || global.currentChatType || 'private';
        const id = options.chatId || global.currentChatId || '';
        let chat = id ? findChat(state, id, type === 'group' ? 'group' : 'private') : null;
        let chatType = type === 'group' ? 'group' : 'private';
        if (!chat) { const fallback = findFallbackChat(state); chat = fallback && fallback.chat; chatType = fallback && fallback.chatType || chatType; }
        return chat ? { chat, chatType, chatId: chat.id, chatName: chatName(chat) } : { chat: null, chatType: '', chatId: '', chatName: '' };
    }
    function messageText(message) {
        const msg = message || {};
        if (msg.isVoice && msg.voiceText) return msg.voiceText;
        const parts = asArray(msg.parts).map(part => part && (part.text || part.content) || '').filter(Boolean).join('\n');
        return parts || msg.content || msg.text || '';
    }
    function latestUserMessage(chat) { return asArray(chat && chat.history).slice().reverse().find(message => message && message.role === 'user' && messageText(message)) || null; }
    function resolveQuery(options, chatInfo) {
        const direct = asText(options.query || options.userInput || options.text);
        if (direct) return direct;
        const msg = latestUserMessage(chatInfo && chatInfo.chat);
        return msg ? clip(messageText(msg), 1200) : '';
    }
    function buildLegacyBlock(chatInfo) {
        if (!chatInfo || !chatInfo.chat) return '';
        if (typeof global.buildActiveLegacyMemoryContextBlock === 'function') return global.buildActiveLegacyMemoryContextBlock(chatInfo.chat, { wrapJournalTag: true }) || '';
        return '';
    }
    function getLegacyOwner(chatInfo) {
        const owner = app.core && app.core.memory && app.core.memory.legacyMemoryOwnerSemantics;
        return owner && typeof owner.getActiveMemoryMode === 'function' ? owner.getActiveMemoryMode(chatInfo && chatInfo.chat) : 'legacy';
    }

    function runRealtimeInjectionTrace(options = {}) {
        const state = rootState(options);
        const chatInfo = resolveChat(options);
        const query = resolveQuery(options, chatInfo);
        const snapshot = api().getSnapshot({ state });
        const legacyBlock = buildLegacyBlock(chatInfo);
        const legacyOwner = getLegacyOwner(chatInfo);
        const input = { query: clip(query, 1000), chatId: chatInfo.chatId, chatType: chatInfo.chatType, chatName: chatInfo.chatName, legacyOwner, legacyBlockCharCount: legacyBlock.length, formalPromptInjection: false, promptHooked: false };
        record('记忆脑实时注入 trace 输入', input);
        const report = core().buildRealtimeInjectionTraceReport({ query, snapshot, ownerState: snapshot.ownerState, legacyBlock, legacyOwner, maxBlockChars: Number(options.maxBlockChars) || 3600 });
        const result = api().appendRealtimeTraceRun({ input, report }, { state });
        record('记忆脑实时注入 trace 应用结果', { reportId: result.report && result.report.id, runId: result.run && result.run.id, finalOwner: result.report && result.report.final && result.report.final.owner, hitCount: result.run && result.run.hitCount, missCount: result.run && result.run.missCount, blockerCount: result.run && result.run.blockerCount, formalPromptInjection: false, promptHooked: false }, 'success');
        return result;
    }
    function rollbackLatestRealtimeInjectionTraceBatch(options = {}) {
        const result = api().rollbackLatestRealtimeTraceBatch(options);
        record('记忆脑实时注入 trace 批次回滚', { result, formalPromptInjection: false }, 'success');
        return result;
    }
    function getRealtimeInjectionTraceCards(options = {}) {
        const snapshot = api().getRealtimeTraceSnapshot(options);
        const compact = app.core.memoryBrain.realtimeInjectionTraceSemantics.compactRealtimeInjectionTraceForList;
        return {
            reports: asArray(snapshot.reports).filter(item => item && item.status !== 'rolled-back').slice(0, 8).map(compact),
            rolledBackReports: asArray(snapshot.reports).filter(item => item && item.status === 'rolled-back').slice(0, 5).map(compact),
            runs: asArray(snapshot.runs).slice(0, 8),
            lastRun: snapshot.lastRun || null
        };
    }

    feature.realtimeInjectionTraceService = { runRealtimeInjectionTrace, rollbackLatestRealtimeInjectionTraceBatch, getRealtimeInjectionTraceCards, record };
})(window);
