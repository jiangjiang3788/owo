// --- Settings service facade (V22 legacy shell close) ---
// 只做 settings setup 入口编排和转发；已迁移入口强制走对应子模块，不再 fallback 到 settings.js。
(function registerSettingsService(global) {
    const OwoApp = global.OwoApp;
    const settingsFeature = OwoApp.features.settings;
    const shell = settingsFeature.settingsShell;

    const LEGACY_SHELL_API_NAMES = [
        'setupChatSettings',
        'loadSettingsToSidebar',
        'setupMagicRoomApp',
        'setupPresetFeatures',
        'setupCustomizeApp'
    ];

    const CANONICAL_ROUTE_META = [
        { name: 'setupApiSettingsApp', owner: 'OwoApp.features.settings.apiSettings.publicApi.setupApiSettingsApp', namespace: 'apiSettings', api: 'setupApiSettingsApp' },
        { name: 'setupWallpaperApp', owner: 'OwoApp.features.settings.appearance.publicApi.setupWallpaperApp', namespace: 'appearance', api: 'setupWallpaperApp' },
        { name: 'setupNightModeBindings', owner: 'OwoApp.features.settings.appearance.publicApi.setupNightModeBindings', namespace: 'appearance', api: 'setupNightModeBindings' },
        { name: 'setupStatusBarBindings', owner: 'OwoApp.features.settings.appearance.publicApi.setupStatusBarBindings', namespace: 'appearance', api: 'setupStatusBarBindings' },
        { name: 'initCotSettings', owner: 'OwoApp.features.settings.voiceCot.publicApi.initCotSettings', namespace: 'voiceCot', api: 'initCotSettings' }
    ];

    const CANONICAL_BY_NAME = CANONICAL_ROUTE_META.reduce((acc, item) => {
        acc[item.name] = item;
        return acc;
    }, Object.create(null));

    function forward(name, argsLike) {
        return shell.call(name, argsLike, global);
    }

    function getCanonicalRoute(name) {
        const meta = CANONICAL_BY_NAME[name];
        if (!meta) {
            throw new Error('[settingsService] 未登记 canonical route: ' + name);
        }
        const feature = settingsFeature[meta.namespace];
        const publicApi = feature && feature.publicApi;
        const fn = publicApi && publicApi[meta.api];
        if (typeof fn !== 'function') {
            throw new Error('[settingsService] 缺少 canonical settings API: ' + meta.owner);
        }
        return fn;
    }

    function callCanonical(name, argsLike) {
        const fn = getCanonicalRoute(name);
        return fn.apply(global, Array.prototype.slice.call(argsLike || []));
    }

    function setupChatSettings() {
        return forward('setupChatSettings', arguments);
    }

    function loadSettingsToSidebar() {
        return forward('loadSettingsToSidebar', arguments);
    }

    function setupMagicRoomApp() {
        return forward('setupMagicRoomApp', arguments);
    }

    function setupApiSettingsApp() {
        return callCanonical('setupApiSettingsApp', arguments);
    }

    function setupWallpaperApp() {
        return callCanonical('setupWallpaperApp', arguments);
    }

    function setupPresetFeatures() {
        return forward('setupPresetFeatures', arguments);
    }

    function initCotSettings() {
        return callCanonical('initCotSettings', arguments);
    }

    function setupCustomizeApp() {
        return forward('setupCustomizeApp', arguments);
    }

    function setupNightModeBindings() {
        return callCanonical('setupNightModeBindings', arguments);
    }

    function setupStatusBarBindings() {
        return callCanonical('setupStatusBarBindings', arguments);
    }

    function getRegisteredLegacyApiNames() {
        return shell.listRegisteredApiNames();
    }

    function getStableSetupApiNames() {
        return LEGACY_SHELL_API_NAMES.concat(CANONICAL_ROUTE_META.map(item => item.name));
    }

    function getSettingsRoutingReport() {
        return {
            legacyShellApis: shell.getLegacyApiReport ? shell.getLegacyApiReport() : shell.listRegisteredApiNames(),
            migratedCanonicalApis: CANONICAL_ROUTE_META.map(item => Object.assign({}, item))
        };
    }

    settingsFeature.settingsService = {
        setupChatSettings,
        loadSettingsToSidebar,
        setupMagicRoomApp,
        setupApiSettingsApp,
        setupWallpaperApp,
        setupPresetFeatures,
        setupCustomizeApp,
        setupNightModeBindings,
        setupStatusBarBindings,
        initCotSettings,
        getRegisteredLegacyApiNames,
        getStableSetupApiNames,
        getSettingsRoutingReport
    };
})(window);
