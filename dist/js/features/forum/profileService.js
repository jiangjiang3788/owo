// --- Forum profile service owner (V28) ---
// 只负责论坛大号/小号 profile 状态服务；不渲染 DOM，不保存，不调用 AI。
(function registerForumProfileService(global) {
    const OwoApp = global.OwoApp;
    const feature = OwoApp.features.forum = OwoApp.features.forum || {};
    const semantics = OwoApp.core.forum.forumSemantics;

    function ensureUserProfile(state) {
        const dbState = state || global.db || {};
        if (!dbState.forumUserProfile || typeof dbState.forumUserProfile !== 'object') {
            dbState.forumUserProfile = semantics.createDefaultUserProfile();
            return { profile: dbState.forumUserProfile, changed: true };
        }
        const normalized = semantics.normalizeUserProfile(dbState.forumUserProfile);
        const changed = JSON.stringify(normalized) !== JSON.stringify(dbState.forumUserProfile);
        dbState.forumUserProfile = Object.assign(dbState.forumUserProfile, normalized);
        return { profile: dbState.forumUserProfile, changed };
    }

    function getActiveAccount(state) {
        const dbState = state || global.db || {};
        ensureUserProfile(dbState);
        const account = semantics.resolveActiveAccount(dbState);
        if (account.shouldResetActiveId) {
            dbState.forumActiveAccountId = 'main';
            delete account.shouldResetActiveId;
            account.didResetActiveId = true;
        }
        return account;
    }

    function switchAccount(state, accountId) {
        const dbState = state || global.db || {};
        dbState.forumActiveAccountId = accountId || 'main';
        return getActiveAccount(dbState);
    }

    function ensureAltAccounts(state) {
        const dbState = state || global.db || {};
        if (!Array.isArray(dbState.forumAltAccounts)) dbState.forumAltAccounts = [];
        return dbState.forumAltAccounts;
    }

    function createAltAccount(state, data) {
        const alts = ensureAltAccounts(state);
        const alt = semantics.createAltAccount(data || {});
        alts.push(alt);
        return alt;
    }

    function updateAltAccount(state, altId, data) {
        const alt = ensureAltAccounts(state).find(item => item && item.id === altId);
        if (!alt) return null;
        const next = data || {};
        if (next.username) alt.username = next.username;
        if (next.avatar) alt.avatar = next.avatar;
        if (next.bio !== undefined) alt.bio = next.bio;
        return alt;
    }

    function deleteAltAccount(state, altId) {
        const dbState = state || global.db || {};
        const before = ensureAltAccounts(dbState).length;
        dbState.forumAltAccounts = dbState.forumAltAccounts.filter(item => item && item.id !== altId);
        if (dbState.forumActiveAccountId === altId) dbState.forumActiveAccountId = 'main';
        return before !== dbState.forumAltAccounts.length;
    }

    function updateUserProfile(state, input) {
        const dbState = state || global.db || {};
        ensureUserProfile(dbState);
        const source = input || {};
        if (source.username !== undefined) dbState.forumUserProfile.username = source.username;
        if (source.avatar !== undefined) dbState.forumUserProfile.avatar = source.avatar;
        if (source.bio !== undefined) dbState.forumUserProfile.bio = source.bio;
        return dbState.forumUserProfile;
    }

    feature.profileService = {
        ensureUserProfile,
        getActiveAccount,
        switchAccount,
        ensureAltAccounts,
        createAltAccount,
        updateAltAccount,
        deleteAltAccount,
        updateUserProfile
    };
})(window);
