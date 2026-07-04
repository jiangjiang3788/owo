// --- shared/utils/id.js ---
// 只放通用 ID 生成工具，不放业务语义。
(function registerSharedIdUtils(global) {
    const app = global.OwoApp;
    if (!app || !app.shared || !app.shared.utils) {
        throw new Error('js/app/namespace.js 必须在 shared/utils/id.js 之前加载');
    }

    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    app.shared.utils.generateUUID = generateUUID;
})(window);
