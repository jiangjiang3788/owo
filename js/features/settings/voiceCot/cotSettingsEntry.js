// --- CoT settings entry shell (V21) ---
// 只收口 CoT 设置页 init 入口；具体 CoT 编辑器仍由 legacy cot_settings.js 实现。
(function registerCotSettingsEntry(global) {
    const OwoApp = global.OwoApp;
    const voiceCot = OwoApp.features.settings.voiceCot;
    let legacyInit = null;

    function registerCotSettingsImplementation(api, meta) {
        if (!api || typeof api.initCotSettings !== 'function') {
            throw new Error('[voiceCot.cotSettingsEntry] 缺少 initCotSettings 实现');
        }
        if (legacyInit && legacyInit !== api.initCotSettings) {
            throw new Error('[voiceCot.cotSettingsEntry] initCotSettings 已注册，禁止第二套实现');
        }
        legacyInit = api.initCotSettings;
        registerCotSettingsImplementation.meta = Object.assign({
            state: 'legacy-cot-settings-owner',
            owner: 'js/modules/cot_settings.js'
        }, meta || {});
        return initCotSettings;
    }

    function initCotSettings() {
        if (typeof legacyInit !== 'function') {
            console.warn('[voiceCot.cotSettingsEntry] legacy initCotSettings 尚未注册');
            return undefined;
        }
        return legacyInit.apply(global, arguments);
    }

    function getRegisteredCotSettingsMeta() {
        return Object.assign({}, registerCotSettingsImplementation.meta || {});
    }

    voiceCot.cotSettingsEntry = {
        registerCotSettingsImplementation,
        initCotSettings,
        getRegisteredCotSettingsMeta
    };
})(window);
