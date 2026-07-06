// --- Home app catalog (v0.2.4) ---
// 只定义主屏 app 的分组和入口元数据；不绑定 DOM，不访问持久化。
(function registerHomeAppCatalog(global) {
    const app = global.OwoApp || (global.OwoApp = {});
    app.features = app.features || {};
    app.features.home = app.features.home || {};

    const primaryApps = Object.freeze([
        Object.freeze({ target: 'chat-list-screen', iconId: 'chat-list-screen', nameId: 'chat-list-screen', group: 'primary' }),
        Object.freeze({ target: 'world-book-screen', iconId: 'world-book-screen', nameId: 'world-book-screen', group: 'memory' }),
        Object.freeze({ target: 'pomodoro-screen', iconId: 'pomodoro-screen', nameId: 'pomodoro-screen', group: 'tool' }),
        Object.freeze({ target: 'forum-screen', iconId: 'forum-screen', nameId: 'forum-screen', group: 'community' }),
        Object.freeze({ target: 'piggy-bank-screen', iconId: 'piggy-bank-screen', nameId: 'piggy-bank-screen', group: 'tool' }),
        Object.freeze({ target: 'theater-screen', iconId: 'theater-screen', nameId: 'theater-screen', group: 'creative' })
    ]);

    const settingsApps = Object.freeze([
        Object.freeze({ target: 'api-settings-screen', iconId: 'api-settings-screen', nameId: 'api-settings-screen', group: 'settings' }),
        Object.freeze({ target: 'wallpaper-screen', iconId: 'wallpaper-screen', nameId: 'wallpaper-screen', group: 'settings' }),
        Object.freeze({ target: 'customize-screen', iconId: 'customize-screen', nameId: 'customize-screen', group: 'settings' }),
        Object.freeze({ target: 'tutorial-screen', iconId: 'tutorial-screen', nameId: 'tutorial-screen', group: 'settings' }),
        Object.freeze({ target: 'appearance-settings-screen', iconId: 'appearance-settings-screen', nameId: 'appearance-settings-screen', group: 'settings' }),
        Object.freeze({ id: 'day-mode-btn', iconId: 'day-mode-btn', nameId: 'day-mode-btn', group: 'settings' }),
        Object.freeze({ id: 'night-mode-btn', iconId: 'night-mode-btn', nameId: 'night-mode-btn', group: 'settings' }),
        Object.freeze({ target: 'storage-analysis-screen', iconId: 'storage-analysis-screen', nameId: 'storage-analysis-screen', group: 'settings' }),
        Object.freeze({ action: 'magic-room-app', iconId: 'magic-room-screen', nameId: 'magic-room-screen', group: 'settings' })
    ]);

    function cloneApp(appDef) {
        return Object.assign({}, appDef);
    }

    function getHomeAppPages() {
        return [
            primaryApps.map(cloneApp),
            settingsApps.map(cloneApp)
        ];
    }

    function getRoutingReport() {
        return {
            owner: 'features/home/homeAppCatalog',
            primaryCount: primaryApps.length,
            settingsCount: settingsApps.length,
            settingsPageOnly: settingsApps.map(item => item.target || item.id || item.action)
        };
    }

    app.features.home.homeAppCatalog = Object.freeze({
        getHomeAppPages,
        getRoutingReport
    });
})(window);
