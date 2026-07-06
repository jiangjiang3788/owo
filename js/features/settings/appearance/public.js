// --- Appearance settings public facade (V19) ---
// public facade 只导出稳定 API，不写业务逻辑。
(function registerAppearanceSettingsPublic(global) {
    const OwoApp = global.OwoApp;
    const appearance = OwoApp.features.settings.appearance;
    const service = appearance.appearanceService;

    appearance.publicApi = {
        setupWallpaperApp: service.setupWallpaperApp,
        setupGlobalChatWallpaperInWallpaperScreen: service.setupGlobalChatWallpaperInWallpaperScreen,
        setupGlobalCallWallpaperInWallpaperScreen: service.setupGlobalCallWallpaperInWallpaperScreen,
        getFontPresets: service.getFontPresets,
        saveFontPresets: service.saveFontPresets,
        populateFontPresetSelect: service.populateFontPresetSelect,
        saveCurrentFontAsPreset: service.saveCurrentFontAsPreset,
        applyFontPreset: service.applyFontPreset,
        openFontManageModal: service.openFontManageModal,
        getWidgetWallpaperPresets: service.getWidgetWallpaperPresets,
        saveWidgetWallpaperPresets: service.saveWidgetWallpaperPresets,
        captureCurrentWidgetWallpaperScheme: service.captureCurrentWidgetWallpaperScheme,
        populateWidgetWallpaperPresetSelect: service.populateWidgetWallpaperPresetSelect,
        saveCurrentWidgetWallpaperAsPreset: service.saveCurrentWidgetWallpaperAsPreset,
        applyWidgetWallpaperPreset: service.applyWidgetWallpaperPreset,
        openWidgetWallpaperManageModal: service.openWidgetWallpaperManageModal,
        exportWidgetWallpaperScheme: service.exportWidgetWallpaperScheme,
        importWidgetWallpaperScheme: service.importWidgetWallpaperScheme,
        resetWidgetWallpaperToDefault: service.resetWidgetWallpaperToDefault,
        setupNightModeBindings: service.setupNightModeBindings,
        applyNightMode: service.applyNightMode,
        parseTimeToMinutes: service.parseTimeToMinutes,
        setupStatusBarBindings: service.setupStatusBarBindings,
        updateStatusBarPreviewInSettings: service.updateStatusBarPreviewInSettings,
        applyHomeStatusBar: service.applyHomeStatusBar
    };
})(window);
