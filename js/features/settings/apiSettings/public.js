// --- API settings public facade (V18) ---
// 只暴露 API 设置子模块稳定入口；不实现聊天 provider 请求，不处理 stream。
(function registerApiSettingsPublic(global) {
    const OwoApp = global.OwoApp;
    const apiSettings = OwoApp.features.settings.apiSettings;

    function setupApiSettingsApp() {
        apiSettings.mainApiSettingsView.bindMainApiSettings();
        apiSettings.subApiSettingsView.setupAllSubApiSettings();
        apiSettings.weatherApiSettingsView.bindWeatherApiSettings();

        if (typeof global.setupNovelAiSettings === 'function') global.setupNovelAiSettings();
        if (typeof global.setupGptImageSettings === 'function') global.setupGptImageSettings();
    }

    const publicApi = {
        setupApiSettingsApp,
        fetchAndPopulateModels: apiSettings.mainApiSettingsView.fetchAndPopulateModels,
        populateApiSelect: apiSettings.mainApiSettingsView.populateApiSelect,
        saveCurrentApiAsPreset: apiSettings.mainApiSettingsView.saveCurrentApiAsPreset,
        applyApiPreset: apiSettings.mainApiSettingsView.applyApiPreset,
        openApiManageModal: apiSettings.mainApiSettingsView.openApiManageModal,
        exportApiPresets: apiSettings.mainApiSettingsView.exportApiPresets,
        importApiPresets: apiSettings.mainApiSettingsView.importApiPresets,
        setupSubApiSettings: apiSettings.subApiSettingsView.setupSubApiSettings,
        setupSubApiPresets: apiSettings.subApiSettingsView.setupSubApiPresets
    };

    apiSettings.publicApi = publicApi;

    // 旧 HTML onclick / 外部模块可能直接调用这些名字；这里暴露同一份 canonical 实现。
    OwoApp.compat.expose('fetchAndPopulateModels', publicApi.fetchAndPopulateModels, {
        state: 'canonical',
        owner: 'OwoApp.features.settings.apiSettings.publicApi.fetchAndPopulateModels',
        note: 'V18: API 设置页模型列表拉取入口迁入 features/settings/apiSettings'
    });
})(window);
