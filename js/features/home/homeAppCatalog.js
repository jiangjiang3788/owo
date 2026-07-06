// --- Home app catalog (v0.2.17) ---
// 只定义主屏 app 的分组和入口元数据；Dock 承载 API / 数据管理 / 提示词 / 外观设置。
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

    const secondaryApps = Object.freeze([]);

    const dockApps = Object.freeze([
        Object.freeze({ target: 'api-settings-screen', iconId: 'api-settings-screen', nameId: 'api-settings-screen', group: 'dock' }),
        Object.freeze({ target: 'data-management-screen', iconId: 'data-management-screen', nameId: 'data-management-screen', group: 'dock' }),
        Object.freeze({ target: 'magic-room-screen', iconId: 'magic-room-screen', nameId: 'magic-room-screen', group: 'dock' }),
        Object.freeze({ target: 'appearance-settings-screen', iconId: 'appearance-settings-screen', nameId: 'appearance-settings-screen', group: 'dock' })
    ]);

    const mergedLegacyScreens = Object.freeze([
        'wallpaper-screen -> appearance-settings-screen',
        'customize-screen -> appearance-settings-screen',
        'day-mode-btn/night-mode-btn -> appearance-settings-screen',
        'storage-analysis-screen -> data-management-screen',
        'tutorial-screen -> data-management-screen'
    ]);

    function cloneApp(appDef) {
        return Object.assign({}, appDef);
    }

    function getHomeAppPages() {
        const pages = [primaryApps.map(cloneApp)];
        if (secondaryApps.length) pages.push(secondaryApps.map(cloneApp));
        return pages;
    }

    function getHomeDockApps() {
        return dockApps.map(cloneApp);
    }

    function getRoutingReport() {
        return {
            owner: 'features/home/homeAppCatalog',
            release: 'v0.2.17',
            primaryCount: primaryApps.length,
            secondaryCount: secondaryApps.length,
            dockTargets: dockApps.map(item => item.target),
            primaryTargets: primaryApps.map(item => item.target),
            mergedLegacyScreens: Array.from(mergedLegacyScreens),
            note: 'v0.2.17: Data Management / Prompt / Appearance are Dock-only, API is first Dock item.'
        };
    }

    app.features.home.homeAppCatalog = Object.freeze({
        getHomeAppPages,
        getHomeDockApps,
        getRoutingReport
    });
})(window);
