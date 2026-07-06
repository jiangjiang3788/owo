// --- Peek conversation semantics owner (V30 canonical owner) ---
// 只负责偷看消息会话的 ID、状态和展示文本归一化；不碰 DOM、legacy state、fetch、保存。
(function registerPeekConversationSemantics(app) {
    app.core = app.core || {};
    app.core.peek = app.core.peek || {};

    function safeText(value, fallback) {
        const text = String(value == null ? '' : value).trim();
        return text || fallback || '';
    }

    function createPartnerId(index) {
        const suffix = index != null ? index : Math.random().toString(36).slice(2, 10);
        return 'peek_npc_' + Date.now() + '_' + suffix;
    }

    function normalizePeekMessage(message) {
        if (!message || typeof message !== 'object') return { sender: 'npc', content: '' };
        if (message.sender == null) message.sender = 'npc';
        if (message.content == null) message.content = '';
        return message;
    }

    function normalizePeekConversation(conversation, index) {
        if (!conversation || typeof conversation !== 'object') return conversation;
        if (!conversation.partnerId) conversation.partnerId = createPartnerId(index);
        if (typeof conversation.suspicionLevel !== 'number') conversation.suspicionLevel = 0;
        conversation.suspicionLevel = Math.max(0, Math.min(100, conversation.suspicionLevel));
        if (typeof conversation.isFriend !== 'boolean') conversation.isFriend = false;
        if (typeof conversation.friendRequestPending !== 'boolean') conversation.friendRequestPending = false;
        if (conversation.supplementPersona == null) conversation.supplementPersona = '';
        if (conversation.partnerPersona == null) conversation.partnerPersona = '';
        if (conversation.partnerRelation == null) conversation.partnerRelation = '熟人';
        if (!Array.isArray(conversation.history)) conversation.history = [];
        conversation.history.forEach(normalizePeekMessage);
        return conversation;
    }

    function normalizePeekConversations(conversations) {
        if (!Array.isArray(conversations)) return [];
        conversations.forEach((conversation, index) => normalizePeekConversation(conversation, index));
        return conversations;
    }

    function getLastMessageText(conversation, fallback) {
        const history = Array.isArray(conversation && conversation.history) ? conversation.history : [];
        const lastMessage = history.length > 0 ? history[history.length - 1] : null;
        if (!lastMessage) return fallback || '...';
        return safeText(lastMessage.content, fallback || '...').replace(/\[.*?的消息：([\s\S]+)\]/, '$1');
    }

    function getPartnerDisplayName(conversation, fallback) {
        return safeText(conversation && conversation.partnerName, fallback || '...');
    }

    app.core.peek.conversationSemantics = {
        createPartnerId,
        normalizePeekMessage,
        normalizePeekConversation,
        normalizePeekConversations,
        getLastMessageText,
        getPartnerDisplayName
    };
})(OwoApp);
