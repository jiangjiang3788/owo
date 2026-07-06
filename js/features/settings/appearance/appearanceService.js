// --- Appearance settings service facade (V19) ---
// 只编排外观/主题/壁纸/字体子模块，不写具体业务逻辑。
(function registerAppearanceSettingsService(global) {
    const OwoApp = global.OwoApp;
    const appearance = OwoApp.features.settings.appearance;

    function wallpaper() { return appearance.wallpaperSettingsView; }
    function font() { return appearance.fontPresetView; }
    function widget() { return appearance.widgetWallpaperPresetView; }
    function theme() { return appearance.themeStatusView; }

    appearance.appearanceService = {
        setupWallpaperApp: function setupWallpaperApp() { return wallpaper().setupWallpaperApp.apply(global, arguments); },
        setupGlobalChatWallpaperInWallpaperScreen: function setupGlobalChatWallpaperInWallpaperScreen() { return wallpaper().setupGlobalChatWallpaperInWallpaperScreen.apply(global, arguments); },
        setupGlobalCallWallpaperInWallpaperScreen: function setupGlobalCallWallpaperInWallpaperScreen() { return wallpaper().setupGlobalCallWallpaperInWallpaperScreen.apply(global, arguments); },
        getFontPresets: function getFontPresets() { return font().getFontPresets.apply(global, arguments); },
        saveFontPresets: function saveFontPresets() { return font().saveFontPresets.apply(global, arguments); },
        populateFontPresetSelect: function populateFontPresetSelect() { return font().populateFontPresetSelect.apply(global, arguments); },
        saveCurrentFontAsPreset: function saveCurrentFontAsPreset() { return font().saveCurrentFontAsPreset.apply(global, arguments); },
        applyFontPreset: function applyFontPreset() { return font().applyFontPreset.apply(global, arguments); },
        openFontManageModal: function openFontManageModal() { return font().openFontManageModal.apply(global, arguments); },
        getWidgetWallpaperPresets: function getWidgetWallpaperPresets() { return widget().getPresets.apply(global, arguments); },
        saveWidgetWallpaperPresets: function saveWidgetWallpaperPresets() { return widget().savePresets.apply(global, arguments); },
        captureCurrentWidgetWallpaperScheme: function captureCurrentWidgetWallpaperScheme() { return widget().captureCurrentScheme.apply(global, arguments); },
        populateWidgetWallpaperPresetSelect: function populateWidgetWallpaperPresetSelect() { return widget().populateWidgetWallpaperPresetSelect.apply(global, arguments); },
        saveCurrentWidgetWallpaperAsPreset: function saveCurrentWidgetWallpaperAsPreset() { return widget().saveCurrentWidgetWallpaperAsPreset.apply(global, arguments); },
        applyWidgetWallpaperPreset: function applyWidgetWallpaperPreset() { return widget().applyWidgetWallpaperPreset.apply(global, arguments); },
        openWidgetWallpaperManageModal: function openWidgetWallpaperManageModal() { return widget().openWidgetWallpaperManageModal.apply(global, arguments); },
        exportWidgetWallpaperScheme: function exportWidgetWallpaperScheme() { return widget().exportWidgetWallpaperScheme.apply(global, arguments); },
        importWidgetWallpaperScheme: function importWidgetWallpaperScheme() { return widget().importWidgetWallpaperScheme.apply(global, arguments); },
        resetWidgetWallpaperToDefault: function resetWidgetWallpaperToDefault() { return widget().resetWidgetWallpaperToDefault.apply(global, arguments); },
        setupNightModeBindings: function setupNightModeBindings() { return theme().setupNightModeBindings.apply(global, arguments); },
        applyNightMode: function applyNightMode() { return theme().applyNightMode.apply(global, arguments); },
        parseTimeToMinutes: function parseTimeToMinutes() { return theme().parseTimeToMinutes.apply(global, arguments); },
        setupStatusBarBindings: function setupStatusBarBindings() { return theme().setupStatusBarBindings.apply(global, arguments); },
        updateStatusBarPreviewInSettings: function updateStatusBarPreviewInSettings() { return theme().updateStatusBarPreviewInSettings.apply(global, arguments); },
        applyHomeStatusBar: function applyHomeStatusBar() { return theme().applyHomeStatusBar.apply(global, arguments); }
    };
})(window);
