// --- Forum post service owner (V28) ---
// 只负责论坛 post/comment 状态服务；不渲染 DOM，不保存，不调用 AI。
(function registerForumPostService(global) {
    const OwoApp = global.OwoApp;
    const feature = OwoApp.features.forum = OwoApp.features.forum || {};
    const semantics = OwoApp.core.forum.forumSemantics;

    function ensurePostList(state) {
        const dbState = state || global.db || {};
        if (!Array.isArray(dbState.forumPosts)) dbState.forumPosts = [];
        return dbState.forumPosts;
    }

    function findPost(state, postId) {
        return ensurePostList(state).find(item => item && item.id === postId) || null;
    }

    function filterPosts(state, filter) {
        return semantics.filterPosts(ensurePostList(state), filter || 'all');
    }

    function createUserPost(state, input, activeAccount) {
        const post = semantics.createUserPost(input || {}, activeAccount || {});
        if (!post) return null;
        ensurePostList(state).unshift(post);
        return post;
    }

    function togglePostLike(state, postId) {
        return semantics.togglePostLike(findPost(state, postId));
    }

    function togglePostFavorite(state, postId) {
        return semantics.togglePostFavorite(findPost(state, postId));
    }

    function addUserComment(state, postId, content, activeAccount, replyTarget) {
        const post = findPost(state, postId);
        if (!post) return null;
        const comment = semantics.createUserComment(content, activeAccount || {}, replyTarget || null);
        semantics.addComment(post, comment);
        return { post, comment };
    }

    function deletePost(state, postId) {
        const posts = ensurePostList(state);
        const index = posts.findIndex(item => item && item.id === postId);
        if (index === -1) return null;
        const removed = posts.splice(index, 1)[0];
        return removed || null;
    }

    function deletePosts(state, postIds) {
        const dbState = state || global.db || {};
        const idSet = new Set(Array.isArray(postIds) ? postIds : []);
        const before = ensurePostList(dbState).length;
        dbState.forumPosts = dbState.forumPosts.filter(item => !item || !idSet.has(item.id));
        return before - dbState.forumPosts.length;
    }

    function getUserStats(state) {
        return semantics.getUserStats(ensurePostList(state));
    }

    feature.postService = {
        ensurePostList,
        findPost,
        filterPosts,
        createUserPost,
        togglePostLike,
        togglePostFavorite,
        addUserComment,
        deletePost,
        deletePosts,
        getUserStats
    };
})(window);
