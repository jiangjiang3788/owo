// --- App screen manifest (V36) ---
// 登记现有 screen 的 ownership / lifecycle hook；V36 继续标记低/高风险静态模板 owner，不写业务逻辑。
(function registerScreenManifest(global) {
    const app = global.OwoApp;
    if (!app || !app.app) {
        throw new Error('[screenManifest] OwoApp namespace 尚未初始化');
    }

    const screens = [
        { id: 'home-screen', owner: 'app/home', group: 'root', init: 'setupHomeScreen' },
        { id: 'chat-list-screen', owner: 'features/chat', group: 'root', init: 'setupChatListScreen' },
        { id: 'contacts-screen', owner: 'features/contacts', group: 'root', init: 'setupContactsScreen', mount: ['renderContactList', 'renderMyProfile'] },
        { id: 'phone-screen', owner: 'features/phone', group: 'root', init: 'setupPhoneScreen' },
        { id: 'live-room-screen', owner: 'features/live', group: 'feature' },
        { id: 'chat-room-screen', owner: 'features/chat', group: 'chat', init: 'setupChatRoom', template: 'js/features/chat/chatRoomScreenTemplate.js' },
        { id: 'reminder-screen', owner: 'features/reminder', group: 'feature' },
        { id: 'world-book-screen', owner: 'features/worldBook', group: 'memory', init: 'setupWorldBookApp' },
        { id: 'edit-world-book-screen', owner: 'features/worldBook', group: 'memory' },
        { id: 'api-settings-screen', owner: 'features/settings/apiSettings', group: 'settings', init: 'OwoApp.features.settings.publicApi.setupApiSettingsApp', template: 'js/features/settings/settingsScreenTemplates.js' },
        { id: 'wallpaper-screen', owner: 'features/settings/appearance', group: 'settings', init: 'OwoApp.features.settings.publicApi.setupWallpaperApp' },
        { id: 'customize-screen', owner: 'features/settings', group: 'settings', init: 'OwoApp.features.settings.publicApi.setupCustomizeApp' },
        { id: 'search-history-screen', owner: 'features/search', group: 'chat' },
        { id: 'more-screen', owner: 'app/more', group: 'root', mount: 'renderMoreScreen' },
        { id: 'regex-filter-manager-screen', owner: 'features/regexFilter', group: 'settings' },
        { id: 'regex-filter-editor-screen', owner: 'features/regexFilter', group: 'settings' },
        { id: 'cot-settings-screen', owner: 'features/settings/voiceCot', group: 'settings', init: 'OwoApp.features.settings.publicApi.initCotSettings' },
        { id: 'status-bar-manager-screen', owner: 'features/settings/appearance', group: 'settings' },
        { id: 'status-bar-editor-screen', owner: 'features/settings/appearance', group: 'settings' },
        { id: 'my-profile-screen', owner: 'features/contacts', group: 'root' },
        { id: 'tutorial-screen', owner: 'features/tutorial', group: 'app', init: 'setupTutorialApp' },
        { id: 'chat-settings-screen', owner: 'features/settings', group: 'settings', init: 'OwoApp.features.settings.publicApi.setupChatSettings', template: 'js/features/settings/settingsScreenTemplates.js' },
        { id: 'archive-screen', owner: 'features/archive', group: 'memory', init: 'setupArchiveApp', template: 'js/features/archive/archiveScreenTemplate.js' },
        { id: 'theater-screen', owner: 'features/theater', group: 'feature' },
        { id: 'theater-create-screen', owner: 'features/theater', group: 'feature' },
        { id: 'theater-detail-screen', owner: 'features/theater', group: 'feature' },
        { id: 'theater-html-detail-screen', owner: 'features/theater', group: 'feature' },
        { id: 'group-settings-screen', owner: 'features/settings', group: 'settings' },
        { id: 'memory-journal-screen', owner: 'features/journal', group: 'memory', init: 'setupMemoryJournalScreen' },
        { id: 'memory-table-screen', owner: 'features/memoryTable', group: 'memory', init: 'setupMemoryTableScreen' },
        { id: 'vector-memory-screen', owner: 'features/vectorMemory', group: 'memory', init: 'setupVectorMemoryScreen' },
        { id: 'memory-journal-detail-screen', owner: 'features/journal', group: 'memory' },
        { id: 'favorites-screen', owner: 'features/favorites', group: 'memory', template: 'js/features/favorites/favoritesScreenTemplate.js' },
        { id: 'favorites-detail-screen', owner: 'features/favorites', group: 'memory' },
        { id: 'peek-steps-screen', owner: 'features/peek', group: 'feature' },
        { id: 'peek-screen', owner: 'features/peek', group: 'feature', init: 'setupPeekFeature' },
        { id: 'forum-screen', owner: 'features/forum', group: 'feature', init: 'setupForumFeature', template: 'js/features/forum/forumScreenTemplates.js' },
        { id: 'forum-post-detail-screen', owner: 'features/forum', group: 'feature', template: 'js/features/forum/forumScreenTemplates.js' },
        { id: 'forum-profile-screen', owner: 'features/forum', group: 'feature', template: 'js/features/forum/forumScreenTemplates.js' },
        { id: 'forum-alt-accounts-screen', owner: 'features/forum', group: 'feature', template: 'js/features/forum/forumScreenTemplates.js' },
        { id: 'forum-settings-screen', owner: 'features/forum', group: 'feature', template: 'js/features/forum/forumScreenTemplates.js' },
        { id: 'forum-dm-list-screen', owner: 'features/forum', group: 'feature', template: 'js/features/forum/forumScreenTemplates.js' },
        { id: 'forum-dm-conversation-screen', owner: 'features/forum', group: 'feature', template: 'js/features/forum/forumScreenTemplates.js' },
        { id: 'magic-room-screen', owner: 'features/settings', group: 'settings', init: 'OwoApp.features.settings.publicApi.setupMagicRoomApp' },
        { id: 'data-management-screen', owner: 'features/dataManagement', group: 'app', init: 'OwoApp.features.dataManagement.publicApi.render' },
        { id: 'storage-analysis-screen', owner: 'platform/storage', group: 'app', init: 'setupStorageAnalysisScreen', template: 'js/platform/storage/storageAnalysisScreenTemplate.js' },
        { id: 'appearance-settings-screen', owner: 'features/settings/appearance', group: 'settings', mount: 'renderAppearanceSettingsScreen' },
        { id: 'peek-messages-screen', owner: 'features/peek', group: 'feature' },
        { id: 'peek-conversation-screen', owner: 'features/peek', group: 'feature' },
        { id: 'peek-memos-screen', owner: 'features/peek', group: 'feature' },
        { id: 'peek-memo-detail-screen', owner: 'features/peek', group: 'feature' },
        { id: 'peek-cart-screen', owner: 'features/peek', group: 'feature' },
        { id: 'peek-transfer-station-screen', owner: 'features/peek', group: 'feature' },
        { id: 'peek-browser-screen', owner: 'features/peek', group: 'feature' },
        { id: 'peek-browser-detail-screen', owner: 'features/peek', group: 'feature' },
        { id: 'peek-drafts-screen', owner: 'features/peek', group: 'feature' },
        { id: 'peek-wallet-screen', owner: 'features/peek', group: 'feature' },
        { id: 'peek-album-screen', owner: 'features/peek', group: 'feature' },
        { id: 'peek-unlock-screen', owner: 'features/peek', group: 'feature' },
        { id: 'peek-unlock-post-detail-screen', owner: 'features/peek', group: 'feature' },
        { id: 'peek-time-thoughts-screen', owner: 'features/peek', group: 'feature' },
        { id: 'piggy-bank-screen', owner: 'features/wallet', group: 'feature', mount: 'renderPiggyBankScreen' },
        { id: 'family-card-list-screen', owner: 'features/wallet', group: 'feature', mount: 'renderFamilyCardList' },
        { id: 'family-card-detail-screen', owner: 'features/wallet', group: 'feature' },
        { id: 'pomodoro-screen', owner: 'features/pomodoro', group: 'feature', init: 'setupPomodoroApp' },
        { id: 'pomodoro-focus-screen', owner: 'features/pomodoro', group: 'feature' },
        { id: 'shop-screen', owner: 'features/wallet', group: 'feature', init: 'setupShopSystem' },
        { id: 'node-system-screen', owner: 'features/nodeSystem', group: 'feature', init: 'NodeSystem.init' },
        { id: 'node-record-screen', owner: 'features/nodeSystem', group: 'feature' },
        { id: 'storage-screen', owner: 'platform/storage', group: 'app' }
    ];

    function cloneScreen(screen) {
        return Object.assign({}, screen, {
            dependencies: Array.isArray(screen.dependencies) ? screen.dependencies.slice() : []
        });
    }

    function getScreens() {
        return screens.map(cloneScreen);
    }

    function getScreenIds() {
        return screens.map(screen => screen.id);
    }

    function getScreenById(id) {
        const found = screens.find(screen => screen.id === id);
        return found ? cloneScreen(found) : null;
    }

    app.app.screenManifest = {
        version: 'V36',
        getScreens,
        getScreenIds,
        getScreenById
    };
})(window);
