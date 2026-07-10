// --- Forum DM service owner (V28) ---
// 只负责论坛私信和陌生人 profile 状态服务；不渲染 DOM，不保存，不调用 AI。
(function registerForumDmService(global) {
    const OwoApp = global.OwoApp;
    const feature = OwoApp.features.forum = OwoApp.features.forum || {};
    const semantics = OwoApp.core.forum.forumSemantics;

    function ensureMessageList(state) {
        const dbState = state || global.db || {};
        if (!Array.isArray(dbState.forumMessages)) dbState.forumMessages = [];
        return dbState.forumMessages;
    }

    function ensurePendingRequestMap(state) {
        const dbState = state || global.db || {};
        if (!dbState.forumPendingRequestFromUser || typeof dbState.forumPendingRequestFromUser !== 'object') dbState.forumPendingRequestFromUser = {};
        return dbState.forumPendingRequestFromUser;
    }

    function getStrangerProfile(state, userId) {
        const dbState = state || global.db || {};
        if (!dbState.forumStrangerProfiles) return null;
        return dbState.forumStrangerProfiles[userId] || null;
    }

    function getDMUserList(state) {
        const dbState = state || global.db || {};
        return semantics.getDmUserList(dbState.forumMessages || [], dbState.forumStrangerProfiles || {});
    }

    function getConversationMessages(state, userId) {
        const dbState = state || global.db || {};
        return semantics.getConversationMessages(dbState.forumMessages || [], userId, 'user');
    }

    function markDMRead(state, userId) {
        const messages = ensureMessageList(state);
        let changed = false;
        messages.forEach(message => {
            if (message && message.toUserId === 'user' && message.fromUserId === userId && !message.isRead) {
                message.isRead = true;
                changed = true;
            }
        });
        return changed;
    }

    function countUnread(state, userId) {
        const dbState = state || global.db || {};
        return semantics.countUnread(dbState.forumMessages || [], userId);
    }

    function addUserMessage(state, userId, content) {
        const msg = semantics.createDmMessage({
            id: 'dm_' + Date.now(),
            fromUserId: 'user',
            toUserId: userId,
            content,
            timestamp: Date.now(),
            isRead: false
        });
        ensureMessageList(state).push(msg);
        return msg;
    }

    function addCommentContextIfNeeded(state, userId, commentContext) {
        if (!commentContext || !commentContext.commentContent) return null;
        const messages = getConversationMessages(state, userId);
        if (messages.length > 0) return null;
        const msg = semantics.createCommentContextMessage(userId, commentContext);
        if (!msg) return null;
        ensureMessageList(state).push(msg);
        return msg;
    }

    function deleteConversations(state, userIds) {
        const dbState = state || global.db || {};
        const idSet = new Set(Array.isArray(userIds) ? userIds : []);
        const before = ensureMessageList(dbState).length;
        dbState.forumMessages = dbState.forumMessages.filter(message => {
            if (!message) return false;
            const other = message.fromUserId === 'user' ? message.toUserId : message.fromUserId;
            return !idSet.has(other);
        });
        return before - dbState.forumMessages.length;
    }

    function hasPendingFriendRequestFromUser(state, npcUserId) {
        const dbState = state || global.db || {};
        const map = dbState.forumPendingRequestFromUser;
        if (!map || typeof map !== 'object') return false;
        return !!map[npcUserId];
    }

    function setPendingFriendRequestFromUser(state, npcUserId, value) {
        const map = ensurePendingRequestMap(state);
        if (value) map[npcUserId] = true;
        else delete map[npcUserId];
        return !!value;
    }

    function isFriend(state, userId) {
        const dbState = state || global.db || {};
        return semantics.isFriend(dbState.characters || [], userId);
    }

    feature.dmService = {
        ensureMessageList,
        getStrangerProfile,
        getDMUserList,
        getConversationMessages,
        markDMRead,
        countUnread,
        addUserMessage,
        addCommentContextIfNeeded,
        deleteConversations,
        hasPendingFriendRequestFromUser,
        setPendingFriendRequestFromUser,
        isFriend
    };
})(window);
