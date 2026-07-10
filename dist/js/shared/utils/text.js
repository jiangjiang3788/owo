// --- shared/utils/text.js ---
// 只放跨模块通用的文本/字符串小工具，不放业务语义。
(function registerSharedTextUtils(global) {
    const app = global.OwoApp;
    if (!app || !app.shared || !app.shared.utils) {
        throw new Error('js/app/namespace.js 必须在 shared/utils/text.js 之前加载');
    }

    function getRandomValue(str) {
        if (str && str.includes(',')) {
            const arr = str.split(',').map(item => item.trim());
            const randomIndex = Math.floor(Math.random() * arr.length);
            return arr[randomIndex];
        }
        return str;
    }

    app.shared.utils.getRandomValue = getRandomValue;
})(window);
