// --- Appearance settings runtime helpers (V19) ---
// 只提供外观设置模块内部通用 runtime 桥，不承载业务规则。
(function registerAppearanceRuntime(global) {
    const OwoApp = global.OwoApp;
    const appearance = OwoApp.features.settings.appearance;

    function state() {
        return global.db;
    }

    function toast(message, type) {
        const ui = OwoApp.shared && OwoApp.shared.ui;
        if (ui && typeof ui.showToast === 'function') return ui.showToast(message, type);
    }

    async function save() {
        const repo = OwoApp.platform && OwoApp.platform.storage && OwoApp.platform.storage.repository;
        if (repo && typeof repo.saveData === 'function') return repo.saveData();
        throw new Error('storage repository 不可用');
    }

    async function compressImage(file, options) {
        const browser = OwoApp.platform && OwoApp.platform.browser;
        if (browser && typeof browser.compressImage === 'function') {
            return browser.compressImage(file, options);
        }
        throw new Error('compressImage 不可用');
    }

    function fileAdapter() {
        return OwoApp.platform && OwoApp.platform.browser && OwoApp.platform.browser.fileAdapter;
    }

    appearance.runtime = { state, toast, save, compressImage, fileAdapter };
})(window);
