// --- Weather API settings view (V18) ---
// 全局天气服务 API 设置 UI；属于 settings/apiSettings 子模块。
(function registerWeatherApiSettingsView(global) {
    const OwoApp = global.OwoApp;
    const apiSettings = OwoApp.features.settings.apiSettings;
    const storageRepository = OwoApp.platform.storage.repository;
    const sharedUi = OwoApp.shared.ui;

    function byId(id) { return document.getElementById(id); }
    function notify(message, duration) {
        const showToast = sharedUi.showToast;
        if (typeof showToast === 'function') showToast(message, duration);
    }
    function saveAppData() {
        return storageRepository.saveData();
    }

    function bindWeatherApiSettings() {
        const providerEl = byId('weather-api-provider');
        const keyEl = byId('weather-api-key');
        const keyContainer = byId('weather-api-key-container');
        const saveBtn = byId('weather-api-save-btn');
        if (!providerEl) return;

        if (global.db.weatherApiSettings) {
            providerEl.value = global.db.weatherApiSettings.provider || 'openmeteo';
            if (keyEl) keyEl.value = global.db.weatherApiSettings.key || '';
        }

        const updateVisibility = () => {
            const needsKey = providerEl.value === 'qweather' || providerEl.value === 'seniverse';
            if (keyContainer) keyContainer.style.display = needsKey ? 'flex' : 'none';
        };
        providerEl.addEventListener('change', updateVisibility);
        updateVisibility();

        saveBtn?.addEventListener('click', async () => {
            global.db.weatherApiSettings = {
                provider: providerEl.value,
                key: keyEl ? keyEl.value.trim() : ''
            };
            await saveAppData();
            notify('全局天气 API 设置已保存！');
        });
    }

    apiSettings.weatherApiSettingsView = { bindWeatherApiSettings };
})(window);
