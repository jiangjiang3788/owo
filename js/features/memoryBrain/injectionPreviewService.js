// --- Memory Brain injection preview service owner (v0.3.7) ---
// 编排当前输入 → shadow injection package + 旧记忆只读对照；不接正式 prompt 注入，不改旧记忆系统。
(function registerMemoryBrainInjectionPreviewService(global) {
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
        if (msg.locationData && msg.locationData.name) return `[分享位置：${msg.locationData.name}]`;
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
    function countTableCells(chat) {
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
    function flattenTableSnippets(chat, limit) {
        const data = chat && chat.memoryTables && chat.memoryTables.data;
        const snippets = [];
        if (!data || typeof data !== 'object') return snippets;
        Object.keys(data).forEach(tableId => {
            const table = data[tableId];
            if (!table || typeof table !== 'object') return;
            const rows = Array.isArray(table.rows) ? table.rows : Object.values(table);
            rows.forEach(row => {
                if (!row || typeof row !== 'object') return;
                Object.keys(row).forEach(key => { const text = clip(`${key}: ${row[key]}`, 120); if (text) snippets.push(text); });
            });
        });
        return snippets.slice(0, limit || 5);
    }
    function buildLegacyShadowComparison(chatInfo, query) {
        const chat = chatInfo && chatInfo.chat;
        if (!chat) return { mode: 'read-only-comparison', chatName: '', totals: { journals: 0, vectorEntries: 0, tableCells: 0 }, snippets: [], note: '没有当前聊天，无法读取旧记忆来源做对照。' };
        const journals = asArray(chat.memoryJournals);
        const vectorEntries = chat && chat.vectorMemory && Array.isArray(chat.vectorMemory.entries) ? chat.vectorMemory.entries : [];
        const tableCells = countTableCells(chat);
        const snippets = flattenTableSnippets(chat, 5)
            .concat(journals.slice(-3).map(item => clip(item && (item.summary || item.content || item.text || item.title), 140)).filter(Boolean))
            .concat(vectorEntries.slice(-3).map(item => clip(item && (item.text || item.content || item.summary), 140)).filter(Boolean))
            .filter(Boolean).slice(0, 9);
        return {
            mode: 'read-only-comparison',
            chatId: chatInfo.chatId,
            chatType: chatInfo.chatType,
            chatName: chatInfo.chatName,
            queryPreview: clip(query, 160),
            totals: { journals: journals.length, vectorEntries: vectorEntries.length, tableCells },
            snippets,
            note: '旧记忆只作为对照统计和片段预览；本服务不写旧表格、不写旧向量、不进入正式 prompt。'
        };
    }
    function buildInput(query, chatInfo, snapshot, options) {
        return {
            query: clip(query, 1000),
            chatId: chatInfo.chatId,
            chatType: chatInfo.chatType,
            chatName: chatInfo.chatName,
            maxFacts: Number(options.maxFacts) || 8,
            maxFamilies: Number(options.maxFamilies) || 5,
            maxEdges: Number(options.maxEdges) || 10,
            activeModelCount: asArray(snapshot.models).filter(model => model && model.status === 'active').length,
            factCount: asArray(snapshot.facts).filter(fact => fact && fact.status !== 'retired').length,
            familyCount: asArray(snapshot.families).filter(family => family && family.status !== 'retired').length,
            edgeCount: asArray(snapshot.edges).filter(edge => edge && edge.status !== 'retired').length,
            formalPromptInjection: false
        };
    }
    function buildShadowInjectionPreview(options = {}) {
        const state = rootState(options);
        const platformApi = getPlatformApi();
        const coreApi = getCoreApi();
        const snapshot = platformApi.getSnapshot({ state });
        const chatInfo = resolveActiveChat(options);
        const query = resolveQuery(options, chatInfo);
        const input = buildInput(query, chatInfo, snapshot, options);
        record('记忆脑注入预览输入', input);
        const preview = coreApi.buildMemoryInjectionPackage(query, snapshot, {
            maxModels: Number(options.maxModels) || 4,
            maxFacts: Number(options.maxFacts) || 8,
            maxFamilies: Number(options.maxFamilies) || 5,
            maxEdges: Number(options.maxEdges) || 10,
            maxEvents: Number(options.maxEvents) || 4,
            maxBlockChars: Number(options.maxBlockChars) || 3600
        });
        preview.query = Object.assign({}, preview.query || {}, { chatId: chatInfo.chatId, chatType: chatInfo.chatType, chatName: chatInfo.chatName });
        preview.legacyComparison = buildLegacyShadowComparison(chatInfo, query);
        preview.diagnostics = asArray(preview.diagnostics).concat(preview.legacyComparison && preview.legacyComparison.totals && (preview.legacyComparison.totals.journals + preview.legacyComparison.totals.vectorEntries + preview.legacyComparison.totals.tableCells === 0) ? ['legacy_sources_empty_for_current_chat'] : []);
        const stored = platformApi.appendInjectionPreviewBatch({ input, preview, legacyComparison: preview.legacyComparison, parserDiagnostics: preview.diagnostics }, { state });
        record('记忆脑注入预览应用结果', {
            batchId: stored.batch && stored.batch.id,
            previewId: stored.preview && stored.preview.id,
            selected: stored.preview && stored.preview.selected,
            blockCharCount: stored.preview && stored.preview.blockCharCount,
            legacyComparison: stored.preview && stored.preview.legacyComparison
        }, stored.preview ? 'success' : 'event');
        return stored;
    }
    function getInjectionPreviewCards(options = {}) {
        const snapshot = getPlatformApi().getSnapshot(options);
        return asArray(snapshot.injectionPreviews).filter(preview => options.includeRetired || preview.status !== 'retired')
            .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
            .slice(0, Number(options.limit) || 12).map(getCoreApi().compactInjectionPreviewForList);
    }
    function retireInjectionPreview(previewId, options = {}) {
        const preview = getPlatformApi().retireInjectionPreview(previewId, 'user-retired-from-memory-brain-injection-preview', options);
        record('记忆脑注入预览撤回', { previewId, ok: Boolean(preview) }, preview ? 'success' : 'error');
        return preview;
    }
    function rollbackLatestInjectionPreviewBatch(options = {}) {
        const snapshot = getPlatformApi().getSnapshot(options);
        const batch = asArray(snapshot.batches).find(item => item && item.kind === 'injection-preview' && item.status === 'applied' && asArray(item.previewIds).length);
        if (!batch) throw new Error('没有可撤回的注入预览批次。');
        const result = getPlatformApi().rollbackInjectionPreviewBatch(batch.id, options);
        record('记忆脑注入预览批次回滚', result, result.ok ? 'success' : 'error');
        return result;
    }

    feature.injectionPreviewService = { buildShadowInjectionPreview, getInjectionPreviewCards, retireInjectionPreview, rollbackLatestInjectionPreviewBatch, buildLegacyShadowComparison };
})(window);
