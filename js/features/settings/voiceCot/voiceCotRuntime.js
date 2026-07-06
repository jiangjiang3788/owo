// --- Voice / TTS / CoT settings runtime bridge (V21) ---
// 只提供 features/settings/voiceCot 子模块访问 state、保存、toast、file adapter 的轻量桥。
(function registerVoiceCotRuntime(global) {
    const OwoApp = global.OwoApp;
    const voiceCot = OwoApp.features.settings.voiceCot;

    function getState() {
        return global.db;
    }

    function save() {
        const repository = OwoApp.platform && OwoApp.platform.storage && OwoApp.platform.storage.repository;
        if (repository && typeof repository.saveData === 'function') return repository.saveData();
        throw new Error('[voiceCotRuntime] storage repository 不可用');
    }

    function showToast(message) {
        const ui = OwoApp.shared && OwoApp.shared.ui;
        if (ui && typeof ui.showToast === 'function') return ui.showToast(message);
        console.log('[toast]', message);
    }

    function confirmDialog(message) {
        return global.confirm(message);
    }

    function getPresetEngine() {
        const engine = OwoApp.features.settings.presetEngine && OwoApp.features.settings.presetEngine.publicApi;
        if (!engine || typeof engine.createStateStore !== 'function') {
            throw new Error('[voiceCotRuntime] presetEngine publicApi 不可用');
        }
        return engine;
    }

    function getFileAdapter() {
        const adapter = OwoApp.platform && OwoApp.platform.browser && OwoApp.platform.browser.fileAdapter;
        if (!adapter) throw new Error('[voiceCotRuntime] fileAdapter 不可用');
        return adapter;
    }

    voiceCot.runtime = {
        getState,
        save,
        showToast,
        confirmDialog,
        getPresetEngine,
        getFileAdapter
    };
})(window);
