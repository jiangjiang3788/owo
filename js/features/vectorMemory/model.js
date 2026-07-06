// --- Vector memory model owner (V24 canonical owner) ---
// 只负责模板、chat.vectorMemory 状态、历史和自动总结游标的纯状态模型。
(function registerVectorMemoryModel(global) {
    const OwoApp = global.OwoApp;
    const vectorMemory = OwoApp.features.vectorMemory;

    const DEFAULTS = {
        interval: 200,
        topK: 5,
        threshold: 0.28,
        maxEntryLength: 1200
    };

    function createVectorId(prefix) {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }

    function deepClone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function createStarterVectorTemplate() {
        return {
            id: createVectorId('vector_tpl'),
            name: '默认向量模板',
            description: '用于把聊天提炼为可检索的长期记忆，支持自动总结、手动总结和三种记忆模式互转。',
            topK: DEFAULTS.topK,
            similarityThreshold: DEFAULTS.threshold,
            maxEntryLength: DEFAULTS.maxEntryLength,
            summaryTemperature: 0.35,
            summaryPrompt: [
                '请把下面这段聊天内容整理成一条适合“长期检索”的客观记忆，不要写成聊天口吻。',
                '输出必须严格使用以下 XML：',
                '<vector_memory>',
                '  <title>简洁标题</title>',
                '  <content>可被长期检索的客观记忆正文，突出事件、关系变化、关键事实。</content>',
                '  <tags>标签1,标签2</tags>',
                '</vector_memory>',
                '',
                '要求：',
                '1. 不要编造。',
                '2. 保留人物、事件、时间线和关系变化。',
                '3. 内容尽量利于后续检索。',
                '4. 如果没有值得记录的新信息，也要输出 XML，但 content 留空。',
                '',
                '角色名：{{charName}}',
                '用户称呼：{{userName}}',
                '消息范围：{{rangeLabel}}',
                '',
                '聊天内容：',
                '{{history}}'
            ].join('\n'),
            injectPrompt: [
                '【向量长期记忆】',
                '以下是基于当前聊天语义检索出的高相关长期记忆，它们比普通历史消息更可靠。',
                '如果这些记忆与当前对话无关，请不要强行引用；如果记忆未明确写出，请不要擅自脑补。',
                '',
                '当前检索线索：{{query}}',
                '共命中 {{count}} 条：',
                '{{memories}}'
            ].join('\n')
        };
    }

    function ensureVectorTemplateStore(sourceDb) {
        if (!sourceDb) return [];
        if (!Array.isArray(sourceDb.vectorMemoryTemplates)) sourceDb.vectorMemoryTemplates = [];
        if (sourceDb.vectorMemoryTemplates.length === 0) {
            sourceDb.vectorMemoryTemplates.push(createStarterVectorTemplate());
        }
        return sourceDb.vectorMemoryTemplates;
    }

    function ensureVectorMemoryState(chat, options = {}) {
        if (!chat) return null;
        const stateDb = options.state || global.db || {};
        ensureVectorTemplateStore(stateDb);
        if (!chat.vectorMemory || typeof chat.vectorMemory !== 'object') chat.vectorMemory = {};
        const state = chat.vectorMemory;
        if (state.enabled === undefined) state.enabled = true;
        if (!Array.isArray(state.entries)) state.entries = [];
        if (!Array.isArray(state.history)) state.history = [];
        if (state.boundTemplateId === undefined) state.boundTemplateId = null;
        if (!Number.isFinite(parseInt(state.topK, 10))) state.topK = DEFAULTS.topK;
        if (!Number.isFinite(parseFloat(state.threshold))) state.threshold = DEFAULTS.threshold;
        if (state.autoSummaryEnabled === undefined) state.autoSummaryEnabled = false;
        if (!Number.isFinite(parseInt(state.autoSummaryInterval, 10))) state.autoSummaryInterval = DEFAULTS.interval;
        if (!state.autoSummaryState) state.autoSummaryState = 'idle';
        if (state.autoSummaryPending === undefined) state.autoSummaryPending = false;
        if (state.lastSummarizedMsgId === undefined) state.lastSummarizedMsgId = null;
        if (state.lastSummarizedMsgTimestamp === undefined) state.lastSummarizedMsgTimestamp = null;
        if (state.lastContextBlock === undefined) state.lastContextBlock = '';
        if (!Array.isArray(state.lastRetrievedEntryIds)) state.lastRetrievedEntryIds = [];
        if (state.lastQueryText === undefined) state.lastQueryText = '';
        if (state.lastPreparedAt === undefined) state.lastPreparedAt = null;
        const templates = stateDb.vectorMemoryTemplates || [];
        if (!state.boundTemplateId || !templates.some(item => item.id === state.boundTemplateId)) {
            state.boundTemplateId = templates[0] ? templates[0].id : null;
        }
        state.entries.forEach(entry => normalizeEntry(entry));
        return state;
    }

    function normalizeEntry(entry) {
        if (!entry || typeof entry !== 'object') return entry;
        if (!entry.id) entry.id = createVectorId('vector_entry');
        if (!entry.title) entry.title = `向量记忆 ${new Date(entry.createdAt || Date.now()).toLocaleDateString()}`;
        if (!Array.isArray(entry.vector)) entry.vector = [];
        if (!Array.isArray(entry.tags)) entry.tags = [];
        if (entry.pinned === undefined) entry.pinned = false;
        if (!Number.isFinite(parseFloat(entry.weight))) entry.weight = 1;
        if (entry.createdAt === undefined) entry.createdAt = Date.now();
        if (entry.updatedAt === undefined) entry.updatedAt = entry.createdAt;
        return entry;
    }

    function getActiveVectorTemplate(chat, options = {}) {
        const stateDb = options.state || global.db || {};
        ensureVectorTemplateStore(stateDb);
        const memoryState = ensureVectorMemoryState(chat, {state: stateDb}) || {};
        return (stateDb.vectorMemoryTemplates || []).find(item => item.id === memoryState.boundTemplateId)
            || (stateDb.vectorMemoryTemplates || [])[0]
            || null;
    }

    function clearVectorContextCache(chat, options = {}) {
        const state = ensureVectorMemoryState(chat, options);
        if (!state) return;
        state.lastContextBlock = '';
        state.lastRetrievedEntryIds = [];
        state.lastQueryText = '';
        state.lastPreparedAt = null;
    }

    function pushVectorHistory(chat, action, summary, options = {}) {
        const state = ensureVectorMemoryState(chat, options);
        if (!state) return null;
        const item = {
            id: createVectorId('vector_history'),
            action,
            summary,
            createdAt: Date.now()
        };
        state.history.unshift(item);
        state.history = state.history.slice(0, 80);
        return item;
    }

    function inferEntryTitle(text) {
        const compact = String(text || '').replace(/\s+/g, ' ').trim();
        if (!compact) return '未命名记忆';
        return compact.length > 18 ? `${compact.slice(0, 18)}…` : compact;
    }

    function createVectorEntry(payload = {}) {
        const text = String(payload.text || '').trim();
        if (!text) throw new Error('记忆内容不能为空');
        return normalizeEntry({
            id: createVectorId('vector_entry'),
            title: String(payload.title || '').trim() || inferEntryTitle(text),
            text,
            vector: Array.isArray(payload.vector) ? payload.vector : [],
            tags: Array.isArray(payload.tags) ? payload.tags.filter(Boolean) : [],
            source: payload.source || 'manual',
            pinned: !!payload.pinned,
            weight: Number.isFinite(parseFloat(payload.weight)) ? parseFloat(payload.weight) : 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            range: payload.range || null,
            meta: payload.meta || {}
        });
    }

    function addEntry(chat, entry, options = {}) {
        const state = ensureVectorMemoryState(chat, options);
        if (!state) throw new Error('无法找到向量记忆状态');
        state.entries.unshift(normalizeEntry(entry));
        clearVectorContextCache(chat, options);
        return entry;
    }

    function getAutoVectorCursorInfo(chat, options = {}) {
        const state = ensureVectorMemoryState(chat, options) || {};
        const history = Array.isArray(chat && chat.history) ? chat.history : [];
        const interval = Math.max(10, parseInt(state.autoSummaryInterval, 10) || DEFAULTS.interval);
        const cursorIndex = state.lastSummarizedMsgId
            ? history.findIndex(message => message.id === state.lastSummarizedMsgId)
            : -1;
        const nextStartIndex = cursorIndex + 1;
        const unsummarizedCount = Math.max(0, history.length - nextStartIndex);
        const completedBatchCount = Math.floor(unsummarizedCount / interval);
        return {history, interval, cursorIndex, nextStartIndex, unsummarizedCount, completedBatchCount};
    }

    function getNextAutoVectorRange(chat, options = {}) {
        const info = getAutoVectorCursorInfo(chat, options);
        if (info.completedBatchCount <= 0) return null;
        return {
            start: info.nextStartIndex + 1,
            end: info.nextStartIndex + info.interval,
            info
        };
    }

    function setVectorCursorByEndIndex(chat, endIndex, options = {}) {
        const state = ensureVectorMemoryState(chat, options);
        if (!state) return;
        const history = Array.isArray(chat && chat.history) ? chat.history : [];
        const message = history[endIndex - 1] || null;
        state.lastSummarizedMsgId = message ? message.id : null;
        state.lastSummarizedMsgTimestamp = message ? (message.timestamp || null) : null;
        state.autoSummaryState = 'idle';
    }

    function resetVectorCursorToLatest(chat, options = {}) {
        const state = ensureVectorMemoryState(chat, options);
        if (!state) return;
        const history = Array.isArray(chat && chat.history) ? chat.history : [];
        setVectorCursorByEndIndex(chat, history.length, options);
        state.autoSummaryPending = false;
    }

    vectorMemory.model = {
        DEFAULTS,
        createVectorId,
        deepClone,
        createStarterVectorTemplate,
        ensureVectorTemplateStore,
        ensureVectorMemoryState,
        normalizeEntry,
        getActiveVectorTemplate,
        clearVectorContextCache,
        pushVectorHistory,
        inferEntryTitle,
        createVectorEntry,
        addEntry,
        getAutoVectorCursorInfo,
        getNextAutoVectorRange,
        setVectorCursorByEndIndex,
        resetVectorCursorToLatest
    };
})(window);
