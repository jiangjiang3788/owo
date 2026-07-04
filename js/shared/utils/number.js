// --- shared/utils/number.js ---
// 只放跨业务通用的数字/字符串小工具，不放业务语义。
(function registerSharedNumberUtils(global) {
    const app = global.OwoApp;
    if (!app || !app.shared || !app.shared.utils) {
        throw new Error('js/app/namespace.js 必须在 shared/utils/number.js 之前加载');
    }

    function pad(num) {
        return String(num).padStart(2, '0');
    }

    app.shared.utils.pad = pad;
})(window);
