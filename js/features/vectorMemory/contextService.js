// --- Vector memory context service owner (V24 canonical owner) ---
// 负责向量记忆检索上下文、fallback 词法召回、entry embedding 补齐；不改 chat_ai prompt 主编排。
(function registerVectorMemoryContextService(global) {
    const OwoApp = global.OwoApp;
    const vectorMemory = OwoApp.features.vectorMemory;
    const model = vectorMemory.model;
    const embeddingAdapter = OwoApp.platform.ai.embeddingAdapter;

    function getState(options = {}) {
        return options.state || global.db || {};
    }

    function trimText(text, limit) {
        const value = String(text || '').trim();
        if (value.length <= limit) return value;
        return `${value.slice(0, Math.max(0, limit - 1)).trim()}…`;
    }

    function readMessageText(message) {
        if (!message) return '';
        if (Array.isArray(message.parts) && message.parts.length > 0) {
            return message.parts.map(part => part.text || '[图片]').join('');
        }
        return message.content || '';
    }

    function formatMessageForMemory(chat, message) {
        const speaker = message.role === 'user' ? (chat.myName || '用户') : (chat.realName || '角色');
        return `${speaker}: ${readMessageText(message)}`;
    }

    function buildHistoryText(chat, startIndex, endIndex) {
        const history = Array.isArray(chat && chat.history) ? chat.history : [];
        return history
            .slice(startIndex, endIndex)
            .filter(item => item && !item.isContextDisabled && !item.isThinking)
            .map(item => formatMessageForMemory(chat, item))
            .join('\n');
    }

    function fillTemplateString(template, values) {
        let output = String(template || '');
        Object.keys(values || {}).forEach(key => {
            const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            output = output.replace(pattern, values[key] == null ? '' : String(values[key]));
        });
        return output;
    }

    function buildVectorQueryText(chat) {
        const history = Array.isArray(chat && chat.history) ? chat.history : [];
        const usable = history.filter(item => item && !item.isContextDisabled && !item.isThinking);
        const recent = usable.slice(-8);
        const queryText = recent.map(item => formatMessageForMemory(chat, item)).join('\n');
        if (queryText.trim()) return queryText.trim();
        return `${chat.myName || '用户'} 与 ${chat.realName || '角色'} 的当前聊天语境`;
    }

    function getEntryTags(entry) {
        if (!entry || !Array.isArray(entry.tags)) return '';
        return entry.tags.filter(Boolean).join(', ');
    }

    function buildMemoryListText(entries) {
        return entries.map((entry, index) => {
            const parts = [
                `${index + 1}. 标题：${entry.title || '未命名记忆'}`,
                `来源：${entry.source || 'manual'}`
            ];
            if (entry._score !== undefined) parts.push(`相似度：${entry._score.toFixed(3)}`);
            if (entry.rangeLabel) parts.push(`范围：${entry.rangeLabel}`);
            const tags = getEntryTags(entry);
            if (tags) parts.push(`标签：${tags}`);
            parts.push(`内容：${entry.text || ''}`);
            return `- ${parts.join('\n  ')}`;
        }).join('\n\n');
    }

    function buildContextBlock(chat, entries, queryText, options = {}) {
        if (!entries || entries.length === 0) return '';
        const template = model.getActiveVectorTemplate(chat, {state: getState(options)});
        const text = buildMemoryListText(entries);
        if (template && template.injectPrompt) {
            return fillTemplateString(template.injectPrompt, {
                query: queryText,
                count: entries.length,
                memories: text
            }).trim();
        }
        return `【向量长期记忆】\n当前检索线索：${queryText}\n${text}`;
    }

    function computeLexicalScore(entry, queryText) {
        const haystack = `${entry.title || ''}\n${entry.text || ''}\n${getEntryTags(entry)}`.toLowerCase();
        const tokens = String(queryText || '')
            .toLowerCase()
            .split(/[\s,，。！？!?:：、;；\n]+/)
            .filter(token => token && token.length >= 2);
        if (tokens.length === 0) return entry.pinned ? 1 : 0;
        let hits = 0;
        tokens.forEach(token => {
            if (haystack.includes(token)) hits += 1;
        });
        const base = hits / tokens.length;
        return base + (entry.pinned ? 0.35 : 0) + ((Number(entry.weight) || 1) - 1) * 0.08;
    }

    function selectFallbackEntries(chat, queryText, options = {}) {
        const state = getState(options);
        model.ensureVectorMemoryState(chat, {state});
        const template = model.getActiveVectorTemplate(chat, {state});
        const topK = Math.max(1, parseInt(template && template.topK || chat.vectorMemory.topK, 10) || model.DEFAULTS.topK);
        const threshold = Number.isFinite(parseFloat(template && template.similarityThreshold))
            ? parseFloat(template.similarityThreshold)
            : parseFloat(chat.vectorMemory.threshold || model.DEFAULTS.threshold);
        return [...chat.vectorMemory.entries]
            .map(entry => ({
                ...entry,
                _score: computeLexicalScore(entry, queryText),
                rangeLabel: entry.range ? `${entry.range.start}-${entry.range.end}` : ''
            }))
            .filter(entry => entry.pinned || entry._score >= Math.max(0.05, threshold * 0.45))
            .sort((a, b) => {
                if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
                if (b._score !== a._score) return b._score - a._score;
                return (b.updatedAt || 0) - (a.updatedAt || 0);
            })
            .slice(0, topK);
    }

    async function fetchEmbeddings(texts, options = {}) {
        return embeddingAdapter.fetchEmbeddings(texts, {
            state: getState(options),
            providerConfig: options.providerConfig,
            batchSize: options.batchSize
        });
    }

    async function embedEntriesIfNeeded(entries, options = {}) {
        const targets = entries.filter(item => !Array.isArray(item.vector) || item.vector.length === 0);
        if (targets.length === 0) return;
        const texts = targets.map(item => item.text || '');
        const vectors = await fetchEmbeddings(texts, options);
        targets.forEach((item, index) => {
            item.vector = Array.isArray(vectors[index]) ? vectors[index] : [];
        });
    }

    function getVectorMemoryContextBlock(chat, options = {}) {
        const state = getState(options);
        model.ensureVectorMemoryState(chat, {state});
        if (chat.memoryMode !== 'vector' && !options.force) return '';
        if (chat.vectorMemory.lastContextBlock) return chat.vectorMemory.lastContextBlock;
        const queryText = options.queryText || buildVectorQueryText(chat);
        const entries = selectFallbackEntries(chat, queryText, {state});
        const block = buildContextBlock(chat, entries, queryText, {state});
        chat.vectorMemory.lastContextBlock = block;
        chat.vectorMemory.lastRetrievedEntryIds = entries.map(item => item.id);
        chat.vectorMemory.lastQueryText = queryText;
        chat.vectorMemory.lastPreparedAt = Date.now();
        return block;
    }

    async function prepareVectorMemoryContext(chat, options = {}) {
        const state = getState(options);
        model.ensureVectorMemoryState(chat, {state});
        const queryText = options.queryText || buildVectorQueryText(chat);
        if (!chat.vectorMemory.entries.length) {
            model.clearVectorContextCache(chat, {state});
            return '';
        }
        if (chat.vectorMemory.lastContextBlock && chat.vectorMemory.lastQueryText === queryText) {
            return chat.vectorMemory.lastContextBlock;
        }

        const template = model.getActiveVectorTemplate(chat, {state});
        const topK = Math.max(1, parseInt(template && template.topK || chat.vectorMemory.topK, 10) || model.DEFAULTS.topK);
        const threshold = Number.isFinite(parseFloat(template && template.similarityThreshold))
            ? parseFloat(template.similarityThreshold)
            : parseFloat(chat.vectorMemory.threshold || model.DEFAULTS.threshold);

        let selectedEntries = [];
        try {
            const vectors = await fetchEmbeddings([queryText], {state});
            const queryVector = vectors[0];
            if (Array.isArray(queryVector) && queryVector.length > 0) {
                selectedEntries = chat.vectorMemory.entries
                    .map(entry => {
                        const similarity = embeddingAdapter.cosineSimilarity(queryVector, entry.vector);
                        const score = similarity + (entry.pinned ? 0.35 : 0) + ((Number(entry.weight) || 1) - 1) * 0.08;
                        return {
                            ...entry,
                            _score: score,
                            rangeLabel: entry.range ? `${entry.range.start}-${entry.range.end}` : ''
                        };
                    })
                    .filter(entry => entry.pinned || entry._score >= threshold)
                    .sort((a, b) => {
                        if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
                        if (b._score !== a._score) return b._score - a._score;
                        return (b.updatedAt || 0) - (a.updatedAt || 0);
                    })
                    .slice(0, topK);
            }
        } catch (error) {
            console.warn('[VectorMemory] prepare context fallback:', error);
        }

        if (selectedEntries.length === 0) selectedEntries = selectFallbackEntries(chat, queryText, {state});
        const block = buildContextBlock(chat, selectedEntries, queryText, {state});
        chat.vectorMemory.lastContextBlock = block;
        chat.vectorMemory.lastRetrievedEntryIds = selectedEntries.map(item => item.id);
        chat.vectorMemory.lastQueryText = queryText;
        chat.vectorMemory.lastPreparedAt = Date.now();
        return block;
    }

    async function addVectorEntry(chat, payload, options = {}) {
        const state = getState(options);
        model.ensureVectorMemoryState(chat, {state});
        const entry = model.createVectorEntry(payload);
        if (!entry.vector.length) {
            const vectors = await fetchEmbeddings([entry.text], {state});
            entry.vector = Array.isArray(vectors[0]) ? vectors[0] : [];
        }
        model.addEntry(chat, entry, {state});
        model.pushVectorHistory(chat, 'create', `新增记忆：${entry.title}`, {state});
        return entry;
    }

    vectorMemory.contextService = {
        trimText,
        readMessageText,
        formatMessageForMemory,
        buildHistoryText,
        fillTemplateString,
        buildVectorQueryText,
        getEntryTags,
        buildMemoryListText,
        buildContextBlock,
        computeLexicalScore,
        selectFallbackEntries,
        fetchEmbeddings,
        embedEntriesIfNeeded,
        getVectorMemoryContextBlock,
        prepareVectorMemoryContext,
        addVectorEntry
    };
})(window);
