// --- Settings public facade (V22) ---
// 稳定出口文件：只导出 settings feature API，不写业务逻辑。
(function registerSettingsPublicFacade(global) {
    const OwoApp = global.OwoApp;
    const settingsFeature = OwoApp.features.settings;
    const service = settingsFeature.settingsService;

    const publicApi = {
        setupChatSettings: service.setupChatSettings,
        loadSettingsToSidebar: service.loadSettingsToSidebar,
        setupMagicRoomApp: service.setupMagicRoomApp,
        setupApiSettingsApp: service.setupApiSettingsApp,
        setupWallpaperApp: service.setupWallpaperApp,
        setupPresetFeatures: service.setupPresetFeatures,
        setupCustomizeApp: service.setupCustomizeApp,
        setupNightModeBindings: service.setupNightModeBindings,
        setupStatusBarBindings: service.setupStatusBarBindings,
        initCotSettings: service.initCotSettings,
        getRegisteredLegacyApiNames: service.getRegisteredLegacyApiNames,
        getStableSetupApiNames: service.getStableSetupApiNames,
        getSettingsRoutingReport: service.getSettingsRoutingReport
    };

    settingsFeature.publicApi = publicApi;
})(window);
