// --- Forum semantics owner (V28 canonical owner) ---
// 只负责论坛 profile / post / dm 的纯语义：归一化、ID、筛选、统计、消息列表计算。
(function registerForumSemantics(app) {
    const core = app.core = app.core || {};
    core.forum = core.forum || {};

    const DEFAULT_AVATAR = 'https://i.postimg.cc/GtbTnxhP/o-o-1.jpg';
    const DEFAULT_DM_AVATAR = 'https://i.postimg.cc/Y96LPskq/o-o-2.jpg';

    function now() { return Date.now(); }
    function rand() { return Math.random(); }
    function createId(prefix) {
        return String(prefix || 'forum') + '_' + now() + '_' + Math.floor(rand() * 10000);
    }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function asObject(value) { return value && typeof value === 'object' ? value : {}; }
    function trimText(value) { return String(value == null ? '' : value).trim(); }
    function safeText(value, fallback) {
        const text = trimText(value);
        return text || fallback || '';
    }
    function normalizeAvatar(value, fallback) {
        return safeText(value, fallback || DEFAULT_AVATAR);
    }

    function createDefaultUserProfile(seed) {
        const source = asObject(seed);
        return {
            username: safeText(source.username, '用户' + Math.floor(1000 + rand() * 9000)),
            avatar: normalizeAvatar(source.avatar, DEFAULT_AVATAR),
            bio: trimText(source.bio),
            joinDate: Number(source.joinDate) || now()
        };
    }

    function normalizeUserProfile(profile) {
        const source = asObject(profile);
        const normalized = createDefaultUserProfile(source);
        if (source.username !== undefined) normalized.username = safeText(source.username, normalized.username);
        return normalized;
    }

    function normalizeAltAccount(alt) {
        const source = asObject(alt);
        return {
            id: safeText(source.id, createId('alt')),
            username: safeText(source.username, '小号' + Math.floor(1000 + rand() * 9000)),
            avatar: normalizeAvatar(source.avatar, DEFAULT_AVATAR),
            bio: trimText(source.bio),
            createdAt: Number(source.createdAt) || now()
        };
    }

    function createAltAccount(data) {
        return normalizeAltAccount(Object.assign({}, data || {}, { id: createId('alt'), createdAt: now() }));
    }

    function resolveActiveAccount(state) {
        const dbState = asObject(state);
        const profile = normalizeUserProfile(dbState.forumUserProfile);
        const activeId = dbState.forumActiveAccountId || 'main';
        if (activeId === 'main') {
            return { id: 'main', username: profile.username, avatar: profile.avatar, bio: profile.bio, isAlt: false };
        }
        const alt = asArray(dbState.forumAltAccounts).find(item => item && item.id === activeId);
        if (!alt) {
            return { id: 'main', username: profile.username, avatar: profile.avatar, bio: profile.bio, isAlt: false, shouldResetActiveId: true };
        }
        const normalizedAlt = normalizeAltAccount(alt);
        return { id: normalizedAlt.id, username: normalizedAlt.username, avatar: normalizedAlt.avatar, bio: normalizedAlt.bio, isAlt: true };
    }

    function normalizeComment(raw) {
        const source = asObject(raw);
        const comment = {
            id: safeText(source.id, createId('comment')),
            authorId: safeText(source.authorId, 'npc'),
            username: safeText(source.username, '路人' + Math.floor(100 + rand() * 900)),
            avatar: trimText(source.avatar),
            content: trimText(source.content),
            timestamp: source.timestamp || '刚刚'
        };
        if (source.replyTo) comment.replyTo = source.replyTo;
        return comment;
    }

    function createUserComment(content, activeAccount, replyTarget) {
        const acc = activeAccount || {};
        const comment = normalizeComment({
            id: 'comment_' + now() + '_' + rand(),
            authorId: acc.isAlt ? acc.id : 'user',
            username: acc.username || '用户',
            avatar: acc.avatar || DEFAULT_AVATAR,
            content,
            timestamp: new Date().toLocaleString()
        });
        if (replyTarget) {
            comment.replyTo = { commentId: replyTarget.commentId, username: replyTarget.username };
        }
        return comment;
    }

    function createUserPost(input, activeAccount) {
        const source = asObject(input);
        const title = trimText(source.title);
        const content = trimText(source.content);
        if (!title || !content) return null;
        const acc = activeAccount || {};
        return {
            id: 'post_' + now() + '_' + rand(),
            authorId: acc.isAlt ? acc.id : 'user',
            username: acc.username || '用户',
            title,
            content,
            summary: content.length > 100 ? content.substring(0, 100) + '...' : content,
            timestamp: now(),
            likeCount: 0,
            commentCount: 0,
            isLiked: false,
            isFavorited: false,
            comments: []
        };
    }

    function filterPosts(posts, filter) {
        const list = asArray(posts);
        if (filter === 'liked') return list.filter(item => item && item.isLiked);
        if (filter === 'favorited') return list.filter(item => item && item.isFavorited);
        return list.slice();
    }

    function togglePostLike(post) {
        if (!post) return null;
        post.isLiked = !post.isLiked;
        post.likeCount = Math.max(0, (Number(post.likeCount) || 0) + (post.isLiked ? 1 : -1));
        return post;
    }

    function togglePostFavorite(post) {
        if (!post) return null;
        post.isFavorited = !post.isFavorited;
        return post;
    }

    function addComment(post, comment) {
        if (!post || !comment) return null;
        if (!Array.isArray(post.comments)) post.comments = [];
        post.comments.push(comment);
        post.commentCount = post.comments.length;
        return comment;
    }

    function getUserStats(posts) {
        const list = asArray(posts);
        const userPosts = list.filter(post => post && (post.authorId === 'user' || String(post.authorId || '').startsWith('alt_')));
        let comments = 0;
        let likes = 0;
        userPosts.forEach(post => { likes += Number(post.likeCount) || 0; });
        list.forEach(post => {
            asArray(post && post.comments).forEach(comment => {
                if (comment && (comment.authorId === 'user' || String(comment.authorId || '').startsWith('alt_'))) comments += 1;
            });
        });
        return { posts: userPosts.length, comments, likes };
    }

    function getOtherDmUserId(message, userId) {
        const msg = asObject(message);
        const localUserId = userId || 'user';
        return msg.fromUserId === localUserId ? msg.toUserId : msg.fromUserId;
    }

    function getConversationMessages(messages, userId, localUserId) {
        const local = localUserId || 'user';
        return asArray(messages)
            .filter(msg => msg && ((msg.fromUserId === local && msg.toUserId === userId) || (msg.fromUserId === userId && msg.toUserId === local)))
            .sort((a, b) => (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0));
    }

    function getDmUserList(messages, profiles) {
        const map = new Map();
        const profileMap = asObject(profiles);
        asArray(messages).forEach(message => {
            const other = getOtherDmUserId(message, 'user');
            if (!other || other === 'user') return;
            const profile = profileMap[other] || null;
            const displayName = profile && profile.name ? profile.name : String(other).replace(/^npc_/, '');
            map.set(other, { id: other, name: displayName });
        });
        return Array.from(map.values());
    }

    function countUnread(messages, userId) {
        return asArray(messages).filter(msg => msg && msg.toUserId === 'user' && (!userId || msg.fromUserId === userId) && !msg.isRead).length;
    }

    function createDmMessage(input) {
        const source = asObject(input);
        return {
            id: safeText(source.id, 'dm_' + now()),
            fromUserId: safeText(source.fromUserId, 'user'),
            toUserId: safeText(source.toUserId, ''),
            content: trimText(source.content),
            timestamp: Number(source.timestamp) || now(),
            isRead: !!source.isRead,
            isCommentContext: !!source.isCommentContext
        };
    }

    function createCommentContextMessage(userId, commentContext) {
        const ctx = asObject(commentContext);
        if (!userId || !ctx.commentContent) return null;
        return createDmMessage({
            id: 'dm_ctx_' + now(),
            fromUserId: 'user',
            toUserId: userId,
            content: '（来自帖子「' + (ctx.postTitle || '') + '」你的评论：' + ctx.commentContent + '）',
            timestamp: now(),
            isRead: true,
            isCommentContext: true
        });
    }

    function isFriend(characters, userId) {
        return asArray(characters).some(item => item && item.source === 'forum' && item.forumUserId === userId);
    }

    core.forum.forumSemantics = {
        DEFAULT_AVATAR,
        DEFAULT_DM_AVATAR,
        createId,
        normalizeUserProfile,
        createDefaultUserProfile,
        normalizeAltAccount,
        createAltAccount,
        resolveActiveAccount,
        normalizeComment,
        createUserComment,
        createUserPost,
        filterPosts,
        togglePostLike,
        togglePostFavorite,
        addComment,
        getUserStats,
        getDmUserList,
        getConversationMessages,
        countUnread,
        createDmMessage,
        createCommentContextMessage,
        isFriend
    };
})(OwoApp);
