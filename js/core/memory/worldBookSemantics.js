// --- World book pure semantics (V26 canonical owner) ---
// 只负责世界书触发、注入位置和文本聚合的纯语义；不访问 DOM、存储、网络或 legacy 全局。
(function registerWorldBookSemantics(app) {
    const core = app.core;
    core.memory = core.memory || {};

    function asArray(value) {
        return Array.isArray(value) ? value : [];
    }

    function resolveLinkedCharacter(subject, snapshot) {
        const state = snapshot || {};
        if (!subject || subject.source !== 'forum' || !subject.linkedCharId) return null;
        return asArray(state.characters).find(item => item && item.id === subject.linkedCharId) || null;
    }

    function getActiveNode(subject) {
        if (!subject || !subject.activeNodeId || !Array.isArray(subject.nodes)) return null;
        return subject.nodes.find(node => node && node.id === subject.activeNodeId) || null;
    }

    function isOfflineNode(subject) {
        const activeNode = getActiveNode(subject);
        if (!activeNode) return false;
        const customConfig = activeNode.customConfig || {};
        const baseMode = customConfig.baseMode ||
            ((activeNode.type === 'offline' || (activeNode.type === 'spinoff' && activeNode.spinoffMode === 'offline')) ? 'offline' : 'online');
        return baseMode === 'offline';
    }

    function getEffectiveCharacter(subject, snapshot) {
        return resolveLinkedCharacter(subject, snapshot) || subject || null;
    }

    function getAssociatedWorldBookIds(subject, snapshot) {
        if (!subject) return [];
        const effectiveChar = getEffectiveCharacter(subject, snapshot);
        if (!effectiveChar) return [];
        if (isOfflineNode(subject)) {
            const offlineIds = asArray(effectiveChar.offlineWorldBookIds);
            return offlineIds.length > 0 ? offlineIds : asArray(effectiveChar.worldBookIds);
        }
        return asArray(effectiveChar.worldBookIds);
    }

    function buildRecentTriggerText(subject, limit) {
        const history = asArray(subject && subject.history);
        return history
            .filter(msg => msg && (msg.role === 'user' || msg.role === 'assistant' || msg.role === 'char'))
            .slice(-(limit || 15))
            .map(msg => Array.isArray(msg.parts) && msg.parts.length > 0
                ? msg.parts.map(part => part && part.text ? part.text : '').join(' ')
                : (msg.content || ''))
            .join('\n');
    }

    function shouldActivateWorldBook(book, recentText) {
        if (!book || book.disabled) return false;
        if (book.alwaysOn !== false) return true;
        const text = recentText || '';
        return asArray(book.keywords).some(keyword => keyword && text.includes(keyword));
    }

    function collectActiveWorldBooks(subject, snapshot, options) {
        const state = snapshot || {};
        const config = options || {};
        if (!subject) return [];
        const books = asArray(state.worldBooks);
        const associatedIds = getAssociatedWorldBookIds(subject, state);
        const globalBooks = books.filter(book => book && book.isGlobal && !book.disabled);
        const allBookIds = [...new Set([...associatedIds, ...globalBooks.map(book => book.id)])];
        const recentText = config.recentText !== undefined
            ? String(config.recentText || '')
            : buildRecentTriggerText(subject, config.historyLimit || 15);
        return allBookIds
            .map(id => books.find(book => book && book.id === id) || null)
            .filter(book => shouldActivateWorldBook(book, recentText));
    }

    function sortWorldBooksForPrompt(items) {
        return asArray(items).slice().sort((a, b) => {
            const weightA = a && a.weight !== undefined ? a.weight : 100;
            const weightB = b && b.weight !== undefined ? b.weight : 100;
            return weightA - weightB;
        });
    }

    function buildPositionContent(items, position) {
        return sortWorldBooksForPrompt(items)
            .filter(book => book && book.position === position)
            .map(book => book.content)
            .filter(Boolean)
            .join('\n');
    }

    function splitWorldBookContentsByPosition(items) {
        const activeBooks = asArray(items);
        return {
            before: buildPositionContent(activeBooks, 'before'),
            middle: buildPositionContent(activeBooks, 'middle'),
            after: buildPositionContent(activeBooks, 'after')
        };
    }

    core.memory.worldBookSemantics = {
        resolveLinkedCharacter,
        getActiveNode,
        isOfflineNode,
        getEffectiveCharacter,
        getAssociatedWorldBookIds,
        buildRecentTriggerText,
        shouldActivateWorldBook,
        collectActiveWorldBooks,
        sortWorldBooksForPrompt,
        splitWorldBookContentsByPosition
    };
})(OwoApp);
